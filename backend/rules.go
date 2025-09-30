package backend

import (
	"database/sql"
	"fmt"
)

// RuleResult 规则执行结果
type RuleResult struct {
	RuleName string      `json:"ruleName"`
	Table    string      `json:"table"`
	Column   string      `json:"column,omitempty"`
	Value    interface{} `json:"value"`
	Status   string      `json:"status"` // "success", "warning", "error"
}

// Rule 规则接口
type Rule interface {
	Name() string
	Execute(db *sql.DB, table string) ([]RuleResult, error)
}

// RuleManager 规则管理器
type RuleManager struct {
	rules map[string]Rule
}

// NewRuleManager 创建规则管理器
func NewRuleManager() *RuleManager {
	return &RuleManager{
		rules: make(map[string]Rule),
	}
}

// RegisterRule 注册规则
func (rm *RuleManager) RegisterRule(rule Rule) {
	rm.rules[rule.Name()] = rule
}

// GetRules 获取所有规则
func (rm *RuleManager) GetRules() []string {
	var ruleNames []string
	for name := range rm.rules {
		ruleNames = append(ruleNames, name)
	}
	return ruleNames
}

// ExecuteRule 执行指定规则
func (rm *RuleManager) ExecuteRule(ruleName string, db *sql.DB, table string) ([]RuleResult, error) {
	rule, exists := rm.rules[ruleName]
	if !exists {
		return nil, fmt.Errorf("rule not found: %s", ruleName)
	}
	return rule.Execute(db, table)
}

// ExecuteAllRules 执行所有规则
func (rm *RuleManager) ExecuteAllRules(db *sql.DB, table string) ([]RuleResult, error) {
	var allResults []RuleResult
	for _, rule := range rm.rules {
		results, err := rule.Execute(db, table)
		if err != nil {
			return nil, err
		}
		allResults = append(allResults, results...)
	}
	return allResults, nil
}

// RowCountRule 数据总量统计规则
type RowCountRule struct{}

func (r *RowCountRule) Name() string {
	return "row_count"
}

func (r *RowCountRule) Execute(db *sql.DB, table string) ([]RuleResult, error) {
	var count int64
	err := db.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM `%s`", table)).Scan(&count)
	if err != nil {
		return nil, fmt.Errorf("failed to count rows for table %s: %w", table, err)
	}

	return []RuleResult{
		{
			RuleName: r.Name(),
			Table:    table,
			Value:    count,
			Status:   "success",
		},
	}, nil
}

// NullRateRule 字段空值率检查规则
type NullRateRule struct{}

func (r *NullRateRule) Name() string {
	return "null_rate"
}

func (r *NullRateRule) Execute(db *sql.DB, table string) ([]RuleResult, error) {
	// 获取表的所有列
	rows, err := db.Query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?", table)
	if err != nil {
		return nil, fmt.Errorf("failed to get columns for table %s: %w", table, err)
	}
	defer rows.Close()

	var columns []string
	for rows.Next() {
		var column string
		if err := rows.Scan(&column); err != nil {
			return nil, fmt.Errorf("failed to scan column name: %w", err)
		}
		columns = append(columns, column)
	}

	var results []RuleResult
	for _, column := range columns {
		var totalCount, nullCount int64

		// 获取总行数
		err := db.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM `%s`", table)).Scan(&totalCount)
		if err != nil {
			return nil, fmt.Errorf("failed to count rows for table %s: %w", table, err)
		}

		// 获取空值数量
		err = db.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM `%s` WHERE `%s` IS NULL", table, column)).Scan(&nullCount)
		if err != nil {
			return nil, fmt.Errorf("failed to count nulls for column %s: %w", column, err)
		}

		var nullRate float64
		if totalCount > 0 {
			nullRate = float64(nullCount) / float64(totalCount)
		}

		status := "success"
		if nullRate > 0.5 {
			status = "warning"
		}

		results = append(results, RuleResult{
			RuleName: r.Name(),
			Table:    table,
			Column:   column,
			Value:    fmt.Sprintf("%.2f%%", nullRate*100),
			Status:   status,
		})
	}

	return results, nil
}