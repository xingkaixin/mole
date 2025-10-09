package backend

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

type mysqlProvider struct {
	baseProvider
}

func (p *mysqlProvider) Name() string {
	return "mysql"
}

func (p *mysqlProvider) DriverName() string {
	return "mysql"
}

func (p *mysqlProvider) BuildDSN(config *DatabaseConfig) (string, error) {
	if config.Database == "" {
		return fmt.Sprintf("%s:%s@tcp(%s:%d)/?charset=utf8mb4&parseTime=true&loc=Local",
			config.Username,
			config.Password,
			config.Host,
			config.Port,
		), nil
	}
	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=true&loc=Local",
		config.Username,
		config.Password,
		config.Host,
		config.Port,
		config.Database,
	), nil
}

func (p *mysqlProvider) GetTables(ctx context.Context, db *sql.DB, _ *DatabaseConfig) ([]string, error) {
	rows, err := db.QueryContext(ctx, "SHOW TABLES")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil {
			return nil, err
		}
		tables = append(tables, tableName)
	}

	return tables, nil
}

func (p *mysqlProvider) GetTableMetadata(ctx context.Context, db *sql.DB, config *DatabaseConfig, tableName string) (map[string]interface{}, error) {
	metadata := make(map[string]interface{})

	rowCount, err := p.ExecuteRowCount(ctx, db, config, tableName)
	if err != nil {
		return nil, err
	}
	metadata["row_count"] = rowCount

	var dataSize sql.NullInt64
	err = db.QueryRowContext(ctx, `
		SELECT
			SUM(data_length + index_length)
		FROM information_schema.tables
		WHERE table_schema = ? AND table_name = ?
	`, config.Database, tableName).Scan(&dataSize)
	if err != nil {
		metadata["data_size"] = int64(0)
	} else if dataSize.Valid {
		metadata["data_size"] = dataSize.Int64
	} else {
		metadata["data_size"] = int64(0)
	}

	var columnCount int
	err = db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM information_schema.columns
		WHERE table_schema = ? AND table_name = ?
	`, config.Database, tableName).Scan(&columnCount)
	if err != nil {
		return nil, err
	}
	metadata["column_count"] = columnCount

	var tableComment sql.NullString
	err = db.QueryRowContext(ctx, `
		SELECT table_comment
		FROM information_schema.tables
		WHERE table_schema = ? AND table_name = ?
	`, config.Database, tableName).Scan(&tableComment)
	if err == nil && tableComment.Valid {
		metadata["comment"] = tableComment.String
	}

	return metadata, nil
}

func (p *mysqlProvider) GetTableColumns(ctx context.Context, db *sql.DB, config *DatabaseConfig, tableName string) ([]ColumnMetadata, error) {
	query := `
		SELECT
			column_name,
			COALESCE(column_comment, '') AS column_comment,
			ordinal_position,
			column_type
		FROM information_schema.columns
		WHERE table_schema = ? AND table_name = ?
		ORDER BY ordinal_position
	`

	rows, err := db.QueryContext(ctx, query, config.Database, tableName)
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

func (p *mysqlProvider) ExecuteRowCount(ctx context.Context, db *sql.DB, config *DatabaseConfig, tableName string) (int64, error) {
	query := fmt.Sprintf("SELECT COUNT(*) FROM %s", p.QuoteTableName(config, tableName))
	var rowCount int64
	if err := db.QueryRowContext(ctx, query).Scan(&rowCount); err != nil {
		return 0, err
	}
	return rowCount, nil
}

func (p *mysqlProvider) ExecuteNonNullRate(ctx context.Context, db *sql.DB, config *DatabaseConfig, tableName string) (map[string]float64, error) {
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
		selectParts = append(selectParts, fmt.Sprintf("1 - AVG(%s IS NULL) AS %s", col, col))
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

func (p *mysqlProvider) QuoteIdentifier(name string) string {
	replaced := strings.ReplaceAll(name, "`", "``")
	return fmt.Sprintf("`%s`", replaced)
}

func (p *mysqlProvider) QuoteTableName(_ *DatabaseConfig, tableName string) string {
	parts := strings.Split(tableName, ".")
	for i, part := range parts {
		parts[i] = p.QuoteIdentifier(part)
	}
	return strings.Join(parts, ".")
}

func clampRatio(value float64) float64 {
	if value < 0 {
		return 0
	}
	if value > 1 {
		return 1
	}
	return value
}
