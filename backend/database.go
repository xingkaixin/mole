package backend

import (
	"database/sql"
	"fmt"

	_ "github.com/go-sql-driver/mysql"
)

// DatabaseConfig 数据库连接配置
type DatabaseConfig struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Type        string `json:"type"`
	Host        string `json:"host"`
	Port        int    `json:"port"`
	Username    string `json:"username"`
	Password    string `json:"password"`
	Database    string `json:"database"`
	Concurrency int    `json:"concurrency"` // 并发度配置，默认5
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
	logger := GetLogger()
	logger.SetModuleName("DATABASE")
	logger.LogInfo("CONNECT", fmt.Sprintf("开始连接数据库 %s@%s:%d/%s", config.Username, config.Host, config.Port, config.Database))

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s",
		config.Username,
		config.Password,
		config.Host,
		config.Port,
		config.Database)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		logger.LogError("CONNECT", fmt.Sprintf("打开数据库连接失败 - %s", err.Error()))
		return fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		db.Close()
		logger.LogError("CONNECT", fmt.Sprintf("数据库ping失败 - %s", err.Error()))
		return fmt.Errorf("failed to ping database: %w", err)
	}

	dm.config = config
	dm.db = db
	logger.LogInfo("CONNECT", fmt.Sprintf("数据库连接成功 - %s", config.Name))
	return nil
}

// TestConnection 测试连接
func (dm *DatabaseManager) TestConnection(config *DatabaseConfig) error {
	logger := GetLogger()
	logger.SetModuleName("DATABASE")
	logger.LogInfo("TEST", fmt.Sprintf("开始测试数据库连接 %s@%s:%d/%s", config.Username, config.Host, config.Port, config.Database))

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s",
		config.Username,
		config.Password,
		config.Host,
		config.Port,
		config.Database)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		logger.LogError("TEST", fmt.Sprintf("测试连接打开数据库失败 - %s", err.Error()))
		return fmt.Errorf("failed to open database: %w", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		logger.LogError("TEST", fmt.Sprintf("测试连接ping失败 - %s", err.Error()))
		return fmt.Errorf("failed to ping database: %w", err)
	}

	logger.LogInfo("TEST", fmt.Sprintf("数据库连接测试成功 - %s", config.Name))
	return nil
}

// GetTables 获取表清单
func (dm *DatabaseManager) GetTables() ([]string, error) {
	logger := GetLogger()
	logger.SetModuleName("DATABASE")

	if dm.db == nil {
		logger.LogError("GET_TABLES", "数据库未连接")
		return nil, fmt.Errorf("database not connected")
	}

	logger.LogInfo("GET_TABLES", "开始获取数据库表清单")

	rows, err := dm.db.Query("SHOW TABLES")
	if err != nil {
		logger.LogError("GET_TABLES", fmt.Sprintf("查询表清单失败 - %s", err.Error()))
		return nil, fmt.Errorf("failed to query tables: %w", err)
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil {
			logger.LogError("GET_TABLES", fmt.Sprintf("扫描表名失败 - %s", err.Error()))
			return nil, fmt.Errorf("failed to scan table name: %w", err)
		}
		tables = append(tables, tableName)
	}

	logger.LogInfo("GET_TABLES", fmt.Sprintf("获取表清单成功 - 共 %d 个表", len(tables)))
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

// TableMetadata 表元数据结构
type TableMetadata struct {
	TableName    string           `json:"tableName"`
	Comment      string           `json:"comment"`
	DataSize     int64            `json:"dataSize"`
	RowCount     int64            `json:"rowCount"`
	ColumnCount  int              `json:"columnCount"`
	Columns      []ColumnMetadata `json:"columns"`
}

// ColumnMetadata 列元数据结构
type ColumnMetadata struct {
	ColumnName    string `json:"columnName"`
	ColumnComment string `json:"columnComment"`
	ColumnOrdinal int    `json:"columnOrdinal"`
	ColumnType    string `json:"columnType"`
}

// GetTableColumns 获取表的列信息
func (dm *DatabaseManager) GetTableColumns(tableName string) ([]ColumnMetadata, error) {
	if dm.db == nil {
		return nil, fmt.Errorf("database not connected")
	}

	query := `
		SELECT
			column_name,
			COALESCE(column_comment, '') as column_comment,
			ordinal_position,
			column_type
		FROM information_schema.columns
		WHERE table_schema = ? AND table_name = ?
		ORDER BY ordinal_position
	`

	rows, err := dm.db.Query(query, dm.config.Database, tableName)
	if err != nil {
		return nil, fmt.Errorf("failed to query columns for table %s: %w", tableName, err)
	}
	defer rows.Close()

	var columns []ColumnMetadata
	for rows.Next() {
		var column ColumnMetadata
		err := rows.Scan(
			&column.ColumnName,
			&column.ColumnComment,
			&column.ColumnOrdinal,
			&column.ColumnType,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan column info: %w", err)
		}
		columns = append(columns, column)
	}

	return columns, nil
}

// GetTableFullMetadata 获取表的完整元数据信息（包括列信息）
func (dm *DatabaseManager) GetTableFullMetadata(tableName string) (*TableMetadata, error) {
	if dm.db == nil {
		return nil, fmt.Errorf("database not connected")
	}

	// 获取基本表元数据
	basicMetadata, err := dm.GetTableMetadata(tableName)
	if err != nil {
		return nil, err
	}

	// 获取列信息
	columns, err := dm.GetTableColumns(tableName)
	if err != nil {
		return nil, err
	}

	// 构建完整元数据
	metadata := &TableMetadata{
		TableName:   tableName,
		Columns:     columns,
		ColumnCount: len(columns),
	}

	// 从基本元数据中提取其他信息
	if comment, ok := basicMetadata["comment"].(string); ok {
		metadata.Comment = comment
	}
	if dataSize, ok := basicMetadata["data_size"].(int64); ok {
		metadata.DataSize = dataSize
	}
	if rowCount, ok := basicMetadata["row_count"].(int64); ok {
		metadata.RowCount = rowCount
	}

	return metadata, nil
}

// GetAllTablesMetadata 获取所有表的完整元数据
func (dm *DatabaseManager) GetAllTablesMetadata() ([]*TableMetadata, error) {
	if dm.db == nil {
		return nil, fmt.Errorf("database not connected")
	}

	// 获取所有表名
	tableNames, err := dm.GetTables()
	if err != nil {
		return nil, err
	}

	var allMetadata []*TableMetadata
	for _, tableName := range tableNames {
		metadata, err := dm.GetTableFullMetadata(tableName)
		if err != nil {
			// 如果某个表获取失败，跳过但不中断整个流程
			fmt.Printf("Warning: failed to get metadata for table %s: %v\n", tableName, err)
			continue
		}
		allMetadata = append(allMetadata, metadata)
	}

	return allMetadata, nil
}

// GetDB 获取数据库连接
func (dm *DatabaseManager) GetDB() *sql.DB {
	return dm.db
}

// Close 关闭连接
func (dm *DatabaseManager) Close() error {
	logger := GetLogger()
	logger.SetModuleName("DATABASE")

	if dm.db != nil {
		logger.LogInfo("CLOSE", "关闭数据库连接")
		return dm.db.Close()
	}
	logger.LogInfo("CLOSE", "数据库连接已为空，无需关闭")
	return nil
}
