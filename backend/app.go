package backend

import (
	"context"
	"fmt"
	"time"
)

// App struct
type App struct {
	ctx             context.Context
	dbManager       *DatabaseManager
	analysisEngine  *AnalysisEngine
	storageManager  *StorageManager
	currentConfig   *DatabaseConfig
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

	if a.dbManager == nil {
		return "", fmt.Errorf("database manager not initialized")
	}

	db := a.dbManager.GetDB()
	if db == nil {
		return "", fmt.Errorf("database connection not established")
	}

	// 创建任务ID
	taskID := fmt.Sprintf("analysis_%s_%d", connectionID, time.Now().Unix())

	// 获取可用的分析规则
	var ruleNames []string
	if a.analysisEngine != nil {
		ruleNames = a.analysisEngine.GetAvailableRules()
	}

	if len(ruleNames) == 0 {
		return "", fmt.Errorf("no analysis rules available")
	}

	fmt.Printf("Starting real analysis tasks for connection %s, tables: %v, rules: %v\n", connectionID, tables, ruleNames)

	// 对每个表执行真正的分析
	for _, tableName := range tables {
		resultID := fmt.Sprintf("result_%s_%s", tableName, time.Now().Format("20060102150405"))
		startedAt := time.Now()

		// 使用分析引擎执行真正的分析
		analysisResults, err := a.analysisEngine.ExecuteAnalysis(db, tableName, a.currentConfig, ruleNames)
		if err != nil {
			fmt.Printf("Failed to analyze table %s: %v\n", tableName, err)

			// 创建失败的结果
			result := &AnalysisResult{
				ID:          resultID,
				DatabaseID:  connectionID,
				TableName:   tableName,
				Rules:       ruleNames,
				Results:     map[string]interface{}{"error": err.Error()},
				Status:      "failed",
				StartedAt:   startedAt,
				Duration:    time.Since(startedAt),
			}

			if a.storageManager != nil {
				a.storageManager.SaveAnalysisResult(result)
			}
			continue
		}

		completedAt := time.Now()
		duration := completedAt.Sub(startedAt)

		// 创建成功的结果
		result := &AnalysisResult{
			ID:          resultID,
			DatabaseID:  connectionID,
			TableName:   tableName,
			Rules:       ruleNames,
			Results:     analysisResults,
			Status:      "completed",
			StartedAt:   startedAt,
			CompletedAt: &completedAt,
			Duration:    duration,
		}

		if a.storageManager != nil {
			a.storageManager.SaveAnalysisResult(result)
		}

		fmt.Printf("Completed analysis for table %s in %v\n", tableName, duration)
	}

	return taskID, nil
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

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}
