package backend

import (
	"database/sql"
	"fmt"
)

// AnalysisRule 分析规则接口
type AnalysisRule interface {
	GetName() string
	GetDescription() string
	Execute(db *sql.DB, tableName string, config *DatabaseConfig) (interface{}, error)
}

// RowCountRule 行数统计规则
type RowCountRule struct{}

func (r *RowCountRule) GetName() string {
	return "row_count"
}

func (r *RowCountRule) GetDescription() string {
	return "统计表的行数"
}

func (r *RowCountRule) Execute(db *sql.DB, tableName string, config *DatabaseConfig) (interface{}, error) {
	var rowCount int64
	err := db.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM %s", tableName)).Scan(&rowCount)
	if err != nil {
		return nil, fmt.Errorf("failed to get row count for table %s: %w", tableName, err)
	}
	return rowCount, nil
}

// NonNullRateRule 非空值率统计规则
type NonNullRateRule struct{}

func (r *NonNullRateRule) GetName() string {
	return "non_null_rate"
}

func (r *NonNullRateRule) GetDescription() string {
	return "统计列的非空值率"
}

func (r *NonNullRateRule) Execute(db *sql.DB, tableName string, config *DatabaseConfig) (interface{}, error) {
	fmt.Printf("NonNullRateRule: Starting analysis for table %s in database %s\n", tableName, config.Database)

	// 获取表的列信息 - 使用更简单的方式，避免复杂的查询
	query := fmt.Sprintf("SHOW COLUMNS FROM %s", tableName)
	rows, err := db.Query(query)
	if err != nil {
		fmt.Printf("NonNullRateRule: Failed to get columns for table %s with SHOW COLUMNS: %v\n", tableName, err)
		// 尝试使用information_schema作为备用方案
		rows, err = db.Query(`
			SELECT column_name
			FROM information_schema.columns
			WHERE table_schema = ? AND table_name = ?
		`, config.Database, tableName)
		if err != nil {
			fmt.Printf("NonNullRateRule: Failed to get columns for table %s with information_schema: %v\n", tableName, err)
			return nil, fmt.Errorf("failed to get columns for table %s: %w", tableName, err)
		}
	}
	defer rows.Close()

	var columns []string
	for rows.Next() {
		var columnName string
		var columnType, nullType, keyType, defaultValue, extraType *string
		// SHOW COLUMNS返回6个字段，某些字段可能为NULL，使用指针类型
		if err := rows.Scan(&columnName, &columnType, &nullType, &keyType, &defaultValue, &extraType); err != nil {
			fmt.Printf("NonNullRateRule: Failed to scan column name: %v\n", err)
			continue // 不跳过整个分析，只跳过这个列
		}
		columns = append(columns, columnName)
	}
	fmt.Printf("NonNullRateRule: Found %d columns for table %s: %v\n", len(columns), tableName, columns)

	if len(columns) == 0 {
		fmt.Printf("NonNullRateRule: No columns found for table %s\n", tableName)
		return make(map[string]float64), nil
	}

	// 先获取表的总行数（只需要获取一次）
	var totalCount int64
	err = db.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM %s", tableName)).Scan(&totalCount)
	if err != nil {
		fmt.Printf("NonNullRateRule: Failed to get total row count for table %s: %v\n", tableName, err)
		return nil, fmt.Errorf("failed to get row count for table %s: %w", tableName, err)
	}
	fmt.Printf("NonNullRateRule: Table %s total rows: %d\n", tableName, totalCount)

	// 计算每列的非空值率
	result := make(map[string]float64)
	for _, column := range columns {
		fmt.Printf("NonNullRateRule: Analyzing column %s\n", column)

		// 获取非空值数量
		var nonNullCount int64
		query := fmt.Sprintf("SELECT COUNT(%s) FROM %s", column, tableName)
		fmt.Printf("NonNullRateRule: Executing query: %s\n", query)

		err = db.QueryRow(query).Scan(&nonNullCount)
		if err != nil {
			fmt.Printf("NonNullRateRule: Failed to get non-null count for column %s: %v\n", column, err)
			// 设置为0，不跳过整个列
			result[column] = 0.0
			continue
		}

		var nonNullRate float64
		if totalCount > 0 {
			nonNullRate = float64(nonNullCount) / float64(totalCount)
		}
		result[column] = nonNullRate
		fmt.Printf("NonNullRateRule: Column %s: %d/%d = %.2f%%\n", column, nonNullCount, totalCount, nonNullRate*100)
	}

	fmt.Printf("NonNullRateRule: Completed analysis for table %s, result: %v\n", tableName, result)
	return result, nil
}

// AnalysisEngine 分析引擎
type AnalysisEngine struct {
	rules map[string]AnalysisRule
}

// NewAnalysisEngine 创建分析引擎
func NewAnalysisEngine() *AnalysisEngine {
	engine := &AnalysisEngine{
		rules: make(map[string]AnalysisRule),
	}

	// 注册默认规则
	engine.RegisterRule(&RowCountRule{})
	engine.RegisterRule(&NonNullRateRule{})

	return engine
}

// RegisterRule 注册规则
func (e *AnalysisEngine) RegisterRule(rule AnalysisRule) {
	e.rules[rule.GetName()] = rule
}

// GetRule 获取规则
func (e *AnalysisEngine) GetRule(name string) (AnalysisRule, bool) {
	rule, exists := e.rules[name]
	return rule, exists
}

// GetAvailableRules 获取可用规则列表
func (e *AnalysisEngine) GetAvailableRules() []string {
	var rules []string
	for name := range e.rules {
		rules = append(rules, name)
	}
	return rules
}

// ExecuteAnalysis 执行分析
func (e *AnalysisEngine) ExecuteAnalysis(db *sql.DB, tableName string, config *DatabaseConfig, ruleNames []string) (map[string]interface{}, error) {
	result := make(map[string]interface{})

	for _, ruleName := range ruleNames {
		rule, exists := e.rules[ruleName]
		if !exists {
			continue // 跳过不存在的规则
		}

		ruleResult, err := rule.Execute(db, tableName, config)
		if err != nil {
			result[ruleName] = map[string]interface{}{
				"error": err.Error(),
			}
			continue
		}

		result[ruleName] = ruleResult
	}

	return result, nil
}