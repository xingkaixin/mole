package backend

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// TaskStatus 任务状态
type TaskStatus string

const (
	TaskStatusPending   TaskStatus = "pending"
	TaskStatusRunning   TaskStatus = "running"
	TaskStatusCompleted TaskStatus = "completed"
	TaskStatusFailed    TaskStatus = "failed"
	TaskStatusCancelled TaskStatus = "cancelled"
)

// AnalysisTask 分析任务
type AnalysisTask struct {
	ID             string          `json:"id"`
	TableName      string          `json:"table_name"`
	DatabaseID     string          `json:"database_id"`
	DatabaseConfig *DatabaseConfig `json:"database_config"`
	Status         TaskStatus      `json:"status"`
	Progress       float64         `json:"progress"` // 0-100
	ErrorMessage   string          `json:"error_message"`
	StartedAt      *time.Time      `json:"started_at"`
	CompletedAt    *time.Time      `json:"completed_at"`
	Duration       time.Duration   `json:"duration"`
	Result         interface{}     `json:"result"`
}

// TaskManager 任务管理器
type TaskManager struct {
	tasks          map[string]*AnalysisTask
	mu             sync.RWMutex
	maxWorkers     int
	taskQueue      chan *AnalysisTask
	workers        chan struct{}
	ctx            context.Context
	cancel         context.CancelFunc
	analysisEngine *AnalysisEngine  // 添加分析引擎引用
	dbManager      *DatabaseManager // 添加数据库管理器引用
	storageManager *StorageManager  // 添加存储管理器引用
}

// NewTaskManager 创建任务管理器
func NewTaskManager(maxWorkers int, analysisEngine *AnalysisEngine, dbManager *DatabaseManager, storageManager *StorageManager) *TaskManager {
	ctx, cancel := context.WithCancel(context.Background())
	return &TaskManager{
		tasks:          make(map[string]*AnalysisTask),
		maxWorkers:     maxWorkers,
		taskQueue:      make(chan *AnalysisTask, 1000), // 缓冲队列
		workers:        make(chan struct{}, maxWorkers),
		ctx:            ctx,
		cancel:         cancel,
		analysisEngine: analysisEngine,
		dbManager:      dbManager,
		storageManager: storageManager,
	}
}

// Start 启动任务管理器
func (tm *TaskManager) Start() {
	// 初始化工作池
	for i := 0; i < tm.maxWorkers; i++ {
		tm.workers <- struct{}{}
	}

	// 启动任务调度器
	go tm.scheduler()
}

// Stop 停止任务管理器
func (tm *TaskManager) Stop() {
	tm.cancel()
	close(tm.taskQueue)
}

// AddTask 添加任务
func (tm *TaskManager) AddTask(task *AnalysisTask) error {
	tm.mu.Lock()
	defer tm.mu.Unlock()

	if _, exists := tm.tasks[task.ID]; exists {
		return fmt.Errorf("task with ID %s already exists", task.ID)
	}

	task.Status = TaskStatusPending
	tm.tasks[task.ID] = task

	// 将任务加入队列
	select {
	case tm.taskQueue <- task:
		return nil
	default:
		return fmt.Errorf("task queue is full")
	}
}

// GetTask 获取任务
func (tm *TaskManager) GetTask(taskID string) (*AnalysisTask, bool) {
	tm.mu.RLock()
	defer tm.mu.RUnlock()

	task, exists := tm.tasks[taskID]
	return task, exists
}

// GetTasksByDatabase 获取指定数据库的所有任务
func (tm *TaskManager) GetTasksByDatabase(databaseID string) []*AnalysisTask {
	tm.mu.RLock()
	defer tm.mu.RUnlock()

	var tasks []*AnalysisTask
	for _, task := range tm.tasks {
		if task.DatabaseID == databaseID {
			tasks = append(tasks, task)
		}
	}
	return tasks
}

// CancelTask 取消任务
func (tm *TaskManager) CancelTask(taskID string) error {
	tm.mu.Lock()
	defer tm.mu.Unlock()

	task, exists := tm.tasks[taskID]
	if !exists {
		return fmt.Errorf("task not found")
	}

	if task.Status == TaskStatusRunning {
		// 对于运行中的任务，需要额外的取消逻辑
		task.Status = TaskStatusCancelled
		task.ErrorMessage = "任务被取消"
		now := time.Now()
		task.CompletedAt = &now
		task.Duration = now.Sub(*task.StartedAt)
	} else if task.Status == TaskStatusPending {
		task.Status = TaskStatusCancelled
		task.ErrorMessage = "任务被取消"
	}

	return nil
}

// scheduler 任务调度器
func (tm *TaskManager) scheduler() {
	for {
		select {
		case <-tm.ctx.Done():
			return
		case task := <-tm.taskQueue:
			// 等待可用的工作线程
			select {
			case <-tm.ctx.Done():
				return
			case <-tm.workers:
				go tm.executeTask(task)
			}
		}
	}
}

