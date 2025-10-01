package backend

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

// AnalysisResult 分析结果
type AnalysisResult struct {
	ID          string                 `json:"id"`
	DatabaseID  string                 `json:"databaseId"`
	TableName   string                 `json:"tableName"`
	Rules       []string               `json:"rules"`
	Results     map[string]interface{} `json:"results"`
	Status      string                 `json:"status"`
	StartedAt   time.Time              `json:"startedAt"`
	CompletedAt *time.Time             `json:"completedAt,omitempty"`
	Duration    time.Duration          `json:"duration"`
}

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
		concurrency INTEGER DEFAULT 5,
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

	CREATE TABLE IF NOT EXISTS analysis_results (
		id TEXT PRIMARY KEY,
		connection_id TEXT NOT NULL,
		table_name TEXT NOT NULL,
		rules TEXT NOT NULL,
		results TEXT NOT NULL,
		status TEXT NOT NULL,
		started_at DATETIME NOT NULL,
		completed_at DATETIME,
		duration INTEGER,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
	(id, name, type, host, port, username, password, database, concurrency, updated_at)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
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
		config.Concurrency,
	)

	return err
}

// GetConnections 获取所有数据库连接配置
func (sm *StorageManager) GetConnections() ([]DatabaseConfig, error) {
	query := `
	SELECT id, name, type, host, port, username, password, database, concurrency
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
			&config.Concurrency,
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

// SaveAnalysisResult 保存分析结果
func (sm *StorageManager) SaveAnalysisResult(result *AnalysisResult) error {
	// 序列化规则和结果
	rulesJSON, err := json.Marshal(result.Rules)
	if err != nil {
		return fmt.Errorf("failed to marshal rules: %w", err)
	}

	resultsJSON, err := json.Marshal(result.Results)
	if err != nil {
		return fmt.Errorf("failed to marshal results: %w", err)
	}

	query := `
	INSERT INTO analysis_results
	(id, connection_id, table_name, rules, results, status, started_at, completed_at, duration)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	_, err = sm.db.Exec(query,
		result.ID,
		result.DatabaseID,
		result.TableName,
		string(rulesJSON),
		string(resultsJSON),
		result.Status,
		result.StartedAt,
		result.CompletedAt,
		int64(result.Duration.Seconds()),
	)

	return err
}

// GetAnalysisResults 获取分析结果
func (sm *StorageManager) GetAnalysisResults(connectionID string) ([]*AnalysisResult, error) {
	query := `
	SELECT id, connection_id, table_name, rules, results, status, started_at, completed_at, duration
	FROM analysis_results
	WHERE connection_id = ?
	ORDER BY started_at DESC
	`

	rows, err := sm.db.Query(query, connectionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []*AnalysisResult
	for rows.Next() {
		var result AnalysisResult
		var rulesJSON, resultsJSON string
		var durationSeconds int64

		err := rows.Scan(
			&result.ID,
			&result.DatabaseID,
			&result.TableName,
			&rulesJSON,
			&resultsJSON,
			&result.Status,
			&result.StartedAt,
			&result.CompletedAt,
			&durationSeconds,
		)
		if err != nil {
			return nil, err
		}

		// 反序列化规则和结果
		if err := json.Unmarshal([]byte(rulesJSON), &result.Rules); err != nil {
			return nil, fmt.Errorf("failed to unmarshal rules: %w", err)
		}
		if err := json.Unmarshal([]byte(resultsJSON), &result.Results); err != nil {
			return nil, fmt.Errorf("failed to unmarshal results: %w", err)
		}

		result.Duration = time.Duration(durationSeconds) * time.Second
		results = append(results, &result)
	}

	return results, nil
}

// GetAllAnalysisResults 获取所有分析结果
func (sm *StorageManager) GetAllAnalysisResults() ([]*AnalysisResult, error) {
	query := `
	SELECT id, connection_id, table_name, rules, results, status, started_at, completed_at, duration
	FROM analysis_results
	ORDER BY started_at DESC
	`

	rows, err := sm.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []*AnalysisResult
	for rows.Next() {
		var result AnalysisResult
		var rulesJSON, resultsJSON string
		var durationSeconds int64

		err := rows.Scan(
			&result.ID,
			&result.DatabaseID,
			&result.TableName,
			&rulesJSON,
			&resultsJSON,
			&result.Status,
			&result.StartedAt,
			&result.CompletedAt,
			&durationSeconds,
		)
		if err != nil {
			return nil, err
		}

		// 反序列化规则和结果
		if err := json.Unmarshal([]byte(rulesJSON), &result.Rules); err != nil {
			return nil, fmt.Errorf("failed to unmarshal rules: %w", err)
		}
		if err := json.Unmarshal([]byte(resultsJSON), &result.Results); err != nil {
			return nil, fmt.Errorf("failed to unmarshal results: %w", err)
		}

		result.Duration = time.Duration(durationSeconds) * time.Second
		results = append(results, &result)
	}

	return results, nil
}

// GetAnalysisResult 获取单个分析结果
func (sm *StorageManager) GetAnalysisResult(resultID string) (*AnalysisResult, error) {
	query := `
	SELECT id, connection_id, table_name, rules, results, status, started_at, completed_at, duration
	FROM analysis_results
	WHERE id = ?
	`

	var result AnalysisResult
	var rulesJSON, resultsJSON string
	var durationSeconds int64

	err := sm.db.QueryRow(query, resultID).Scan(
		&result.ID,
		&result.DatabaseID,
		&result.TableName,
		&rulesJSON,
		&resultsJSON,
		&result.Status,
		&result.StartedAt,
		&result.CompletedAt,
		&durationSeconds,
	)
	if err != nil {
		return nil, err
	}

	// 反序列化规则和结果
	if err := json.Unmarshal([]byte(rulesJSON), &result.Rules); err != nil {
		return nil, fmt.Errorf("failed to unmarshal rules: %w", err)
	}
	if err := json.Unmarshal([]byte(resultsJSON), &result.Results); err != nil {
		return nil, fmt.Errorf("failed to unmarshal results: %w", err)
	}

	result.Duration = time.Duration(durationSeconds) * time.Second
	return &result, nil
}

// DeleteAnalysisResult 删除分析结果
func (sm *StorageManager) DeleteAnalysisResult(resultID string) error {
	query := `DELETE FROM analysis_results WHERE id = ?`
	_, err := sm.db.Exec(query, resultID)
	return err
}

// Close 关闭存储管理器
func (sm *StorageManager) Close() error {
	if sm.db != nil {
		return sm.db.Close()
	}
	return nil
}
