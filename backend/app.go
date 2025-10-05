package backend

import (
	"context"
	"encoding/json"
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

	// 初始化日志系统
	err := InitLogger(ctx)
	if err != nil {
		fmt.Printf("Warning: Failed to initialize logger: %v\n", err)
	} else {
		logger := GetLogger()
		logger.SetModuleName("APP")
		logger.LogInfo("STARTUP", "应用启动 - Wails应用启动中...")
	}

	// 初始化存储管理器
	storageManager, err := NewStorageManager()
	if err != nil {
		// 如果存储管理器初始化失败，应用仍然可以运行，只是无法保存连接配置
		if logger := GetLogger(); logger != nil {
			logger.LogError("STARTUP", fmt.Sprintf("存储管理器初始化失败 - %s", err.Error()))
		} else {
			fmt.Printf("Warning: Failed to initialize storage manager: %v\n", err)
		}
	} else {
		a.storageManager = storageManager
		if logger := GetLogger(); logger != nil {
			logger.LogInfo("STARTUP", "存储管理器初始化 - 存储管理器初始化成功")
		}
	}

	// 初始化任务管理器
	a.taskManager = NewTaskManager(5, a.analysisEngine, a.dbManager, a.storageManager)
	a.taskManager.Start()

	if logger := GetLogger(); logger != nil {
		logger.LogInfo("STARTUP", "任务管理器启动 - 任务管理器已启动，最大并发数: 5")
		logger.LogInfo("STARTUP", "应用启动完成 - 所有核心组件初始化完成，应用就绪")
	}
}

// TestDatabaseConnection 测试数据库连接
func (a *App) TestDatabaseConnection(config DatabaseConfig) (string, error) {
	logger := GetLogger()
	logger.SetModuleName("APP")
	logger.LogInfo("TEST_CONNECTION", fmt.Sprintf("测试数据库连接 - %s", config.Name))

	err := a.dbManager.TestConnection(&config)
	if err != nil {
		logger.LogError("TEST_CONNECTION", fmt.Sprintf("连接测试失败 - %s: %s", config.Name, err.Error()))
		return "", fmt.Errorf("连接失败: %s", err.Error())
	}

	logger.LogInfo("TEST_CONNECTION", fmt.Sprintf("连接测试成功 - %s", config.Name))
	return "连接成功", nil
}

// ConnectDatabase 连接数据库
func (a *App) ConnectDatabase(config DatabaseConfig) (string, error) {
	logger := GetLogger()
	logger.SetModuleName("APP")
	logger.LogInfo("CONNECT_DATABASE", fmt.Sprintf("连接数据库 - %s", config.Name))

	err := a.dbManager.Connect(&config)
	if err != nil {
		logger.LogError("CONNECT_DATABASE", fmt.Sprintf("连接失败 - %s: %s", config.Name, err.Error()))
		return "", fmt.Errorf("连接失败: %s", err.Error())
	}

	a.currentConfig = &config
	logger.LogInfo("CONNECT_DATABASE", fmt.Sprintf("数据库连接成功 - %s", config.Name))
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
	logger := GetLogger()
	logger.SetModuleName("APP")

	if a.currentConfig == nil {
		logger.LogError("START_ANALYSIS", "没有活跃的数据库连接")
		return "", fmt.Errorf("no active database connection")
	}

	if a.taskManager == nil {
		logger.LogError("START_ANALYSIS", "任务管理器未初始化")
		return "", fmt.Errorf("task manager not initialized")
	}

	// 创建任务组ID
	groupID := fmt.Sprintf("analysis_%s_%d", connectionID, time.Now().Unix())

	logger.LogInfo("START_ANALYSIS", fmt.Sprintf("启动并行分析任务 - 连接: %s, 表数量: %d", connectionID, len(tables)))

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
			logger.LogError("START_ANALYSIS", fmt.Sprintf("添加任务失败 - 表: %s, 错误: %v", tableName, err))
			return "", fmt.Errorf("failed to add task for table %s: %v", tableName, err)
		}
	}

	logger.LogInfo("START_ANALYSIS", fmt.Sprintf("分析任务启动成功 - 任务组ID: %s", groupID))
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
			"tblStatus":      table.TblStatus,
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

// LogFrontendAction 前端调用的日志记录方法
func (a *App) LogFrontendAction(module, action, details string) {
	LogUserAction(module, action, details)
}

