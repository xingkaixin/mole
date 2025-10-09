package backend

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

type oracleProvider struct {
	baseProvider
}

func (p *oracleProvider) Name() string {
	return "oracle"
}

func (p *oracleProvider) DriverName() string {
	return "oracle"
}

func (p *oracleProvider) BuildDSN(config *DatabaseConfig) (string, error) {
	return fmt.Sprintf("oracle://%s:%s@%s:%d/%s",
		config.Username,
		config.Password,
		config.Host,
		config.Port,
		config.Database,
	), nil
}

func (p *oracleProvider) GetTables(ctx context.Context, db *sql.DB, config *DatabaseConfig) ([]string, error) {
	owner := strings.ToUpper(config.Username)
	rows, err := db.QueryContext(ctx, `
		SELECT TABLE_NAME
		FROM ALL_TABLES
		WHERE OWNER = :owner
		ORDER BY TABLE_NAME
	`, owner)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var table string
		if err := rows.Scan(&table); err != nil {
			return nil, err
		}
		tables = append(tables, fmt.Sprintf("%s.%s", owner, table))
	}
	return tables, nil
}

func (p *oracleProvider) GetTableMetadata(ctx context.Context, db *sql.DB, config *DatabaseConfig, tableName string) (map[string]interface{}, error) {
	owner, table := splitSchemaAndTable(tableName, strings.ToUpper(config.Username))
	metadata := make(map[string]interface{})

	rowCount, err := p.ExecuteRowCount(ctx, db, config, tableName)
	if err != nil {
		return nil, err
	}
	metadata["row_count"] = rowCount

	var columnCount int
	err = db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM ALL_TAB_COLUMNS
		WHERE OWNER = :owner AND TABLE_NAME = :table
	`, owner, strings.ToUpper(table)).Scan(&columnCount)
	if err != nil {
		return nil, err
	}
	metadata["column_count"] = columnCount
	metadata["data_size"] = int64(0)
	metadata["comment"] = ""

	return metadata, nil
}

func (p *oracleProvider) GetTableColumns(ctx context.Context, db *sql.DB, config *DatabaseConfig, tableName string) ([]ColumnMetadata, error) {
	owner, table := splitSchemaAndTable(tableName, strings.ToUpper(config.Username))
	query := `
		SELECT
			c.COLUMN_NAME,
			NVL(cc.COMMENTS, ''),
			c.COLUMN_ID,
			c.DATA_TYPE
		FROM ALL_TAB_COLUMNS c
		LEFT JOIN ALL_COL_COMMENTS cc
			ON c.OWNER = cc.OWNER AND c.TABLE_NAME = cc.TABLE_NAME AND c.COLUMN_NAME = cc.COLUMN_NAME
		WHERE c.OWNER = :owner AND c.TABLE_NAME = :table
		ORDER BY c.COLUMN_ID
	`

	rows, err := db.QueryContext(ctx, query, owner, strings.ToUpper(table))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var columns []ColumnMetadata
	for rows.Next() {
		var column ColumnMetadata
		if err := rows.Scan(
			&column.ColumnName,
			&column.ColumnComment,
			&column.ColumnOrdinal,
			&column.ColumnType,
		); err != nil {
			return nil, err
		}
		columns = append(columns, column)
	}

	return columns, nil
}

func (p *oracleProvider) ExecuteRowCount(ctx context.Context, db *sql.DB, config *DatabaseConfig, tableName string) (int64, error) {
	query := fmt.Sprintf("SELECT COUNT(*) FROM %s", p.QuoteTableName(config, tableName))
	var rowCount int64
	if err := db.QueryRowContext(ctx, query).Scan(&rowCount); err != nil {
		return 0, err
	}
	return rowCount, nil
}

func (p *oracleProvider) ExecuteNonNullRate(ctx context.Context, db *sql.DB, config *DatabaseConfig, tableName string) (map[string]float64, error) {
	columns, err := p.GetTableColumns(ctx, db, config, tableName)
	if err != nil {
		return nil, err
	}
	if len(columns) == 0 {
		return map[string]float64{}, nil
	}

	selectParts := make([]string, 0, len(columns))
	for _, column := range columns {
		col := p.QuoteIdentifier(column.ColumnName)
		selectParts = append(selectParts, fmt.Sprintf("1 - AVG(CASE WHEN %s IS NULL THEN 1 ELSE 0 END) AS %s", col, col))
	}

	query := fmt.Sprintf("SELECT %s FROM %s", strings.Join(selectParts, ", "), p.QuoteTableName(config, tableName))
	row := db.QueryRowContext(ctx, query)

	values := make([]sql.NullFloat64, len(columns))
	scanArgs := make([]interface{}, len(columns))
	for i := range values {
		scanArgs[i] = &values[i]
	}

	if err := row.Scan(scanArgs...); err != nil {
		return nil, err
	}

	result := make(map[string]float64, len(columns))
	for i, column := range columns {
		val := 0.0
		if values[i].Valid {
			val = clampRatio(values[i].Float64)
		}
		result[column.ColumnName] = val
	}

	return result, nil
}

func (p *oracleProvider) QuoteIdentifier(name string) string {
	replaced := strings.ReplaceAll(name, "\"", "\"\"")
	return fmt.Sprintf("\"%s\"", strings.ToUpper(replaced))
}

func (p *oracleProvider) QuoteTableName(config *DatabaseConfig, tableName string) string {
	owner, table := splitSchemaAndTable(tableName, strings.ToUpper(config.Username))
	return fmt.Sprintf("%s.%s", p.QuoteIdentifier(owner), p.QuoteIdentifier(table))
}
