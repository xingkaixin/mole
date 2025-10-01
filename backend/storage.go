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

	CREATE TABLE IF NOT EXISTS table_selections (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		connection_id TEXT NOT NULL,
		table_name TEXT NOT NULL,
		selected BOOLEAN NOT NULL DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(connection_id, table_name),
		FOREIGN KEY (connection_id) REFERENCES database_connections(id) ON DELETE CASCADE
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

// SaveTableSelections 保存表选择状态
func (sm *StorageManager) SaveTableSelections(connectionID string, tableNames []string) error {
	// 使用事务确保数据一致性
	tx, err := sm.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 删除该连接的所有现有选择状态
	deleteQuery := `DELETE FROM table_selections WHERE connection_id = ?`
	_, err = tx.Exec(deleteQuery, connectionID)
	if err != nil {
		return err
	}

	// 插入新的选择状态
	insertQuery := `
		INSERT INTO table_selections (connection_id, table_name, selected)
		VALUES (?, ?, 1)
	`
	for _, tableName := range tableNames {
		_, err = tx.Exec(insertQuery, connectionID, tableName)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// GetTableSelections 获取表选择状态
func (sm *StorageManager) GetTableSelections(connectionID string) ([]string, error) {
	query := `
		SELECT table_name
		FROM table_selections
		WHERE connection_id = ? AND selected = 1
		ORDER BY table_name
	`

	rows, err := sm.db.Query(query, connectionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var selectedTables []string
	for rows.Next() {
		var tableName string
		err := rows.Scan(&tableName)
		if err != nil {
			return nil, err
		}
		selectedTables = append(selectedTables, tableName)
	}

	return selectedTables, nil
}

// Close 关闭存储管理器
func (sm *StorageManager) Close() error {
	if sm.db != nil {
		return sm.db.Close()
	}
	return nil
}