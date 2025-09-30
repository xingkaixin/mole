# 规则系统架构设计

## 目标
设计可扩展的规则系统架构，支持未来新增各种数据质量检查规则

## 核心需求
- ✅ 规则插件化架构
- ✅ 统一的规则接口定义
- ✅ 规则配置和参数管理
- ✅ 规则执行和结果收集
- ✅ 规则优先级和依赖关系

## 架构设计

### 1. 规则接口定义 (Go)
```go
type Rule interface {
    // 规则基本信息
    ID() string
    Name() string
    Description() string

    // 规则执行
    Execute(ctx context.Context, table *TableInfo, config RuleConfig) (*RuleResult, error)

    // 规则配置
    DefaultConfig() RuleConfig
    ValidateConfig(config RuleConfig) error
}

type RuleResult struct {
    RuleID    string
    Status    RuleStatus // PASS, FAIL, WARNING, ERROR
    Message   string
    Metrics   map[string]interface{}
    Details   []RuleDetail
}
```

### 2. 规则注册和管理
```go
type RuleRegistry interface {
    Register(rule Rule) error
    GetRule(ruleID string) (Rule, error)
    ListRules() []Rule
    Unregister(ruleID string) error
}
```

### 3. 内置规则实现
- **RowCountRule**: 数据总量检查
- **NullRateRule**: 空值率检查
- **UniquenessRule**: 唯一性检查
- **DataTypeRule**: 数据类型检查
- **PatternRule**: 数据格式检查
- **RangeRule**: 数值范围检查

### 4. 规则配置结构
```go
type RuleConfig struct {
    RuleID     string                 `json:"rule_id"`
    Enabled    bool                   `json:"enabled"`
    Parameters map[string]interface{} `json:"parameters"`
    Thresholds map[string]float64     `json:"thresholds"`
}
```

### 5. 表分析任务配置
```go
type TableAnalysisConfig struct {
    TableName string       `json:"table_name"`
    Rules     []RuleConfig `json:"rules"`
}
```

## 前端架构

### 1. 规则配置组件
- 动态规则选择器
- 参数配置表单
- 阈值设置界面

### 2. 规则管理界面
- 规则启用/禁用
- 规则优先级调整
- 规则依赖关系配置

## 扩展机制

### 1. 自定义规则开发
```go
// 开发者只需实现Rule接口
type CustomRule struct {
    // 实现Rule接口方法
}

// 注册自定义规则
registry.Register(&CustomRule{})
```

### 2. 规则包管理
- 内置规则包
- 第三方规则包
- 用户自定义规则包

## 技术实现要点

### 后端 (Go)
1. **规则工厂模式** - 动态创建规则实例
2. **依赖注入** - 规则间的依赖管理
3. **配置持久化** - 规则配置存储和加载
4. **执行引擎** - 并行规则执行和结果聚合

### 前端 (React)
1. **动态表单生成** - 根据规则参数自动生成配置表单
2. **规则预览** - 规则执行前的参数验证和预览
3. **结果可视化** - 规则执行结果的可视化展示

## 验收标准
- [ ] 能动态注册和注销规则
- [ ] 能配置规则参数和阈值
- [ ] 能并行执行多个规则
- [ ] 能正确处理规则间的依赖关系
- [ ] 能扩展新的规则类型
- [ ] 规则配置能持久化存储
- [ ] 前端能动态显示规则配置表单