// StartTaskAnalysis 开始任务分析
func (a *App) StartTaskAnalysis(taskID string) (map[string]interface{}, error) {
	logger := GetLogger()
	logger.SetModuleName("APP")
	logger.LogInfo("START_ANALYSIS", fmt.Sprintf("开始任务分析 - %s", taskID))

	if a.storageManager == nil {
		return map[string]interface{}{
			"status":  "error",
			"message": "存储管理器不可用",
		}, fmt.Errorf("storage manager not available")
	}

	// 获取任务下的所有表
	taskTables, err := a.storageManager.GetTaskTables(taskID)
	if err != nil {
		logger.LogError("START_ANALYSIS", fmt.Sprintf("获取任务表失败 - %s: %s", taskID, err.Error()))
		return map[string]interface{}{
			"status":  "error",
			"message": "获取任务表失败",
		}, fmt.Errorf("failed to get task tables: %w", err)
	}

	// 筛选出状态为"待分析"的表
	var pendingTables []*TaskTableDetail
	logger.LogInfo("START_ANALYSIS", fmt.Sprintf("获取到 %d 张表", len(taskTables)))

	for _, table := range taskTables {
		logger.LogInfo("START_ANALYSIS", fmt.Sprintf("表状态检查 - 表名: %s, 状态: '%s', TaskTableID: %s", table.TableName, table.TblStatus, table.ID))
		if table.TblStatus == "待分析" {
			pendingTables = append(pendingTables, table)
			logger.LogInfo("START_ANALYSIS", fmt.Sprintf("找到待分析表 - %s", table.TableName))
		}
	}

	if len(pendingTables) == 0 {
		return map[string]interface{}{
			"status":  "success",
			"message": "没有需要分析的表",
			"count":   0,
		}, nil
	}

	// 获取数据库连接配置
	connections, err := a.storageManager.GetConnections()
	if err != nil {
		logger.LogError("START_ANALYSIS", fmt.Sprintf("获取数据库连接失败 - %s", err.Error()))
		return map[string]interface{}{
			"status":  "error",
			"message": "获取数据库连接失败",
		}, fmt.Errorf("failed to get connections: %w", err)
	}

	logger.LogInfo("START_ANALYSIS", fmt.Sprintf("获取到 %d 个数据库连接配置", len(connections)))

	// 创建数据库配置映射
	connConfigs := make(map[string]*DatabaseConfig)
	for _, conn := range connections {
		connConfigs[conn.ID] = &conn
		logger.LogInfo("START_ANALYSIS", fmt.Sprintf("数据库连接映射 - %s -> %s", conn.ID, conn.Name))
	}

	// 为每张表创建分析任务
	successCount := 0
	for _, table := range pendingTables {
		logger.LogInfo("START_ANALYSIS", fmt.Sprintf("处理表 - %s, ConnectionID: %s, TableID: %s", table.TableName, table.ConnectionID, table.TableID))

		// 获取数据库配置
		dbConfig, exists := connConfigs[table.ConnectionID]
		if !exists {
			logger.LogError("START_ANALYSIS", fmt.Sprintf("数据库连接不存在 - %s, 可用连接: %v", table.ConnectionID, getAvailableConnectionIDs(connections)))
			continue
		}

		logger.LogInfo("START_ANALYSIS", fmt.Sprintf("找到数据库配置 - %s, 将创建分析任务", dbConfig.Name))

		// 创建分析任务
		err = a.taskManager.CreateAnalysisTasksForTable(
			taskID,
			table.ID,      // taskTableID (tasks_tbls表的ID)
			table.TableID, // tableID (metadata_tables表的ID)
			table.TableName,
			table.ConnectionID,
			dbConfig,
		)

		if err != nil {
			logger.LogError("START_ANALYSIS", fmt.Sprintf("创建分析任务失败 - 表: %s, 错误: %s", table.TableName, err.Error()))
			continue
		}

		successCount++
		logger.LogInfo("START_ANALYSIS", fmt.Sprintf("创建分析任务成功 - 表: %s", table.TableName))
	}

	return map[string]interface{}{
		"status":  "success",
		"message": fmt.Sprintf("成功启动 %d 个表的分析", successCount),
		"count":   successCount,
	}, nil
}

// getAvailableConnectionIDs 获取可用的数据库连接ID列表
func getAvailableConnectionIDs(connections []DatabaseConfig) []string {
	var ids []string
	for _, conn := range connections {
		ids = append(ids, conn.ID)
	}
	return ids
}

