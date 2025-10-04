package backend

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/google/uuid"
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

	-- 元数据-表
	CREATE TABLE IF NOT EXISTS metadata_tables (
		id TEXT PRIMARY KEY,
		connection_id TEXT NOT NULL,
		table_name TEXT NOT NULL,
		table_comment TEXT,
		table_size INTEGER DEFAULT 0,
		row_count INTEGER DEFAULT 0,
		column_count INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(connection_id, table_name),
		FOREIGN KEY (connection_id) REFERENCES database_connections(id) ON DELETE CASCADE
	);

	-- 元数据-列
	CREATE TABLE IF NOT EXISTS metadata_columns (
		id TEXT PRIMARY KEY,
		table_id TEXT NOT NULL,
		column_name TEXT NOT NULL,
		column_comment TEXT,
		column_ordinal INTEGER NOT NULL,
		column_type TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(table_id, column_name),
		FOREIGN KEY (table_id) REFERENCES metadata_tables(id) ON DELETE CASCADE
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

// MetadataTableInfo 元数据表信息
type MetadataTableInfo struct {
	ID           string `json:"id"`
	ConnectionID string `json:"connectionId"`
	TableName    string `json:"tableName"`
	TableComment string `json:"tableComment"`
	TableSize    int64  `json:"tableSize"`
	RowCount     int64  `json:"rowCount"`
	ColumnCount  int    `json:"columnCount"`
}

// MetadataColumnInfo 元数据列信息
type MetadataColumnInfo struct {
	ID            string `json:"id"`
	TableID       string `json:"tableId"`
	ColumnName    string `json:"columnName"`
	ColumnComment string `json:"columnComment"`
	ColumnOrdinal int    `json:"columnOrdinal"`
	ColumnType    string `json:"columnType"`
}

// UpdateDatabaseMetadata 更新数据库元数据
func (sm *StorageManager) UpdateDatabaseMetadata(connectionID string, tables []*TableMetadata) error {
	// 使用事务确保数据一致性
	tx, err := sm.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// 获取现有的表信息
	existingTables, err := sm.getExistingTables(tx, connectionID)
	if err != nil {
		return fmt.Errorf("failed to get existing tables: %w", err)
	}

	// 创建现有表的映射
	existingTableMap := make(map[string]*MetadataTableInfo)
	for _, table := range existingTables {
		existingTableMap[strings.ToLower(table.TableName)] = table
	}

	// 处理每个表
	for _, table := range tables {
		tableNameLower := strings.ToLower(table.TableName)

		// 检查表是否已存在
		if existingTable, exists := existingTableMap[tableNameLower]; exists {
			// 更新现有表
			err = sm.updateTableMetadata(tx, existingTable.ID, table)
			if err != nil {
				return fmt.Errorf("failed to update table %s: %w", table.TableName, err)
			}
			// 更新列信息
			err = sm.updateColumnsMetadata(tx, existingTable.ID, table.Columns)
			if err != nil {
				return fmt.Errorf("failed to update columns for table %s: %w", table.TableName, err)
			}
			// 从映射中移除已处理的表
			delete(existingTableMap, tableNameLower)
		} else {
			// 插入新表
			tableID, err := sm.insertTableMetadata(tx, connectionID, table)
			if err != nil {
				return fmt.Errorf("failed to insert table %s: %w", table.TableName, err)
			}
			// 插入列信息
			err = sm.insertColumnsMetadata(tx, tableID, table.Columns)
			if err != nil {
				return fmt.Errorf("failed to insert columns for table %s: %w", table.TableName, err)
			}
		}
	}

	// 删除不再存在的表和列
	for _, removedTable := range existingTableMap {
		err = sm.deleteTableMetadata(tx, removedTable.ID)
		if err != nil {
			return fmt.Errorf("failed to delete removed table %s: %w", removedTable.TableName, err)
		}
	}

	return tx.Commit()
}

// getExistingTables 获取现有的表信息
func (sm *StorageManager) getExistingTables(tx *sql.Tx, connectionID string) ([]*MetadataTableInfo, error) {
	query := `
		SELECT id, table_name, table_comment, table_size, row_count, column_count
		FROM metadata_tables
		WHERE connection_id = ?
	`

	rows, err := tx.Query(query, connectionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []*MetadataTableInfo
	for rows.Next() {
		var table MetadataTableInfo
		err := rows.Scan(
			&table.ID,
			&table.TableName,
			&table.TableComment,
			&table.TableSize,
			&table.RowCount,
			&table.ColumnCount,
		)
		if err != nil {
			return nil, err
		}
		table.ConnectionID = connectionID
		tables = append(tables, &table)
	}

	return tables, nil
}

// updateTableMetadata 更新表元数据
func (sm *StorageManager) updateTableMetadata(tx *sql.Tx, tableID string, table *TableMetadata) error {
	query := `
		UPDATE metadata_tables
		SET table_comment = ?, table_size = ?, row_count = ?, column_count = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`

	_, err := tx.Exec(query,
		table.Comment,
		table.DataSize,
		table.RowCount,
		table.ColumnCount,
		tableID,
	)

	return err
}

// insertTableMetadata 插入新的表元数据
func (sm *StorageManager) insertTableMetadata(tx *sql.Tx, connectionID string, table *TableMetadata) (string, error) {
	tableID := uuid.New().String()

	// 如果没有注释，使用表名作为注释
	comment := table.Comment
	if comment == "" {
		comment = table.TableName
	}

	query := `
		INSERT INTO metadata_tables
		(id, connection_id, table_name, table_comment, table_size, row_count, column_count)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`

	_, err := tx.Exec(query,
		tableID,
		connectionID,
		table.TableName,
		comment,
		table.DataSize,
		table.RowCount,
		table.ColumnCount,
	)

	return tableID, err
}

// getExistingColumns 获取现有的列信息
func (sm *StorageManager) getExistingColumns(tx *sql.Tx, tableID string) ([]*MetadataColumnInfo, error) {
	query := `
		SELECT id, column_name, column_comment, column_ordinal, column_type
		FROM metadata_columns
		WHERE table_id = ?
	`

	rows, err := tx.Query(query, tableID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var columns []*MetadataColumnInfo
	for rows.Next() {
		var column MetadataColumnInfo
		err := rows.Scan(
			&column.ID,
			&column.ColumnName,
			&column.ColumnComment,
			&column.ColumnOrdinal,
			&column.ColumnType,
		)
		if err != nil {
			return nil, err
		}
		column.TableID = tableID
		columns = append(columns, &column)
	}

	return columns, nil
}

// updateColumnsMetadata 更新列元数据
func (sm *StorageManager) updateColumnsMetadata(tx *sql.Tx, tableID string, columns []ColumnMetadata) error {
	// 获取现有列
	existingColumns, err := sm.getExistingColumns(tx, tableID)
	if err != nil {
		return err
	}

	// 创建现有列的映射
	existingColumnMap := make(map[string]*MetadataColumnInfo)
	for _, column := range existingColumns {
		existingColumnMap[strings.ToLower(column.ColumnName)] = column
	}

	// 处理每个列
	for _, column := range columns {
		columnNameLower := strings.ToLower(column.ColumnName)

		if existingColumn, exists := existingColumnMap[columnNameLower]; exists {
			// 更新现有列
			query := `
				UPDATE metadata_columns
				SET column_comment = ?, column_ordinal = ?, column_type = ?, updated_at = CURRENT_TIMESTAMP
				WHERE id = ?
			`

			_, err = tx.Exec(query,
				column.ColumnComment,
				column.ColumnOrdinal,
				column.ColumnType,
				existingColumn.ID,
			)
			if err != nil {
				return err
			}
			// 从映射中移除已处理的列
			delete(existingColumnMap, columnNameLower)
		} else {
			// 插入新列
			err = sm.insertColumnMetadata(tx, tableID, column)
			if err != nil {
				return err
			}
		}
	}

	// 删除不再存在的列
	for _, removedColumn := range existingColumnMap {
		query := `DELETE FROM metadata_columns WHERE id = ?`
		_, err = tx.Exec(query, removedColumn.ID)
		if err != nil {
			return err
		}
	}

	return nil
}

// insertColumnsMetadata 插入新的列元数据
func (sm *StorageManager) insertColumnsMetadata(tx *sql.Tx, tableID string, columns []ColumnMetadata) error {
	for _, column := range columns {
		err := sm.insertColumnMetadata(tx, tableID, column)
		if err != nil {
			return err
		}
	}
	return nil
}

// insertColumnMetadata 插入单个列元数据
func (sm *StorageManager) insertColumnMetadata(tx *sql.Tx, tableID string, column ColumnMetadata) error {
	columnID := uuid.New().String()

	// 如果没有注释，使用列名作为注释
	comment := column.ColumnComment
	if comment == "" {
		comment = column.ColumnName
	}

	query := `
		INSERT INTO metadata_columns
		(id, table_id, column_name, column_comment, column_ordinal, column_type)
		VALUES (?, ?, ?, ?, ?, ?)
	`

	_, err := tx.Exec(query,
		columnID,
		tableID,
		column.ColumnName,
		comment,
		column.ColumnOrdinal,
		column.ColumnType,
	)

	return err
}

// deleteTableMetadata 删除表元数据（级联删除列）
func (sm *StorageManager) deleteTableMetadata(tx *sql.Tx, tableID string) error {
	// 删除列信息
	query := `DELETE FROM metadata_columns WHERE table_id = ?`
	_, err := tx.Exec(query, tableID)
	if err != nil {
		return err
	}

	// 删除表信息
	query = `DELETE FROM metadata_tables WHERE id = ?`
	_, err = tx.Exec(query, tableID)
	return err
}

// GetMetadataTables 获取元数据表列表
func (sm *StorageManager) GetMetadataTables(connectionID string) ([]*MetadataTableInfo, error) {
	query := `
		SELECT id, connection_id, table_name, table_comment, table_size, row_count, column_count
		FROM metadata_tables
		WHERE connection_id = ?
		ORDER BY table_name
	`

	rows, err := sm.db.Query(query, connectionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []*MetadataTableInfo
	for rows.Next() {
		var table MetadataTableInfo
		err := rows.Scan(
			&table.ID,
			&table.ConnectionID,
			&table.TableName,
			&table.TableComment,
			&table.TableSize,
			&table.RowCount,
			&table.ColumnCount,
		)
		if err != nil {
			return nil, err
		}
		tables = append(tables, &table)
	}

	return tables, nil
}

// GetMetadataColumns 获取指定表的列信息
func (sm *StorageManager) GetMetadataColumns(tableID string) ([]*MetadataColumnInfo, error) {
	query := `
		SELECT id, table_id, column_name, column_comment, column_ordinal, column_type
		FROM metadata_columns
		WHERE table_id = ?
		ORDER BY column_ordinal
	`

	rows, err := sm.db.Query(query, tableID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var columns []*MetadataColumnInfo
	for rows.Next() {
		var column MetadataColumnInfo
		err := rows.Scan(
			&column.ID,
			&column.TableID,
			&column.ColumnName,
			&column.ColumnComment,
			&column.ColumnOrdinal,
			&column.ColumnType,
		)
		if err != nil {
			return nil, err
		}
		columns = append(columns, &column)
	}

	return columns, nil
}

// Close 关闭存储管理器
func (sm *StorageManager) Close() error {
	if sm.db != nil {
		return sm.db.Close()
	}
	return nil
}
