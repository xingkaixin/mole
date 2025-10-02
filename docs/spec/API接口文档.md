# Mole API 接口文档

## 接口概览

Mole 系统基于 Wails 框架，通过 Go 后端提供 API 接口，前端通过自动生成的 JavaScript 绑定调用这些接口。所有接口都是异步调用，返回 Promise。

## 基础信息

- **框架**: Wails v2
- **后端语言**: Go
- **前端调用**: TypeScript (自动生成绑定)
- **通信方式**: 内部函数调用 (非 HTTP)

## 接口分类

### 1. 数据库连接管理接口
### 2. 表操作接口
### 3. 分析任务接口
### 4. 分析结果接口
### 5. 配置管理接口
### 6. 系统工具接口

---

## 1. 数据库连接管理接口

### 1.1 测试数据库连接

**接口**: `TestDatabaseConnection(config: DatabaseConfig): Promise<string>`

**功能**: 测试指定数据库配置的连接性

**参数**:
```typescript
interface DatabaseConfig {
    id: string;           // 连接ID (可选，测试时可为空)
    name: string;         // 连接名称
    type: string;         // 数据库类型 (如 "mysql")
    host: string;         // 主机地址
    port: number;         // 端口号
    username: string;     // 用户名
    password: string;     // 密码
    database: string;     // 数据库名
    concurrency: number;  // 并发度 (默认5)
}
```

**返回值**:
```typescript
Promise<string>  // "连接成功" 或错误信息
```

**异常**:
- 连接失败时抛出异常，包含具体错误信息

**示例**:
```typescript
try {
    const config = {
        name: "测试数据库",
        type: "mysql",
        host: "localhost",
        port: 3306,
        username: "root",
        password: "password",
        database: "test_db"
    };
    const result = await TestDatabaseConnection(config);
    console.log(result); // "连接成功"
} catch (error) {
    console.error("连接失败:", error.message);
}
```

### 1.2 建立数据库连接

**接口**: `ConnectDatabase(config: DatabaseConfig): Promise<string>`

**功能**: 建立数据库连接并设为当前活动连接

**参数**: 同 `TestDatabaseConnection`

**返回值**:
```typescript
Promise<string>  // "连接成功" 或错误信息
```

### 1.3 获取数据库连接列表

**接口**: `GetDatabaseConnections(): Promise<DatabaseConfig[]>`

**功能**: 获取所有保存的数据库连接配置

**返回值**:
```typescript
Promise<DatabaseConfig[]>  // 数据库连接配置数组
```

**示例**:
```typescript
const connections = await GetDatabaseConnections();
console.log("所有连接:", connections);
```

### 1.4 保存数据库连接

**接口**: `SaveDatabaseConnection(config: DatabaseConfig): Promise<void>`

**功能**: 保存或更新数据库连接配置到本地存储

**参数**: 完整的 `DatabaseConfig` 对象，必须包含 `id`

**返回值**:
```typescript
Promise<void>
```

### 1.5 删除数据库连接

**接口**: `DeleteDatabaseConnection(id: string): Promise<void>`

**功能**: 删除指定的数据库连接配置

**参数**:
```typescript
id: string  // 要删除的连接ID
```

**返回值**:
```typescript
Promise<void>
```

---

## 2. 表操作接口

### 2.1 获取表列表

**接口**: `GetTables(): Promise<string[]>`

**功能**: 获取当前数据库连接下的所有表名

**前置条件**: 必须先建立数据库连接

**返回值**:
```typescript
Promise<string[]>  // 表名数组
```

**示例**:
```typescript
try {
    const tables = await GetTables();
    console.log("数据库表:", tables); // ["users", "orders", "products"]
} catch (error) {
    console.error("获取表列表失败:", error.message);
}
```

### 2.2 获取表元数据

**接口**: `GetTablesMetadata(tableNames: string[]): Promise<Record<string, TableMetadata>>`

**功能**: 批量获取指定表的元数据信息

**参数**:
```typescript
tableNames: string[]  // 表名数组
```

**返回值**:
```typescript
Promise<Record<string, TableMetadata>>
// key: 表名, value: 表元数据

interface TableMetadata {
    row_count?: number;   // 行数
    data_size?: number;   // 数据大小(字节)
    column_count?: number; // 列数
    comment?: string;     // 表注释
    error?: string;       // 错误信息(获取失败时)
}
```

