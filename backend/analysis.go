package backend

import (
	"database/sql"
	"fmt"
	"strings"
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
	query := fmt.Sprintf("SHOW COLUMNS FROM %s", tableName)
	rows, err := db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to get columns for table %s: %w", tableName, err)
	}
	defer rows.Close()

	var columns []string
	for rows.Next() {
		var columnName string
		var columnType, nullType, keyType, defaultValue, extraType *string
		if err := rows.Scan(&columnName, &columnType, &nullType, &keyType, &defaultValue, &extraType); err != nil {
			continue
		}
		columns = append(columns, columnName)
	}

	if len(columns) == 0 {
		return make(map[string]float64), nil
	}

	// 优化方案：构建单个SQL查询计算所有列的非空值率
	// 利用MySQL布尔表达式特性：true=1, false=0
	// AVG(column IS NULL) 计算空置率，1 - AVG(column IS NULL) 得到非空值率
	// 性能提升：从 2N+1 次查询减少到 1 次查询
	var selectParts []string
	for _, column := range columns {
		selectParts = append(selectParts, fmt.Sprintf("1 - AVG(%s IS NULL) as %s", column, column))
	}

	sqlQuery := fmt.Sprintf("SELECT %s FROM %s", strings.Join(selectParts, ", "), tableName)
	row := db.QueryRow(sqlQuery)

	// 准备结果容器和扫描器
	scanners := make([]interface{}, len(columns))
	for i := range scanners {
		var rate float64
		scanners[i] = &rate
	}

	// 执行单次查询并扫描所有结果
	if err := row.Scan(scanners...); err != nil {
		return nil, fmt.Errorf("failed to scan non-null rates: %w", err)
	}

	// 构建最终结果，确保数据有效性
	result := make(map[string]float64)
	for i, column := range columns {
		rate := *(scanners[i].(*float64))
		// 数据验证：确保结果在合理范围内 [0, 1]
		if rate < 0 {
			rate = 0
		} else if rate > 1 {
			rate = 1
		}
		result[column] = rate
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
