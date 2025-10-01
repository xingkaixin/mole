package backend

import (
	"database/sql"
	"fmt"

	_ "github.com/go-sql-driver/mysql"
)

// DatabaseConfig 数据库连接配置
type DatabaseConfig struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Type     string `json:"type"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username"`
	Password string `json:"password"`
	Database string `json:"database"`
}

// DatabaseManager 数据库管理器
type DatabaseManager struct {
	config *DatabaseConfig
	db     *sql.DB
}

// NewDatabaseManager 创建数据库管理器
func NewDatabaseManager() *DatabaseManager {
	return &DatabaseManager{}
}

// Connect 连接数据库
func (dm *DatabaseManager) Connect(config *DatabaseConfig) error {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s",
		config.Username,
		config.Password,
		config.Host,
		config.Port,
		config.Database)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		db.Close()
		return fmt.Errorf("failed to ping database: %w", err)
	}

	dm.config = config
	dm.db = db
	return nil
}

// TestConnection 测试连接
func (dm *DatabaseManager) TestConnection(config *DatabaseConfig) error {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s",
		config.Username,
		config.Password,
		config.Host,
		config.Port,
		config.Database)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	return nil
}

// GetTables 获取表清单
func (dm *DatabaseManager) GetTables() ([]string, error) {
	if dm.db == nil {
		return nil, fmt.Errorf("database not connected")
	}

	rows, err := dm.db.Query("SHOW TABLES")
	if err != nil {
		return nil, fmt.Errorf("failed to query tables: %w", err)
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil {
			return nil, fmt.Errorf("failed to scan table name: %w", err)
		}
		tables = append(tables, tableName)
	}

	return tables, nil
}

// GetTableMetadata 获取表元数据信息
func (dm *DatabaseManager) GetTableMetadata(tableName string) (map[string]interface{}, error) {
	if dm.db == nil {
		return nil, fmt.Errorf("database not connected")
	}

	metadata := make(map[string]interface{})

	// 获取行数
	var rowCount int64
	err := dm.db.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM %s", tableName)).Scan(&rowCount)
	if err != nil {
		return nil, fmt.Errorf("failed to get row count for table %s: %w", tableName, err)
	}
	metadata["row_count"] = rowCount

	// 获取数据大小（MySQL特定查询）
	var dataSize int64
	err = dm.db.QueryRow(`
		SELECT
			SUM(data_length + index_length)
		FROM information_schema.tables
		WHERE table_schema = ? AND table_name = ?
	`, dm.config.Database, tableName).Scan(&dataSize)
	if err != nil {
		// 如果获取数据大小失败，设置为0但不中断流程
		metadata["data_size"] = int64(0)
	} else {
		metadata["data_size"] = dataSize
	}

	// 获取列数
	var columnCount int
	err = dm.db.QueryRow(`
		SELECT COUNT(*)
		FROM information_schema.columns
		WHERE table_schema = ? AND table_name = ?
	`, dm.config.Database, tableName).Scan(&columnCount)
	if err != nil {
		return nil, fmt.Errorf("failed to get column count for table %s: %w", tableName, err)
	}
	metadata["column_count"] = columnCount

	// 获取表注释
	var tableComment string
	err = dm.db.QueryRow(`
		SELECT table_comment
		FROM information_schema.tables
		WHERE table_schema = ? AND table_name = ?
	`, dm.config.Database, tableName).Scan(&tableComment)
	if err == nil && tableComment != "" {
		metadata["comment"] = tableComment
	}

	return metadata, nil
}

// GetTablesMetadata 批量获取表元数据
func (dm *DatabaseManager) GetTablesMetadata(tableNames []string) (map[string]map[string]interface{}, error) {
	if dm.db == nil {
		return nil, fmt.Errorf("database not connected")
	}

	result := make(map[string]map[string]interface{})

	for _, tableName := range tableNames {
		metadata, err := dm.GetTableMetadata(tableName)
		if err != nil {
			// 如果某个表获取元数据失败，跳过该表但不中断整个流程
			result[tableName] = map[string]interface{}{
				"error": err.Error(),
			}
			continue
		}
		result[tableName] = metadata
	}

	return result, nil
}

// Close 关闭连接
func (dm *DatabaseManager) Close() error {
	if dm.db != nil {
		return dm.db.Close()
	}
	return nil
}