**示例**:
```typescript
const metadata = await GetTablesMetadata(["users", "orders"]);
console.log("表元数据:", metadata);
// 输出:
// {
//   "users": {
//     "row_count": 1000,
//     "data_size": 16384,
//     "column_count": 8,
//     "comment": "用户信息表"
//   },
//   "orders": {
//     "row_count": 5000,
//     "data_size": 32768,
//     "column_count": 12
//   }
// }
```

### 2.3 获取表选择状态

**接口**: `GetTableSelections(): Promise<string[]>`

**功能**: 获取当前连接下已选择的表名列表

**返回值**:
```typescript
Promise<string[]>  // 已选择的表名数组
```

### 2.4 保存表选择状态

**接口**: `SaveTableSelections(tableNames: string[]): Promise<void>`

**功能**: 保存表选择状态到本地存储

**参数**:
```typescript
tableNames: string[]  // 要保存的表名数组
```

---

## 3. 分析任务接口

### 3.1 启动分析任务

**接口**: `StartAnalysisTasks(connectionID: string, tables: string[]): Promise<string>`

**功能**: 为指定表启动并发分析任务

**参数**:
```typescript
connectionID: string  // 数据库连接ID
tables: string[]      // 要分析的表名数组
```

**返回值**:
```typescript
Promise<string>  // 任务组ID，用于跟踪任务状态
```

**示例**:
```typescript
try {
    const taskGroupId = await StartAnalysisTasks("conn_001", ["users", "orders"]);
    console.log("分析任务已启动:", taskGroupId);
    // 输出: "analysis_conn_001_1703123456"
} catch (error) {
    console.error("启动分析任务失败:", error.message);
}
```

### 3.2 获取任务状态

**接口**: `GetTaskStatus(taskID: string): Promise<TaskStatusInfo>`

**功能**: 获取指定任务的详细状态信息

**参数**:
```typescript
taskID: string  // 任务ID
```

**返回值**:
```typescript
Promise<TaskStatusInfo>

interface TaskStatusInfo {
    id: string;                    // 任务ID
    tableName: string;             // 表名
    databaseId: string;            // 数据库ID
    status: TaskStatus;            // 任务状态
    progress: number;              // 进度 (0-100)
    errorMessage?: string;         // 错误信息
    startedAt: Date;               // 开始时间
    completedAt?: Date;            // 完成时间
    duration: number;              // 执行时长(毫秒)
}

type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
```

### 3.3 获取数据库任务列表

**接口**: `GetTasksByDatabase(databaseID: string): Promise<TaskStatusInfo[]>`

**功能**: 获取指定数据库的所有任务状态

**参数**:
```typescript
databaseID: string  // 数据库ID
```

**返回值**:
```typescript
Promise<TaskStatusInfo[]>  // 任务状态信息数组
```

### 3.4 取消任务

**接口**: `CancelTask(taskID: string): Promise<void>`

**功能**: 取消指定的分析任务

**参数**:
```typescript
taskID: string  // 要取消的任务ID
```

---

## 4. 分析结果接口

### 4.1 获取分析结果

**接口**: `GetAnalysisResults(connectionID: string): Promise<AnalysisResult[]>`

**功能**: 获取指定连接的分析结果列表

**参数**:
```typescript
connectionID: string  // 数据库连接ID，空字符串表示获取所有结果
```

**返回值**:
```typescript
Promise<AnalysisResult[]>

interface AnalysisResult {
    id: string;                    // 结果ID
    databaseId: string;            // 数据库ID
    databaseName: string;          // 数据库名称
    tableName: string;             // 表名
    rules: string[];               // 应用的规则列表
    results: Record<string, any>;  // 分析结果数据
    status: string;                // 状态
    startedAt: Date;               // 开始时间
    completedAt?: Date;            // 完成时间
    duration: number;              // 执行时长(毫秒)
}
```

**示例**:
```typescript
const results = await GetAnalysisResults("conn_001");
results.forEach(result => {
    console.log(`表 ${result.tableName} 的分析结果:`, result.results);
    // 输出示例:
    // {
    //   "row_count": 1000,
    //   "non_null_rate": {
    //     "id": 1.0,
    //     "name": 0.95,
    //     "email": 0.87
    //   }
    // }
});
```

### 4.2 删除分析结果

**接口**: `DeleteAnalysisResult(resultID: string): Promise<void>`

