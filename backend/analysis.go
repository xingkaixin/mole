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
	// 获取表的列信息
	rows, err := db.Query(`
		SELECT column_name
		FROM information_schema.columns
		WHERE table_schema = ? AND table_name = ?
	`, config.Database, tableName)
	if err != nil {
		return nil, fmt.Errorf("failed to get columns for table %s: %w", tableName, err)
	}
	defer rows.Close()

	var columns []string
	for rows.Next() {
		var columnName string
		if err := rows.Scan(&columnName); err != nil {
			return nil, fmt.Errorf("failed to scan column name: %w", err)
		}
		columns = append(columns, columnName)
	}

	// 计算每列的非空值率
	result := make(map[string]float64)
	for _, column := range columns {
		var totalCount, nonNullCount int64

		// 获取总行数
		err := db.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM %s", tableName)).Scan(&totalCount)
		if err != nil {
			continue // 跳过该列
		}

		// 获取非空值数量
		err = db.QueryRow(fmt.Sprintf("SELECT COUNT(%s) FROM %s", column, tableName)).Scan(&nonNullCount)
		if err != nil {
			continue // 跳过该列
		}

		var nonNullRate float64
		if totalCount > 0 {
			nonNullRate = float64(nonNullCount) / float64(totalCount)
		}
		result[column] = nonNullRate
	}

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