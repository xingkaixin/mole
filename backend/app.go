package backend

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// App struct
type App struct {
	ctx            context.Context
	dbManager      *DatabaseManager
	analysisEngine *AnalysisEngine
	storageManager *StorageManager
	currentConfig  *DatabaseConfig
	taskManager    *TaskManager
}

// NewApp creates a new App application struct
func NewApp() *App {
	app := &App{
		dbManager:      NewDatabaseManager(),
		analysisEngine: NewAnalysisEngine(),
	}

	return app
}

// Startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx

	// 初始化存储管理器
	storageManager, err := NewStorageManager()
	if err != nil {
		// 如果存储管理器初始化失败，应用仍然可以运行，只是无法保存连接配置
		fmt.Printf("Warning: Failed to initialize storage manager: %v\n", err)
	} else {
		a.storageManager = storageManager
	}

	// 初始化任务管理器
	a.taskManager = NewTaskManager(5, a.analysisEngine, a.dbManager, a.storageManager)
	a.taskManager.Start()
}

// TestDatabaseConnection 测试数据库连接
func (a *App) TestDatabaseConnection(config DatabaseConfig) (string, error) {
	err := a.dbManager.TestConnection(&config)
	if err != nil {
		return "", fmt.Errorf("连接失败: %s", err.Error())
	}
	return "连接成功", nil
}

// ConnectDatabase 连接数据库
func (a *App) ConnectDatabase(config DatabaseConfig) (string, error) {
	err := a.dbManager.Connect(&config)
	if err != nil {
		return "", fmt.Errorf("连接失败: %s", err.Error())
	}
	a.currentConfig = &config
	return "连接成功", nil
}

// GetTables 获取表清单
func (a *App) GetTables() ([]string, error) {
	if a.dbManager == nil {
		return nil, fmt.Errorf("数据库未连接")
	}
	return a.dbManager.GetTables()
}

// AnalyzeTables 分析选定的表
// AnalyzeTables 分析表（旧版本，暂时保留兼容性）
func (a *App) AnalyzeTables(tables []string) ([]interface{}, error) {
	// TODO: 更新为使用新的并发分析系统
	// 暂时返回空结果
	return []interface{}{}, nil
}

// StartAnalysisTasks 启动分析任务
func (a *App) StartAnalysisTasks(connectionID string, tables []string) (string, error) {
	if a.currentConfig == nil {
		return "", fmt.Errorf("no active database connection")
	}

	if a.taskManager == nil {
		return "", fmt.Errorf("task manager not initialized")
	}

	// 创建任务组ID
	groupID := fmt.Sprintf("analysis_%s_%d", connectionID, time.Now().Unix())

	fmt.Printf("Starting parallel analysis tasks for connection %s, tables: %v\n", connectionID, tables)

	// 为每个表创建任务并添加到任务管理器
	for _, tableName := range tables {
		task := &AnalysisTask{
			ID:             fmt.Sprintf("%s_%s", groupID, tableName),
			TableName:      tableName,
			DatabaseID:     connectionID,
			DatabaseConfig: a.currentConfig, // 传入完整的数据库配置
			Status:         TaskStatusPending,
			Progress:       0,
		}

		err := a.taskManager.AddTask(task)
		if err != nil {
			fmt.Printf("Failed to add task for table %s: %v\n", tableName, err)
			return "", fmt.Errorf("failed to add task for table %s: %v", tableName, err)
		}
	}

	return groupID, nil
}

// GetAnalysisResults 获取分析结果
func (a *App) GetAnalysisResults(connectionID string) ([]map[string]interface{}, error) {
	if a.storageManager == nil {
		return []map[string]interface{}{}, nil
	}

	var results []*AnalysisResult
	var err error

	// 如果connectionID为空，获取所有结果；否则获取特定连接的结果
	if connectionID == "" || connectionID == "all" {
		results, err = a.storageManager.GetAllAnalysisResults()
	} else {
		results, err = a.storageManager.GetAnalysisResults(connectionID)
	}

	if err != nil {
		return nil, err
	}

	// 获取所有数据库连接信息，用于显示连接名称
	connections, err := a.storageManager.GetConnections()
	if err != nil {
		connections = []DatabaseConfig{} // 如果获取失败，使用空列表
	}

	// 创建连接ID到连接名称的映射
	connectionMap := make(map[string]string)
	for _, conn := range connections {
		connectionMap[conn.ID] = conn.Name
	}

	// 转换为前端需要的格式
	var formattedResults []map[string]interface{}
	for _, result := range results {
		formattedResults = append(formattedResults, map[string]interface{}{
			"id":           result.ID,
			"databaseId":   result.DatabaseID,
			"databaseName": connectionMap[result.DatabaseID], // 添加数据库名称
			"tableName":    result.TableName,
			"rules":        result.Rules,
			"results":      result.Results,
			"status":       result.Status,
			"startedAt":    result.StartedAt,
			"completedAt":  result.CompletedAt,
			"duration":     result.Duration.Milliseconds(),
		})
	}

	return formattedResults, nil
}