**功能**: 删除指定的分析结果

**参数**:
```typescript
resultID: string  // 要删除的结果ID
```

### 4.3 获取可用规则列表

**接口**: `GetAvailableRules(): Promise<string[]>`

**功能**: 获取当前系统支持的分析规则列表

**返回值**:
```typescript
Promise<string[]>  // 规则名称数组
// 示例: ["row_count", "non_null_rate"]
```

---

## 5. 配置管理接口

### 5.1 获取当前应用配置

**接口**: (通过 App 结构体的状态获取)

**功能**: 获取应用的当前运行状态和配置

**注意**: 这是通过状态访问，不是独立的接口

---

## 6. 系统工具接口

### 6.1 问候接口

**接口**: `Greet(name: string): Promise<string>`

**功能**: 系统测试接口，返回问候语

**参数**:
```typescript
name: string  // 名称
```

**返回值**:
```typescript
Promise<string>  // 问候语
// 示例: "Hello Linus, It's show time!"
```

---

## 错误处理规范

### 1. 错误类型

所有接口在失败时都会抛出异常，错误信息采用中文描述：

```typescript
try {
    const result = await SomeApi();
} catch (error) {
    // error.message 包含具体的错误描述
    console.error("操作失败:", error.message);
}
```

### 2. 常见错误码

- **连接错误**: "连接失败: 具体错误原因"
- **权限错误**: "权限不足: 具体原因"
- **配置错误**: "配置错误: 具体问题"
- **状态错误**: "当前状态不允许此操作"
- **数据错误**: "数据格式错误或缺失"

### 3. 前端错误处理建议

```typescript
// 统一错误处理函数
const handleApiError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    toast.error(message);
    console.error('API Error:', error);
};

// 使用示例
try {
    await ConnectDatabase(config);
    toast.success("连接成功");
} catch (error) {
    handleApiError(error);
}
```

---

## 接口调用示例

### 完整的数据库连接和分析流程

```typescript
// 1. 测试连接
const config = {
    name: "生产数据库",
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "root",
    password: "password",
    database: "production",
    concurrency: 5
};

await TestDatabaseConnection(config);

// 2. 保存连接
config.id = Date.now().toString();
await SaveDatabaseConnection(config);

// 3. 建立连接
await ConnectDatabase(config);

// 4. 获取表列表
const tables = await GetTables();
console.log("可用表:", tables);

// 5. 选择要分析的表
const selectedTables = ["users", "orders"];
await SaveTableSelections(selectedTables);

// 6. 启动分析任务
const taskGroupId = await StartAnalysisTasks(config.id, selectedTables);

// 7. 监控任务进度
const checkProgress = async () => {
    const tasks = await GetTasksByDatabase(config.id);
    const completedTasks = tasks.filter(t => t.status === "completed");

    if (completedTasks.length === selectedTables.length) {
        console.log("所有分析任务完成");
        // 8. 获取分析结果
        const results = await GetAnalysisResults(config.id);
        console.log("分析结果:", results);
    } else {
        setTimeout(checkProgress, 1000); // 1秒后再次检查
    }
};

checkProgress();
```

---

## 性能考虑

### 1. 并发控制
- 分析任务通过 `concurrency` 参数控制并发数
- 默认并发度为 5，可根据数据库性能调整
- 避免过多并发导致数据库压力过大

### 2. 数据传输优化
- 大量数据采用分页处理
- JSON 数据压缩传输
- 避免不必要的数据传输

### 3. 缓存策略
- 表元数据可以适当缓存
- 连接状态在应用生命周期内保持
- 分析结果持久化存储

### 4. 查询性能优化
- **非空值率分析**: 从 2N+1 次查询优化为 1 次查询
- **MySQL布尔表达式**: 利用 `AVG(column IS NULL)` 特性
- **大表分析**: 显著提升多列数据表的性能表现

---

## 扩展性设计

### 1. 版本兼容性
- 新接口保持向后兼容
- 废弃接口逐步迁移
- 接口版本通过参数控制

### 2. 参数扩展
- 接口参数采用可选设计
- 新增参数不影响现有调用
- 配置参数支持 JSON 格式

### 3. 返回值扩展
- 返回对象预留扩展字段
- 新增字段不影响现有解析
- 支持多种返回格式

这个 API 文档为 Mole 应用的前后端交互提供了完整的接口规范，确保开发团队能够正确使用和维护这些接口。