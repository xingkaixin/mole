package backend

import (
	"context"
	"database/sql"
	"fmt"
	"net/url"
	"strings"
)

type postgresProvider struct {
	baseProvider
}

func (p *postgresProvider) Name() string {
	return "postgresql"
}

func (p *postgresProvider) DriverName() string {
	return "postgres"
}

func (p *postgresProvider) BuildDSN(config *DatabaseConfig) (string, error) {
	u := &url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(config.Username, config.Password),
		Host:   fmt.Sprintf("%s:%d", config.Host, config.Port),
		Path:   config.Database,
	}
	q := u.Query()
	if q.Get("sslmode") == "" {
		q.Set("sslmode", "disable")
	}
	u.RawQuery = q.Encode()
	return u.String(), nil
}

func (p *postgresProvider) GetTables(ctx context.Context, db *sql.DB, _ *DatabaseConfig) ([]string, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT table_schema, table_name
		FROM information_schema.tables
		WHERE table_type = 'BASE TABLE'
		AND table_schema NOT IN ('pg_catalog', 'information_schema')
		ORDER BY table_schema, table_name
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

func (p *postgresProvider) GetTableMetadata(ctx context.Context, db *sql.DB, _ *DatabaseConfig, tableName string) (map[string]interface{}, error) {
	schema, table := splitSchemaAndTable(tableName, "public")
	metadata := make(map[string]interface{})

	rowCount, err := p.ExecuteRowCount(ctx, db, nil, tableName)
	if err != nil {
		return nil, err
	}
	metadata["row_count"] = rowCount

	var columnCount int
	err = db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM information_schema.columns
		WHERE table_schema = $1 AND table_name = $2
	`, schema, table).Scan(&columnCount)
	if err != nil {
		return nil, err
	}
	metadata["column_count"] = columnCount
	metadata["data_size"] = int64(0)
	metadata["comment"] = ""

	return metadata, nil
}

func (p *postgresProvider) GetTableColumns(ctx context.Context, db *sql.DB, _ *DatabaseConfig, tableName string) ([]ColumnMetadata, error) {
	schema, table := splitSchemaAndTable(tableName, "public")
	query := `
		SELECT
			column_name,
			COALESCE(col_description((quote_ident(table_schema)||'.'||quote_ident(table_name))::regclass::oid, ordinal_position), '') AS column_comment,
			ordinal_position,
			data_type
		FROM information_schema.columns
		WHERE table_schema = $1 AND table_name = $2
		ORDER BY ordinal_position
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

func (p *postgresProvider) ExecuteRowCount(ctx context.Context, db *sql.DB, _ *DatabaseConfig, tableName string) (int64, error) {
	query := fmt.Sprintf("SELECT COUNT(*) FROM %s", p.QuoteTableName(nil, tableName))
	var rowCount int64
	if err := db.QueryRowContext(ctx, query).Scan(&rowCount); err != nil {
		return 0, err
	}
	return rowCount, nil
}

func (p *postgresProvider) ExecuteNonNullRate(ctx context.Context, db *sql.DB, config *DatabaseConfig, tableName string) (map[string]float64, error) {
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
		selectParts = append(selectParts, fmt.Sprintf("1 - AVG(CASE WHEN %s IS NULL THEN 1.0 ELSE 0.0 END) AS %s", col, col))
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

func (p *postgresProvider) QuoteIdentifier(name string) string {
	replaced := strings.ReplaceAll(name, "\"", "\"\"")
	return fmt.Sprintf("\"%s\"", replaced)
}

func (p *postgresProvider) QuoteTableName(_ *DatabaseConfig, tableName string) string {
	parts := strings.Split(tableName, ".")
	if len(parts) == 1 {
		return p.QuoteIdentifier(parts[0])
	}
	return fmt.Sprintf("%s.%s", p.QuoteIdentifier(parts[0]), p.QuoteIdentifier(parts[1]))
}