// DeleteAnalysisResult 删除分析结果
func (a *App) DeleteAnalysisResult(resultID string) error {
	if a.storageManager == nil {
		return fmt.Errorf("storage manager not initialized")
	}
	return a.storageManager.DeleteAnalysisResult(resultID)
}

// GetAvailableRules 获取可用规则列表
func (a *App) GetAvailableRules() []string {
	if a.analysisEngine != nil {
		return a.analysisEngine.GetAvailableRules()
	}
	return []string{}
}

// GetTaskStatus 获取任务状态
func (a *App) GetTaskStatus(taskID string) (map[string]interface{}, error) {
	if a.taskManager == nil {
		return nil, fmt.Errorf("task manager not initialized")
	}

	task, exists := a.taskManager.GetTask(taskID)
	if !exists {
		return nil, fmt.Errorf("task not found")
	}

	return map[string]interface{}{
		"id":           task.ID,
		"tableName":    task.TableName,
		"databaseId":   task.DatabaseID,
		"status":       task.Status,
		"progress":     task.Progress,
		"errorMessage": task.ErrorMessage,
		"startedAt":    task.StartedAt,
		"completedAt":  task.CompletedAt,
		"duration":     task.Duration.Milliseconds(),
	}, nil
}

// GetTasksByDatabase 获取指定数据库的所有任务
func (a *App) GetTasksByDatabase(databaseID string) ([]map[string]interface{}, error) {
	if a.taskManager == nil {
		return []map[string]interface{}{}, nil
	}

	tasks := a.taskManager.GetTasksByDatabase(databaseID)
	var result []map[string]interface{}

	for _, task := range tasks {
		result = append(result, map[string]interface{}{
			"id":           task.ID,
			"tableName":    task.TableName,
			"databaseId":   task.DatabaseID,
			"status":       task.Status,
			"progress":     task.Progress,
			"errorMessage": task.ErrorMessage,
			"startedAt":    task.StartedAt,
			"completedAt":  task.CompletedAt,
			"duration":     task.Duration.Milliseconds(),
		})
	}

	return result, nil
}

// CancelTask 取消任务
func (a *App) CancelTask(taskID string) error {
	if a.taskManager == nil {
		return fmt.Errorf("task manager not initialized")
	}

	return a.taskManager.CancelTask(taskID)
}

// SaveDatabaseConnection 保存数据库连接配置
func (a *App) SaveDatabaseConnection(config DatabaseConfig) error {
	if a.storageManager == nil {
		return fmt.Errorf("storage manager not initialized")
	}
	return a.storageManager.SaveConnection(config)
}

// GetDatabaseConnections 获取所有数据库连接配置
func (a *App) GetDatabaseConnections() ([]DatabaseConfig, error) {
	if a.storageManager == nil {
		return []DatabaseConfig{}, nil
	}
	return a.storageManager.GetConnections()
}

// DeleteDatabaseConnection 删除数据库连接配置
func (a *App) DeleteDatabaseConnection(id string) error {
	if a.storageManager == nil {
		return fmt.Errorf("storage manager not initialized")
	}
	return a.storageManager.DeleteConnection(id)
}

// SaveTableSelections 保存表选择状态
func (a *App) SaveTableSelections(tableNames []string) error {
	if a.storageManager == nil {
		return fmt.Errorf("storage manager not initialized")
	}
	if a.currentConfig == nil {
		return fmt.Errorf("no active database connection")
	}

	return a.storageManager.SaveTableSelections(a.currentConfig.ID, tableNames)
}

// GetTableSelections 获取表选择状态
func (a *App) GetTableSelections() ([]string, error) {
	if a.storageManager == nil {
		return []string{}, nil
	}
	if a.currentConfig == nil {
		return []string{}, nil
	}

	return a.storageManager.GetTableSelections(a.currentConfig.ID)
}

// GetTablesMetadata 获取表元数据
func (a *App) GetTablesMetadata(tableNames []string) (map[string]map[string]interface{}, error) {
	if a.dbManager == nil {
		return nil, fmt.Errorf("database manager not initialized")
	}
	if a.currentConfig == nil {
		return nil, fmt.Errorf("no active database connection")
	}

	return a.dbManager.GetTablesMetadata(tableNames)
}

