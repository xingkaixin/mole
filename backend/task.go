package backend

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
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
	ID             string             `json:"id"`
	TableName      string             `json:"table_name"`
	DatabaseID     string             `json:"database_id"`
	DatabaseConfig *DatabaseConfig    `json:"database_config"`
	Status         TaskStatus         `json:"status"`
	Progress       float64            `json:"progress"` // 0-100
	ErrorMessage   string             `json:"error_message"`
	StartedAt      *time.Time         `json:"started_at"`
	CompletedAt    *time.Time         `json:"completed_at"`
	Duration       time.Duration      `json:"duration"`
	Result         interface{}        `json:"result"`
	TaskID         string             `json:"task_id"`       // 新增：任务ID
	TableID        string             `json:"table_id"`      // 新增：表ID
	TaskTableID    string             `json:"task_table_id"` // 新增：任务表关联ID
	ctx            context.Context    `json:"-"`
	cancel         context.CancelFunc `json:"-"`
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
	logger := GetLogger()
	logger.SetModuleName("TASK_MANAGER")
	logger.LogInfo("CREATE", fmt.Sprintf("创建任务管理器 - 最大工作线程数: %d", maxWorkers))

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
	logger := GetLogger()
	logger.SetModuleName("TASK_MANAGER")
	logger.LogInfo("START", "启动任务管理器")

	// 初始化工作池
	for i := 0; i < tm.maxWorkers; i++ {
		tm.workers <- struct{}{}
	}

	logger.LogInfo("START", fmt.Sprintf("工作池初始化完成 - 创建 %d 个工作线程", tm.maxWorkers))

	// 启动任务调度器
	go tm.scheduler()
	logger.LogInfo("START", "任务调度器已启动")
}

// Stop 停止任务管理器
func (tm *TaskManager) Stop() {
	logger := GetLogger()
	logger.SetModuleName("TASK_MANAGER")
	logger.LogInfo("STOP", "停止任务管理器")

	tm.cancel()
	close(tm.taskQueue)
	logger.LogInfo("STOP", "任务管理器已停止")
}

