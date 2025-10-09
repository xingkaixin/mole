package backend

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	_ "github.com/denisenkom/go-mssqldb"
	_ "github.com/go-sql-driver/mysql"
	_ "github.com/lib/pq"
	_ "github.com/sijms/go-ora/v2"
)

// DatabaseProvider 描述特定数据库方言的能力
type DatabaseProvider interface {
	Name() string
	DriverName() string
	BuildDSN(config *DatabaseConfig) (string, error)
	Configure(db *sql.DB, config *DatabaseConfig) error
	GetTables(ctx context.Context, db *sql.DB, config *DatabaseConfig) ([]string, error)
	GetTableMetadata(ctx context.Context, db *sql.DB, config *DatabaseConfig, tableName string) (map[string]interface{}, error)
	GetTableColumns(ctx context.Context, db *sql.DB, config *DatabaseConfig, tableName string) ([]ColumnMetadata, error)
	ExecuteRowCount(ctx context.Context, db *sql.DB, config *DatabaseConfig, tableName string) (int64, error)
	ExecuteNonNullRate(ctx context.Context, db *sql.DB, config *DatabaseConfig, tableName string) (map[string]float64, error)
	QuoteIdentifier(name string) string
	QuoteTableName(config *DatabaseConfig, tableName string) string
}

// baseProvider 为各方言提供默认实现
type baseProvider struct{}

func (baseProvider) Configure(_ *sql.DB, _ *DatabaseConfig) error {
	return nil
}

var providerRegistry = map[string]DatabaseProvider{}

func registerProvider(p DatabaseProvider, aliases ...string) {
	providerRegistry[strings.ToLower(p.Name())] = p
	for _, alias := range aliases {
		providerRegistry[strings.ToLower(alias)] = p
	}
}

func resolveProvider(dbType string) (DatabaseProvider, error) {
	if dbType == "" {
		return nil, errors.New("database type is required")
	}
	provider, ok := providerRegistry[strings.ToLower(dbType)]
	if !ok {
		return nil, fmt.Errorf("unsupported database type: %s", dbType)
	}
	return provider, nil
}

func init() {
	registerProvider(&mysqlProvider{})
	registerProvider(&sqlServerProvider{}, "mssql", "sqlserver")
	registerProvider(&oracleProvider{})
	registerProvider(&postgresProvider{}, "postgres", "postgresql")
}
