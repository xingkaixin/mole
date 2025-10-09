package backend

import (
	"context"
	"database/sql"
	"fmt"
	"net/url"
	"strings"
)

type sqlServerProvider struct {
	baseProvider
}

func (p *sqlServerProvider) Name() string {
	return "sqlserver"
}

func (p *sqlServerProvider) DriverName() string {
	return "sqlserver"
}

func (p *sqlServerProvider) BuildDSN(config *DatabaseConfig) (string, error) {
	query := url.Values{}
	if config.Database != "" {
		query.Add("database", config.Database)
	}

	u := &url.URL{
		Scheme: "sqlserver",
		User:   url.UserPassword(config.Username, config.Password),
		Host:   fmt.Sprintf("%s:%d", config.Host, config.Port),
	}
	if encoded := query.Encode(); encoded != "" {
		u.RawQuery = encoded
	}

	return u.String(), nil
}

func (p *sqlServerProvider) GetTables(ctx context.Context, db *sql.DB, _ *DatabaseConfig) ([]string, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT TABLE_SCHEMA, TABLE_NAME
		FROM INFORMATION_SCHEMA.TABLES
		WHERE TABLE_TYPE = 'BASE TABLE'
		ORDER BY TABLE_SCHEMA, TABLE_NAME
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var schema, table string
		if err := rows.Scan(&schema, &table); err != nil {
			return nil, err
		}
		tables = append(tables, fmt.Sprintf("%s.%s", schema, table))
	}
	return tables, nil
}

func (p *sqlServerProvider) GetTableMetadata(ctx context.Context, db *sql.DB, _ *DatabaseConfig, tableName string) (map[string]interface{}, error) {
	schema, table := splitSchemaAndTable(tableName, "dbo")
	metadata := make(map[string]interface{})

	rowCount, err := p.ExecuteRowCount(ctx, db, nil, tableName)
	if err != nil {
		return nil, err
	}
	metadata["row_count"] = rowCount

	var columnCount int
	err = db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM INFORMATION_SCHEMA.COLUMNS
		WHERE TABLE_SCHEMA = @p1 AND TABLE_NAME = @p2
	`, schema, table).Scan(&columnCount)
	if err != nil {
		return nil, err
	}
	metadata["column_count"] = columnCount
	metadata["data_size"] = int64(0)
	metadata["comment"] = ""

	return metadata, nil
}

func (p *sqlServerProvider) GetTableColumns(ctx context.Context, db *sql.DB, _ *DatabaseConfig, tableName string) ([]ColumnMetadata, error) {
	schema, table := splitSchemaAndTable(tableName, "dbo")
	query := `
		SELECT
			c.COLUMN_NAME,
			'',
			c.ORDINAL_POSITION,
			c.DATA_TYPE
		FROM INFORMATION_SCHEMA.COLUMNS c
		WHERE c.TABLE_SCHEMA = @p1 AND c.TABLE_NAME = @p2
		ORDER BY c.ORDINAL_POSITION
	`

	rows, err := db.QueryContext(ctx, query, schema, table)
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

func (p *sqlServerProvider) ExecuteRowCount(ctx context.Context, db *sql.DB, _ *DatabaseConfig, tableName string) (int64, error) {
	query := fmt.Sprintf("SELECT COUNT(*) FROM %s", p.QuoteTableName(nil, tableName))
	var rowCount int64
	if err := db.QueryRowContext(ctx, query).Scan(&rowCount); err != nil {
		return 0, err
	}
	return rowCount, nil
}

func (p *sqlServerProvider) ExecuteNonNullRate(ctx context.Context, db *sql.DB, config *DatabaseConfig, tableName string) (map[string]float64, error) {
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
		selectParts = append(selectParts, fmt.Sprintf("1.0 - AVG(CASE WHEN %s IS NULL THEN 1.0 ELSE 0.0 END) AS %s", col, col))
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

func (p *sqlServerProvider) QuoteIdentifier(name string) string {
	replaced := strings.ReplaceAll(name, "]", "]]")
	return fmt.Sprintf("[%s]", replaced)
}

func (p *sqlServerProvider) QuoteTableName(_ *DatabaseConfig, tableName string) string {
	schema, table := splitSchemaAndTable(tableName, "dbo")
	return fmt.Sprintf("%s.%s", p.QuoteIdentifier(schema), p.QuoteIdentifier(table))
}

func splitSchemaAndTable(fullName, defaultSchema string) (string, string) {
	parts := strings.Split(fullName, ".")
	if len(parts) == 1 {
		return defaultSchema, parts[0]
	}
	return parts[0], parts[1]
}
