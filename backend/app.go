package backend

import (
	"context"
	"fmt"
)

// App struct
type App struct {
	ctx             context.Context
	dbManager       *DatabaseManager
	ruleManager     *RuleManager
	storageManager  *StorageManager
	currentConfig   *DatabaseConfig
}

// NewApp creates a new App application struct
func NewApp() *App {
	app := &App{
		dbManager:   NewDatabaseManager(),
		ruleManager: NewRuleManager(),
	}

	// 注册内置规则
	app.ruleManager.RegisterRule(&RowCountRule{})
	app.ruleManager.RegisterRule(&NullRateRule{})

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
func (a *App) AnalyzeTables(tables []string) ([]RuleResult, error) {
	if a.dbManager == nil || a.dbManager.db == nil {
		return nil, fmt.Errorf("数据库未连接")
	}

	var allResults []RuleResult
	for _, table := range tables {
		results, err := a.ruleManager.ExecuteAllRules(a.dbManager.db, table)
		if err != nil {
			return nil, fmt.Errorf("分析表 %s 失败: %s", table, err.Error())
		}
		allResults = append(allResults, results...)
	}

	return allResults, nil
}

// GetAvailableRules 获取可用规则列表
func (a *App) GetAvailableRules() []string {
	return a.ruleManager.GetRules()
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

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}
