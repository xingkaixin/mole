package backend

import (
	"context"
	"fmt"
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