// UpdateDatabaseMetadata 更新数据库字典元数据
func (a *App) UpdateDatabaseMetadata(connectionID string) (map[string]interface{}, error) {
	if a.dbManager == nil {
		return nil, fmt.Errorf("database manager not initialized")
	}
	if a.storageManager == nil {
		return nil, fmt.Errorf("storage manager not initialized")
	}

	result := map[string]interface{}{
		"status":     "started",
		"connection": connectionID,
		"message":    "开始更新字典元数据...",
	}

	// 获取数据库连接配置
	connections, err := a.storageManager.GetConnections()
	if err != nil {
		result["status"] = "error"
		result["message"] = fmt.Sprintf("获取数据库连接失败: %s", err.Error())
		return result, err
	}

	// 找到指定的连接配置
	var targetConfig *DatabaseConfig
	var connectionName string
	for _, conn := range connections {
		if conn.ID == connectionID {
			targetConfig = &conn
			connectionName = conn.Name
			break
		}
	}
	if targetConfig == nil {
		result["status"] = "error"
		result["message"] = fmt.Sprintf("数据库连接不存在: %s", connectionID)
		return result, fmt.Errorf("database connection not found: %s", connectionID)
	}

	result["connectionName"] = connectionName
	result["message"] = fmt.Sprintf("正在连接到数据库 %s...", targetConfig.Database)

	// 创建临时数据库管理器连接
	tempDBManager := NewDatabaseManager()
	err = tempDBManager.Connect(targetConfig)
	if err != nil {
		result["status"] = "error"
		result["message"] = fmt.Sprintf("连接数据库失败: %s", err.Error())
		return result, fmt.Errorf("failed to connect to database: %w", err)
	}
	defer tempDBManager.Close()

	result["message"] = "正在获取表元数据..."

	// 获取所有表的元数据
	allMetadata, err := tempDBManager.GetAllTablesMetadata()
	if err != nil {
		result["status"] = "error"
		result["message"] = fmt.Sprintf("获取表元数据失败: %s", err.Error())
		return result, fmt.Errorf("failed to get tables metadata: %w", err)
	}

	result["message"] = fmt.Sprintf("正在更新 %d 个表的元数据...", len(allMetadata))
	result["tableCount"] = len(allMetadata)

	// 转换为TableMetadata指针切片
	var tables []*TableMetadata
	for _, metadata := range allMetadata {
		tables = append(tables, metadata)
	}

	// 更新存储中的元数据
	err = a.storageManager.UpdateDatabaseMetadata(connectionID, tables)
	if err != nil {
		result["status"] = "error"
		result["message"] = fmt.Sprintf("更新元数据失败: %s", err.Error())
		return result, fmt.Errorf("failed to update metadata: %w", err)
	}

	tableCount := len(tables)
	columnCount := 0
	for _, table := range tables {
		columnCount += len(table.Columns)
	}

	result["status"] = "success"
	result["message"] = fmt.Sprintf("成功更新字典，共 %d 个表，%d 个列", tableCount, columnCount)
	result["tableCount"] = tableCount
	result["columnCount"] = columnCount
	result["connectionName"] = connectionName

	return result, nil
}

// GetMetadataTables 获取元数据表列表
func (a *App) GetMetadataTables(connectionID string) ([]map[string]interface{}, error) {
	if a.storageManager == nil {
		return []map[string]interface{}{}, nil
	}

	tables, err := a.storageManager.GetMetadataTables(connectionID)
	if err != nil {
		return nil, err
	}

	var result []map[string]interface{}
	for _, table := range tables {
		result = append(result, map[string]interface{}{
			"id":           table.ID,
			"connectionId": table.ConnectionID,
			"tableName":    table.TableName,
			"tableComment": table.TableComment,
			"tableSize":    table.TableSize,
			"rowCount":     table.RowCount,
			"columnCount":  table.ColumnCount,
		})
	}

	return result, nil
}

// GetMetadataColumns 获取指定表的列信息
func (a *App) GetMetadataColumns(tableID string) ([]map[string]interface{}, error) {
	if a.storageManager == nil {
		return []map[string]interface{}{}, nil
	}

	columns, err := a.storageManager.GetMetadataColumns(tableID)
	if err != nil {
		return nil, err
	}

	var result []map[string]interface{}
	for _, column := range columns {
		result = append(result, map[string]interface{}{
			"id":            column.ID,
			"tableId":       column.TableID,
			"columnName":    column.ColumnName,
			"columnComment": column.ColumnComment,
			"columnOrdinal": column.ColumnOrdinal,
			"columnType":    column.ColumnType,
		})
	}

	return result, nil
}