// CancelTableAnalysis 取消表分析
func (a *App) CancelTableAnalysis(taskID, taskTableID string) (map[string]interface{}, error) {
	logger := GetLogger()
	logger.SetModuleName("APP")
	logger.LogInfo("CANCEL_ANALYSIS", fmt.Sprintf("取消表分析 - 任务: %s, 表: %s", taskID, taskTableID))

	if a.taskManager == nil {
		return map[string]interface{}{
			"status":  "error",
			"message": "任务管理器不可用",
		}, fmt.Errorf("task manager not available")
	}

	// 获取任务表信息
	taskTables, err := a.storageManager.GetTaskTables(taskID)
	if err != nil {
		return map[string]interface{}{
			"status":  "error",
			"message": "获取任务表失败",
		}, fmt.Errorf("failed to get task tables: %w", err)
	}

	// 找到对应的表
	var targetTable *TaskTableDetail
	for _, table := range taskTables {
		if table.ID == taskTableID {
			targetTable = table
			break
		}
	}

	if targetTable == nil {
		return map[string]interface{}{
			"status":  "error",
			"message": "表不存在",
		}, fmt.Errorf("table not found")
	}

	// 如果表状态是"分析中"，需要取消正在执行的任务
	if targetTable.TblStatus == "分析中" {
		// 找到对应的任务并取消
		tasks := a.taskManager.GetTasksByDatabase(targetTable.ConnectionID)
		for _, task := range tasks {
			if task.TaskID == taskID && task.TableID == targetTable.TableID {
				err = a.taskManager.CancelTask(task.ID)
				if err != nil {
					logger.LogError("CANCEL_ANALYSIS", fmt.Sprintf("取消任务失败 - %s", err.Error()))
					return map[string]interface{}{
						"status":  "error",
						"message": "取消分析任务失败",
					}, fmt.Errorf("failed to cancel task: %w", err)
				}
				break
			}
		}
	}

	// 更新表状态为"待分析"
	err = a.storageManager.UpdateTaskTableStatus(taskID, taskTableID, "待分析")
	if err != nil {
		logger.LogError("CANCEL_ANALYSIS", fmt.Sprintf("更新表状态失败 - %s", err.Error()))
		return map[string]interface{}{
			"status":  "error",
			"message": "更新表状态失败",
		}, fmt.Errorf("failed to update table status: %w", err)
	}

	return map[string]interface{}{
		"status":  "success",
		"message": "表分析已取消",
	}, nil
}

// GetTableAnalysisResult 获取表分析结果
func (a *App) GetTableAnalysisResult(taskID, taskTableID string) (map[string]interface{}, error) {
	logger := GetLogger()
	logger.SetModuleName("APP")
	logger.LogInfo("GET_RESULT", fmt.Sprintf("获取表分析结果 - 任务: %s, 表: %s", taskID, taskTableID))

	if a.storageManager == nil {
		logger.LogError("GET_RESULT", "存储管理器不可用")
		return map[string]interface{}{
			"status":  "error",
			"message": "存储管理器不可用",
		}, fmt.Errorf("storage manager not available")
	}

	// 获取任务表信息
	taskTables, err := a.storageManager.GetTaskTables(taskID)
	if err != nil {
		logger.LogError("GET_RESULT", fmt.Sprintf("获取任务表失败 - %s", err.Error()))
		return map[string]interface{}{
			"status":  "error",
			"message": "获取任务表失败",
		}, fmt.Errorf("failed to get task tables: %w", err)
	}

	logger.LogInfo("GET_RESULT", fmt.Sprintf("获取到 %d 个任务表", len(taskTables)))

	// 找到对应的表
	var targetTable *TaskTableDetail
	for _, table := range taskTables {
		logger.LogInfo("GET_RESULT", fmt.Sprintf("检查表: ID=%s, TableID=%s", table.ID, table.TableID))
		if table.TableID == taskTableID {
			targetTable = table
			break
		}
	}

	if targetTable == nil {
		logger.LogError("GET_RESULT", fmt.Sprintf("表不存在 - taskTableID: %s", taskTableID))
		return map[string]interface{}{
			"status":  "error",
			"message": "表不存在",
		}, fmt.Errorf("table not found")
	}

	logger.LogInfo("GET_RESULT", fmt.Sprintf("找到目标表: %s, TableID=%s", targetTable.TableName, targetTable.TableID))

	// 获取分析结果
	result, err := a.storageManager.GetTaskTableAnalysisResult(taskID, targetTable.TableID)
	if err != nil {
		logger.LogError("GET_RESULT", fmt.Sprintf("获取分析结果失败 - %s", err.Error()))
		return map[string]interface{}{
			"status":  "error",
			"message": "获取分析结果失败",
		}, fmt.Errorf("failed to get analysis result: %w", err)
	}

	logger.LogInfo("GET_RESULT", fmt.Sprintf("成功获取分析结果: ID=%s, TableName=%s, RowCount=%d", result.ID, result.TableName, result.Results["row_count"]))

	// 添加连接信息
	response := map[string]interface{}{
		"status":         "success",
		"results":        result.Results,
		"connectionName": targetTable.ConnectionName,
		"tableName":      targetTable.TableName,
		"tableComment":   targetTable.TableComment,
		"rowCount":       targetTable.RowCount,
		"tableSize":      targetTable.TableSize,
		"columnCount":    targetTable.ColumnCount,
		"resultId":       result.ID, // 添加结果ID用于获取增强数据
	}

	logger.LogInfo("GET_RESULT", fmt.Sprintf("返回响应 - status=%s, rowCount=%d, columnCount=%d", response["status"], response["rowCount"], response["columnCount"]))
	return response, nil
}

