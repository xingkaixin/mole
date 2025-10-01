package backend

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"runtime"

	_ "github.com/mattn/go-sqlite3"
)

// StorageManager 存储管理器
type StorageManager struct {
	db *sql.DB
}

// NewStorageManager 创建存储管理器
func NewStorageManager() (*StorageManager, error) {
	// 获取跨平台数据目录
	dataDir, err := getAppDataDir()
	if err != nil {
		return nil, fmt.Errorf("failed to get app data directory: %w", err)
	}

	// 确保目录存在
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create data directory: %w", err)
	}

	// 数据库文件路径
	dbPath := filepath.Join(dataDir, "mole.db")

	// 连接SQLite数据库
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// 创建表
	if err := createTables(db); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to create tables: %w", err)
	}

	return &StorageManager{db: db}, nil
}

// getAppDataDir 获取跨平台应用数据目录
func getAppDataDir() (string, error) {
	switch runtime.GOOS {
	case "windows":
		return filepath.Join(os.Getenv("APPDATA"), "Mole"), nil
	case "darwin":
		homeDir, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		return filepath.Join(homeDir, "Library", "Application Support", "Mole"), nil
	case "linux":
		// 遵循XDG规范
		dataHome := os.Getenv("XDG_DATA_HOME")
		if dataHome == "" {
			homeDir, err := os.UserHomeDir()
			if err != nil {
				return "", err
			}
			dataHome = filepath.Join(homeDir, ".local", "share")
		}
		return filepath.Join(dataHome, "mole"), nil
	default:
		return ".", nil
	}
}

// createTables 创建数据库表
func createTables(db *sql.DB) error {
	// 创建数据库连接配置表
	createTableSQL := `
	CREATE TABLE IF NOT EXISTS database_connections (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		type TEXT NOT NULL,
		host TEXT NOT NULL,
		port INTEGER NOT NULL,
		username TEXT NOT NULL,
		password TEXT NOT NULL,
		database TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`

	_, err := db.Exec(createTableSQL)
	return err
}

// SaveConnection 保存数据库连接配置
func (sm *StorageManager) SaveConnection(config DatabaseConfig) error {
	query := `
	INSERT OR REPLACE INTO database_connections
	(id, name, type, host, port, username, password, database, updated_at)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
	`

	_, err := sm.db.Exec(query,
		config.ID,
		config.Name,
		config.Type,
		config.Host,
		config.Port,
		config.Username,
		config.Password,
		config.Database,
	)

	return err
}

// GetConnections 获取所有数据库连接配置
func (sm *StorageManager) GetConnections() ([]DatabaseConfig, error) {
	query := `
	SELECT id, name, type, host, port, username, password, database
	FROM database_connections
	ORDER BY name
	`

	rows, err := sm.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var connections []DatabaseConfig
	for rows.Next() {
		var config DatabaseConfig
		err := rows.Scan(
			&config.ID,
			&config.Name,
			&config.Type,
			&config.Host,
			&config.Port,
			&config.Username,
			&config.Password,
			&config.Database,
		)
		if err != nil {
			return nil, err
		}
		connections = append(connections, config)
	}

	return connections, nil
}

// DeleteConnection 删除数据库连接配置
func (sm *StorageManager) DeleteConnection(id string) error {
	query := `DELETE FROM database_connections WHERE id = ?`
	_, err := sm.db.Exec(query, id)
	return err
}

// Close 关闭存储管理器
func (sm *StorageManager) Close() error {
	if sm.db != nil {
		return sm.db.Close()
	}
	return nil
}