// CreateTask 创建任务
func (a *App) CreateTask(name, description string) (map[string]interface{}, error) {
	if a.storageManager == nil {
		return nil, fmt.Errorf("storage manager not initialized")
	}

	task := &TaskInfo{
		ID:          uuid.New().String(),
		Name:        name,
		Description: description,
		Status:      "active",
	}

	err := a.storageManager.SaveTask(task)
	if err != nil {
		return nil, fmt.Errorf("failed to create task: %w", err)
	}

	return map[string]interface{}{
		"id":      task.ID,
		"name":    task.Name,
		"status":  "success",
		"message": "任务创建成功",
	}, nil
}

// GetAllTasks 获取所有任务
func (a *App) GetAllTasks() ([]map[string]interface{}, error) {
	if a.storageManager == nil {
		return []map[string]interface{}{}, nil
	}

	tasks, err := a.storageManager.GetAllTasks()
	if err != nil {
		return nil, fmt.Errorf("failed to get tasks: %w", err)
	}

	var result []map[string]interface{}
	for _, task := range tasks {
		result = append(result, map[string]interface{}{
			"id":          task.ID,
			"name":        task.Name,
			"description": task.Description,
			"status":      task.Status,
			"createdAt":   task.CreatedAt,
			"updatedAt":   task.UpdatedAt,
		})
	}

	return result, nil
}

// UpdateTask 更新任务
func (a *App) UpdateTask(taskID, name, description string) (map[string]interface{}, error) {
	if a.storageManager == nil {
		return nil, fmt.Errorf("storage manager not initialized")
	}

	task, err := a.storageManager.GetTask(taskID)
	if err != nil {
		return nil, fmt.Errorf("task not found: %w", err)
	}

	task.Name = name
	task.Description = description

	err = a.storageManager.SaveTask(task)
	if err != nil {
		return nil, fmt.Errorf("failed to update task: %w", err)
	}

	return map[string]interface{}{
		"id":      task.ID,
		"name":    task.Name,
		"status":  "success",
		"message": "任务更新成功",
	}, nil
}

// DeleteTask 删除任务
func (a *App) DeleteTask(taskID string) (map[string]interface{}, error) {
	if a.storageManager == nil {
		return nil, fmt.Errorf("storage manager not initialized")
	}

	err := a.storageManager.DeleteTask(taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to delete task: %w", err)
	}

	return map[string]interface{}{
		"status":  "success",
		"message": "任务删除成功",
	}, nil
}

// AddTablesToTask 添加表到任务
func (a *App) AddTablesToTask(taskID string, tableIDs []string) (map[string]interface{}, error) {
	if a.storageManager == nil {
		return nil, fmt.Errorf("storage manager not initialized")
	}

	err := a.storageManager.AddTablesToTask(taskID, tableIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to add tables to task: %w", err)
	}

	return map[string]interface{}{
		"status":  "success",
		"message": fmt.Sprintf("成功添加 %d 个表到任务", len(tableIDs)),
	}, nil
}

// GetTaskTables 获取任务下的表
func (a *App) GetTaskTables(taskID string) ([]map[string]interface{}, error) {
	if a.storageManager == nil {
		return []map[string]interface{}{}, nil
	}

	tables, err := a.storageManager.GetTaskTables(taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to get task tables: %w", err)
	}

	var result []map[string]interface{}
	for _, table := range tables {
		result = append(result, map[string]interface{}{
			"id":             table.ID,
			"taskId":         table.TaskID,
			"tableId":        table.TableID,
			"addedAt":        table.AddedAt,
			"connectionId":   table.ConnectionID,
			"connectionName": table.ConnectionName,
			"tableName":      table.TableName,
			"tableComment":   table.TableComment,
			"rowCount":       table.RowCount,
			"tableSize":      table.TableSize,
			"columnCount":    table.ColumnCount,
		})
	}

	return result, nil
}

// RemoveTableFromTask 从任务中移除表
func (a *App) RemoveTableFromTask(taskID, tableID string) (map[string]interface{}, error) {
	if a.storageManager == nil {
		return nil, fmt.Errorf("storage manager not initialized")
	}

	err := a.storageManager.RemoveTableFromTask(taskID, tableID)
	if err != nil {
		return nil, fmt.Errorf("failed to remove table from task: %w", err)
	}

	return map[string]interface{}{
		"status":  "success",
		"message": "表已从任务中移除",
	}, nil
}

// GetAllConnectionsWithMetadata 获取所有连接及其表元数据
func (a *App) GetAllConnectionsWithMetadata() ([]map[string]interface{}, error) {
	if a.storageManager == nil {
		return []map[string]interface{}{}, nil
	}

	return a.storageManager.GetAllConnectionsWithMetadata()
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}