// GetEnhancedAnalysisResult 获取增强的分析结果（包含完整元数据）
func (a *App) GetEnhancedAnalysisResult(taskID, taskTableID string) (map[string]interface{}, error) {
	logger := GetLogger()
	logger.SetModuleName("APP")
	logger.LogInfo("GET_ENHANCED_RESULT", fmt.Sprintf("获取增强分析结果 - 任务: %s, 表: %s", taskID, taskTableID))

	if a.storageManager == nil {
		logger.LogError("GET_ENHANCED_RESULT", "存储管理器不可用")
		return map[string]interface{}{
			"status":  "error",
			"message": "存储管理器不可用",
		}, fmt.Errorf("storage manager not available")
	}

	// 获取任务表信息
	taskTables, err := a.storageManager.GetTaskTables(taskID)
	if err != nil {
		logger.LogError("GET_ENHANCED_RESULT", fmt.Sprintf("获取任务表失败 - %s", err.Error()))
		return map[string]interface{}{
			"status":  "error",
			"message": "获取任务表失败",
		}, fmt.Errorf("failed to get task tables: %w", err)
	}

	// 找到对应的表
	var targetTable *TaskTableDetail
	for _, table := range taskTables {
		if table.TableID == taskTableID {
			targetTable = table
			break
		}
	}

	if targetTable == nil {
		logger.LogError("GET_ENHANCED_RESULT", fmt.Sprintf("表不存在 - taskTableID: %s", taskTableID))
		return map[string]interface{}{
			"status":  "error",
			"message": "表不存在",
		}, fmt.Errorf("table not found")
	}

	// 获取分析结果
	result, err := a.storageManager.GetTaskTableAnalysisResult(taskID, targetTable.TableID)
	if err != nil {
		logger.LogError("GET_ENHANCED_RESULT", fmt.Sprintf("获取分析结果失败 - %s", err.Error()))
		return map[string]interface{}{
			"status":  "error",
			"message": "获取分析结果失败",
		}, fmt.Errorf("failed to get analysis result: %w", err)
	}

	// 获取增强的分析结果
	enhancedResult, err := a.storageManager.GetEnhancedAnalysisResult(result.ID)
	if err != nil {
		logger.LogError("GET_ENHANCED_RESULT", fmt.Sprintf("获取增强分析结果失败 - %s", err.Error()))
		return map[string]interface{}{
			"status":  "error",
			"message": "获取增强分析结果失败",
		}, fmt.Errorf("failed to get enhanced analysis result: %w", err)
	}

	logger.LogInfo("GET_ENHANCED_RESULT", fmt.Sprintf("成功获取增强分析结果 - 表: %s, 列数: %d", enhancedResult.TableName, len(enhancedResult.ColumnsInfo)))

	// 构建列信息响应
	columnsResponse := make([]map[string]interface{}, 0)
	for _, column := range enhancedResult.ColumnsInfo {
		columnResponse := map[string]interface{}{
			"name":    column.ColumnName,
			"type":    column.ColumnType,
			"comment": column.ColumnComment,
			"ordinal": column.ColumnOrdinal,
		}
		columnsResponse = append(columnsResponse, columnResponse)
	}

	// 构建响应
	response := map[string]interface{}{
		"status":         "success",
		"results":        enhancedResult.Results,
		"tableName":      enhancedResult.TableName,
		"tableComment":   enhancedResult.TableComment,
		"columns":        columnsResponse,
		"databaseId":     enhancedResult.DatabaseID,
		"analysisStatus": enhancedResult.Status,
		"startedAt":      enhancedResult.StartedAt,
		"completedAt":    enhancedResult.CompletedAt,
		"duration":       enhancedResult.Duration.Seconds(),
		"rules":          enhancedResult.Rules,
	}
	logger.LogInfo("GET_ENHANCED_RESPONSE", fmt.Sprintf("Response is %s", response))
	logger.LogInfo("GET_ENHANCED_RESULT", fmt.Sprintf("返回增强响应 - 表: %s, 列数: %d", response["tableName"], len(columnsResponse)))

	// 完整输出响应数据用于调试
	responseJSON, _ := json.Marshal(response)
	logger.LogInfo("GET_ENHANCED_RESULT", fmt.Sprintf("完整响应数据: %s", string(responseJSON)))

	return response, nil
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}
