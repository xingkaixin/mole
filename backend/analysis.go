package backend

import (
	"context"
	"database/sql"
	"fmt"
)

// AnalysisRule 分析规则接口
type AnalysisRule interface {
	GetName() string
	GetDescription() string
	Execute(ctx context.Context, db *sql.DB, tableName string, config *DatabaseConfig, provider DatabaseProvider) (interface{}, error)
}

// RowCountRule 行数统计规则
type RowCountRule struct{}

func (r *RowCountRule) GetName() string {
	return "row_count"
}

func (r *RowCountRule) GetDescription() string {
	return "统计表的行数"
}

func (r *RowCountRule) Execute(ctx context.Context, db *sql.DB, tableName string, config *DatabaseConfig, provider DatabaseProvider) (interface{}, error) {
	if provider == nil {
		return nil, fmt.Errorf("database provider not available")
	}
	return provider.ExecuteRowCount(ctx, db, config, tableName)
}

// NonNullRateRule 非空值率统计规则
type NonNullRateRule struct{}

func (r *NonNullRateRule) GetName() string {
	return "non_null_rate"
}

func (r *NonNullRateRule) GetDescription() string {
	return "统计列的非空值率"
}

func (r *NonNullRateRule) Execute(ctx context.Context, db *sql.DB, tableName string, config *DatabaseConfig, provider DatabaseProvider) (interface{}, error) {
	if provider == nil {
		return nil, fmt.Errorf("database provider not available")
	}
	return provider.ExecuteNonNullRate(ctx, db, config, tableName)
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
func (e *AnalysisEngine) ExecuteAnalysis(ctx context.Context, db *sql.DB, tableName string, config *DatabaseConfig, provider DatabaseProvider, ruleNames []string) (map[string]interface{}, error) {
	logger := GetLogger()
	logger.SetModuleName("ANALYSIS")
	logger.LogInfo("EXECUTE", fmt.Sprintf("开始执行表分析 - 表: %s, 规则数: %d", tableName, len(ruleNames)))

	if provider == nil {
		return nil, fmt.Errorf("database provider not available")
	}

	result := make(map[string]interface{})

	for _, ruleName := range ruleNames {
		rule, exists := e.rules[ruleName]
		if !exists {
			logger.LogError("EXECUTE", fmt.Sprintf("规则不存在 - %s", ruleName))
			continue // 跳过不存在的规则
		}

		logger.LogInfo("EXECUTE_RULE", fmt.Sprintf("执行规则 - %s.%s", tableName, ruleName))
		ruleResult, err := rule.Execute(ctx, db, tableName, config, provider)
		if err != nil {
			logger.LogError("EXECUTE_RULE", fmt.Sprintf("规则执行失败 - %s.%s: %s", tableName, ruleName, err.Error()))
			result[ruleName] = map[string]interface{}{
				"error": err.Error(),
			}
			continue
		}

		logger.LogInfo("EXECUTE_RULE", fmt.Sprintf("规则执行成功 - %s.%s", tableName, ruleName))
		result[ruleName] = ruleResult
	}

	return result, nil
}