// executeTask 执行任务
func (tm *TaskManager) executeTask(task *AnalysisTask) {
	defer func() {
		// 释放工作线程
		tm.workers <- struct{}{}
	}()

	tm.mu.Lock()
	task.Status = TaskStatusRunning
	now := time.Now()
	task.StartedAt = &now
	tm.mu.Unlock()

	// 执行真正的分析任务
	tm.performTableAnalysis(task)
}

// performTableAnalysis 执行真正的表分析
func (tm *TaskManager) performTableAnalysis(task *AnalysisTask) {
	// 更新进度为10%
	tm.updateTaskProgress(task.ID, 10)

	// 执行真正的分析
	if tm.analysisEngine != nil && tm.dbManager != nil {
		db := tm.dbManager.GetDB()
		if db == nil {
			fmt.Printf("Failed to get DB connection for task %s\n", task.ID)
			tm.mu.Lock()
			task.Status = TaskStatusFailed
			task.ErrorMessage = "数据库连接不可用"
			tm.mu.Unlock()
			return
		}

		// 获取分析规则
		ruleNames := tm.analysisEngine.GetAvailableRules()
		if len(ruleNames) > 0 {
			// 更新进度为30%
			tm.updateTaskProgress(task.ID, 30)

			// 使用传入的数据库配置执行分析
			analysisResults, err := tm.analysisEngine.ExecuteAnalysis(db, task.TableName, task.DatabaseConfig, ruleNames)

			// 更新进度为80%
			tm.updateTaskProgress(task.ID, 80)

			tm.mu.Lock()
			defer tm.mu.Unlock()

			now := time.Now()
			task.CompletedAt = &now
			task.Duration = now.Sub(*task.StartedAt)

			if err != nil {
				task.Status = TaskStatusFailed
				task.ErrorMessage = err.Error()
				task.Result = map[string]interface{}{
					"table_name": task.TableName,
					"status":     "failed",
					"error":      err.Error(),
				}

				// 保存失败的分析结果到存储管理器
				if tm.storageManager != nil {
					result := &AnalysisResult{
						ID:          fmt.Sprintf("result_%s_%s", task.TableName, now.Format("20060102150405")),
						DatabaseID:  task.DatabaseID,
						TableName:   task.TableName,
						Rules:       ruleNames,
						Results:     map[string]interface{}{"error": err.Error()},
						Status:      "failed",
						StartedAt:   *task.StartedAt,
						CompletedAt: &now,
						Duration:    task.Duration,
					}
					tm.storageManager.SaveAnalysisResult(result)
				}
			} else {
				task.Status = TaskStatusCompleted
				task.Progress = 100
				task.Result = map[string]interface{}{
					"table_name": task.TableName,
					"status":     "completed",
					"results":    analysisResults,
				}

				// 保存分析结果到存储管理器
				if tm.storageManager != nil {
					result := &AnalysisResult{
						ID:          fmt.Sprintf("result_%s_%s", task.TableName, now.Format("20060102150405")),
						DatabaseID:  task.DatabaseID,
						TableName:   task.TableName,
						Rules:       ruleNames,
						Results:     analysisResults,
						Status:      "completed",
						StartedAt:   *task.StartedAt,
						CompletedAt: &now,
						Duration:    task.Duration,
					}
					tm.storageManager.SaveAnalysisResult(result)
				}
			}
			return
		}
	}

}

// updateTaskProgress 更新任务进度
func (tm *TaskManager) updateTaskProgress(taskID string, progress float64) {
	tm.mu.Lock()
	defer tm.mu.Unlock()

	if task, exists := tm.tasks[taskID]; exists {
		task.Progress = progress
	}
}

// simulateTaskExecution 模拟任务执行
func (tm *TaskManager) simulateTaskExecution(task *AnalysisTask) {
	// 模拟任务执行时间
	time.Sleep(time.Second * 2)

	tm.mu.Lock()
	defer tm.mu.Unlock()

	now := time.Now()
	task.CompletedAt = &now
	task.Duration = now.Sub(*task.StartedAt)
	task.Progress = 100
	task.Status = TaskStatusCompleted
	task.Result = map[string]interface{}{
		"table_name": task.TableName,
		"status":     "completed",
	}
}

// GetTaskStats 获取任务统计信息
func (tm *TaskManager) GetTaskStats() map[string]int {
	tm.mu.RLock()
	defer tm.mu.RUnlock()

	stats := map[string]int{
		"total":     0,
		"pending":   0,
		"running":   0,
		"completed": 0,
		"failed":    0,
		"cancelled": 0,
	}

	for _, task := range tm.tasks {
		stats["total"]++
		stats[string(task.Status)]++
	}

	return stats
}
