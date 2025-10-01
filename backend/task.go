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
	ID           string        `json:"id"`
	TableName    string        `json:"table_name"`
	DatabaseID   string        `json:"database_id"`
	Status       TaskStatus    `json:"status"`
	Progress     float64       `json:"progress"` // 0-100
	ErrorMessage string        `json:"error_message"`
	StartedAt    *time.Time    `json:"started_at"`
	CompletedAt  *time.Time    `json:"completed_at"`
	Duration     time.Duration `json:"duration"`
	Result       interface{}   `json:"result"`
}

// TaskManager 任务管理器
type TaskManager struct {
	tasks      map[string]*AnalysisTask
	mu         sync.RWMutex
	maxWorkers int
	taskQueue  chan *AnalysisTask
	workers    chan struct{}
	ctx        context.Context
	cancel     context.CancelFunc
}

// NewTaskManager 创建任务管理器
func NewTaskManager(maxWorkers int) *TaskManager {
	ctx, cancel := context.WithCancel(context.Background())
	return &TaskManager{
	tasks:      make(map[string]*AnalysisTask),
	maxWorkers: maxWorkers,
	taskQueue:  make(chan *AnalysisTask, 1000), // 缓冲队列
	workers:    make(chan struct{}, maxWorkers),
	ctx:        ctx,
	cancel:     cancel,
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

	// 这里应该调用具体的分析逻辑
	// 暂时模拟任务执行
	tm.simulateTaskExecution(task)
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