// AddTask 添加任务
func (tm *TaskManager) AddTask(task *AnalysisTask) error {
	logger := GetLogger()
	logger.SetModuleName("TASK_MANAGER")

	tm.mu.Lock()
	defer tm.mu.Unlock()

	if _, exists := tm.tasks[task.ID]; exists {
		logger.LogError("ADD_TASK", fmt.Sprintf("任务已存在 - %s", task.ID))
		return fmt.Errorf("task with ID %s already exists", task.ID)
	}

	// 为每个任务创建独立的context
	task.ctx, task.cancel = context.WithCancel(context.Background())
	task.Status = TaskStatusPending
	tm.tasks[task.ID] = task

	logger.LogInfo("ADD_TASK", fmt.Sprintf("添加任务 - %s (表: %s)", task.ID, task.TableName))

	// 将任务加入队列
	select {
	case tm.taskQueue <- task:
		logger.LogInfo("ADD_TASK", fmt.Sprintf("任务已加入队列 - %s", task.ID))
		return nil
	default:
		// 如果队列满了，取消context
		task.cancel()
		logger.LogError("ADD_TASK", fmt.Sprintf("任务队列已满 - %s", task.ID))
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
	logger := GetLogger()
	logger.SetModuleName("TASK_MANAGER")

	tm.mu.Lock()
	defer tm.mu.Unlock()

	task, exists := tm.tasks[taskID]
	if !exists {
		logger.LogError("CANCEL_TASK", fmt.Sprintf("任务不存在 - %s", taskID))
		return fmt.Errorf("task not found")
	}

	logger.LogInfo("CANCEL_TASK", fmt.Sprintf("取消任务 - %s (表: %s)", taskID, task.TableName))

	// 调用任务的cancel函数，立即取消正在执行的SQL查询
	// 这会触发所有使用task.ctx的QueryContext和QueryRowContext调用返回context.Canceled错误
	if task.cancel != nil {
		task.cancel()
		task.cancel = nil // 清理cancel函数引用，防止重复调用
	}

	if task.Status == TaskStatusRunning {
		// 对于运行中的任务，标记为取消并设置完成时间
		task.Status = TaskStatusCancelled
		task.ErrorMessage = "任务被取消"
		now := time.Now()
		task.CompletedAt = &now
		task.Duration = now.Sub(*task.StartedAt)
	} else if task.Status == TaskStatusPending {
		task.Status = TaskStatusCancelled
		task.ErrorMessage = "任务被取消"
	}

	// 更新任务表状态为"待分析"
	if task.TaskID != "" && task.TaskTableID != "" {
		tm.UpdateTaskTableStatus(task.TaskID, task.TaskTableID, "待分析")
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

	// 更新任务表状态为"分析中"
	if task.TaskID != "" && task.TaskTableID != "" {
		tm.UpdateTaskTableStatus(task.TaskID, task.TaskTableID, "分析中")
	}

	// 执行真正的分析任务
	tm.performTableAnalysis(task)
}

// performTableAnalysis 执行真正的表分析
func (tm *TaskManager) performTableAnalysis(task *AnalysisTask) {
	// 更新进度为10%
	tm.updateTaskProgress(task.ID, 10)

	// 执行真正的分析
	if tm.analysisEngine != nil && task.DatabaseConfig != nil {
		// 为这个任务创建一个临时的数据库连接
		tempDBManager := NewDatabaseManager()
		err := tempDBManager.Connect(task.DatabaseConfig)
		if err != nil {
			fmt.Printf("Failed to connect to database for task %s: %v\n", task.ID, err)
			tm.mu.Lock()
			task.Status = TaskStatusFailed
			task.ErrorMessage = fmt.Sprintf("数据库连接失败: %s", err.Error())
			tm.mu.Unlock()
			return
		}
		defer tempDBManager.Close()

		db := tempDBManager.GetDB()
		if db == nil {
			fmt.Printf("Failed to get DB connection for task %s\n", task.ID)
			tm.mu.Lock()
			task.Status = TaskStatusFailed
			task.ErrorMessage = "数据库连接不可用"
			tm.mu.Unlock()
			return
		}

		provider := tempDBManager.GetProvider()
		if provider == nil {
			fmt.Printf("Failed to resolve database provider for task %s\n", task.ID)
			tm.mu.Lock()
			task.Status = TaskStatusFailed
			task.ErrorMessage = "数据库提供者不可用"
			tm.mu.Unlock()
			return
		}

		// 获取分析规则
		ruleNames := tm.analysisEngine.GetAvailableRules()
		if len(ruleNames) > 0 {
			// 更新进度为30%
			tm.updateTaskProgress(task.ID, 30)

			// 为任务创建带120秒超时的context
			timeoutCtx, timeoutCancel := context.WithTimeout(task.ctx, 120*time.Second)
			defer timeoutCancel()

			// 使用带超时的context执行分析
			analysisResults, err := tm.analysisEngine.ExecuteAnalysis(timeoutCtx, db, task.TableName, task.DatabaseConfig, provider, ruleNames)

			// 更新进度为80%
			tm.updateTaskProgress(task.ID, 80)

			tm.mu.Lock()
			defer tm.mu.Unlock()

			now := time.Now()
			task.CompletedAt = &now
			task.Duration = now.Sub(*task.StartedAt)

			// 清理任务context资源
			if task.cancel != nil {
				task.cancel()
				task.cancel = nil
			}

			if err != nil {
				task.Status = TaskStatusFailed
				errorMessage := err.Error()
				// 检查是否是超时错误
				if timeoutCtx.Err() == context.DeadlineExceeded {
					errorMessage = "分析任务超时（120秒限制）"
				}
				task.ErrorMessage = errorMessage
				task.Result = map[string]interface{}{
					"table_name": task.TableName,
					"status":     "failed",
					"error":      errorMessage,
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
					tm.storageManager.SaveAnalysisResult(task.TaskID, task.TableID, result)
				}

				// 更新任务表状态为"待分析"
				if task.TaskID != "" && task.TaskTableID != "" {
					tm.UpdateTaskTableStatus(task.TaskID, task.TaskTableID, "待分析")
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
					tm.storageManager.SaveAnalysisResult(task.TaskID, task.TableID, result)
				}

				// 更新任务表状态为"分析完成"
				if task.TaskID != "" && task.TaskTableID != "" {
					tm.UpdateTaskTableStatus(task.TaskID, task.TaskTableID, "分析完成")
				}
			}
			return
		}
	} else {
		// 如果analysisEngine或DatabaseConfig为空，标记任务失败
		tm.mu.Lock()
		task.Status = TaskStatusFailed
		if tm.analysisEngine == nil {
			task.ErrorMessage = "分析引擎不可用"
		} else {
			task.ErrorMessage = "数据库配置不可用"
		}
		tm.mu.Unlock()

		// 更新任务表状态为"待分析"
		if task.TaskID != "" && task.TaskTableID != "" {
			tm.UpdateTaskTableStatus(task.TaskID, task.TaskTableID, "待分析")
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

// UpdateTaskTableStatus 更新任务表状态
func (tm *TaskManager) UpdateTaskTableStatus(taskID, taskTableID, status string) error {
	logger := GetLogger()
	logger.SetModuleName("TASK_MANAGER")
	logger.LogInfo("UPDATE_STATUS", fmt.Sprintf("TaskManager更新表状态 - 任务: %s, 表: %s, 状态: %s", taskID, taskTableID, status))

	if tm.storageManager == nil {
		logger.LogError("UPDATE_STATUS", "Storage manager not available")
		return fmt.Errorf("storage manager not available")
	}

	err := tm.storageManager.UpdateTaskTableStatus(taskID, taskTableID, status)
	if err != nil {
		logger.LogError("UPDATE_STATUS", fmt.Sprintf("Storage manager更新失败 - %s", err.Error()))
	} else {
		logger.LogInfo("UPDATE_STATUS", "Storage manager更新成功")
	}

	return err
}

// CreateAnalysisTasksForTable 为表创建分析任务
func (tm *TaskManager) CreateAnalysisTasksForTable(taskID, taskTableID, tableID, tableName, databaseID string, databaseConfig *DatabaseConfig) error {
	logger := GetLogger()
	logger.SetModuleName("TASK_MANAGER")

	task := &AnalysisTask{
		ID:             uuid.New().String(),
		TableName:      tableName,
		DatabaseID:     databaseID,
		DatabaseConfig: databaseConfig,
		TaskID:         taskID,
		TableID:        tableID,
		TaskTableID:    taskTableID,
	}

	return tm.AddTask(task)
}
