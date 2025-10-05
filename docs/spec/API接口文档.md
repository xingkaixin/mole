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
### 2. 元数据管理接口
### 3. 任务管理接口
### 4. 分析任务接口
### 5. 分析结果接口
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

## 3. 元数据管理接口

### 3.1 更新数据库元数据

**接口**: `UpdateDatabaseMetadata(connectionID: string): Promise<MetadataUpdateResult>`

**功能**: 更新指定数据库连接的元数据信息，包括表和列的完整信息

**参数**:
```typescript
connectionID: string  // 数据库连接ID
```

**返回值**:
```typescript
Promise<MetadataUpdateResult>

interface MetadataUpdateResult {
    status: string;        // "success" 或 "failed"
    message: string;       // 操作结果描述
    connectionName?: string; // 连接名称
    tableCount?: number;   // 更新的表数量
    columnCount?: number;  // 更新的列数量
    duration?: number;     // 执行时长(毫秒)
}
```

**示例**:
```typescript
try {
    const result = await UpdateDatabaseMetadata("conn_001");
    if (result.status === "success") {
        console.log(`元数据更新成功: ${result.message}`);
        console.log(`更新了 ${result.tableCount} 个表，${result.columnCount} 个列`);
    }
} catch (error) {
    console.error("更新元数据失败:", error.message);
}
```

### 3.2 获取元数据表列表

**接口**: `GetMetadataTables(connectionID: string): Promise<MetadataTable[]>`

**功能**: 获取指定数据库连接的元数据表列表

**参数**:
```typescript
connectionID: string  // 数据库连接ID
```

**返回值**:
```typescript
Promise<MetadataTable[]>

interface MetadataTable {
    id: string;         // 表ID
    tableName: string;   // 表名
    comment: string;     // 表注释
    dataSize: number;   // 数据大小(字节)
    rowCount: number;   // 行数
    columnCount: number; // 列数
}
```

### 3.3 获取表列信息

**接口**: `GetMetadataColumns(tableID: string): Promise<MetadataColumn[]>`

**功能**: 获取指定表的列信息

**参数**:
```typescript
tableID: string  // 表ID
```

**返回值**:
```typescript
Promise<MetadataColumn[]>

interface MetadataColumn {
    id: string;           // 列ID
    columnName: string;   // 列名
    columnComment: string; // 列注释
    columnOrdinal: number; // 列序号
    columnType: string;   // 列类型
}
```

---

## 4. 任务管理接口

### 4.1 创建任务

**接口**: `CreateTask(name: string, description: string): Promise<CreateTaskResult>`

**功能**: 创建新的分析任务

**参数**:
```typescript
name: string;         // 任务名称
description: string; // 任务描述 (可选，默认为空字符串)
```

**返回值**:
```typescript
Promise<CreateTaskResult>

interface CreateTaskResult {
    status: string;  // "success" 或 "failed"
    id?: string;    // 任务ID (创建成功时)
    message: string; // 操作结果描述
}
```

**示例**:
```typescript
try {
    const result = await CreateTask("用户数据分析", "分析用户表的相关数据");
    if (result.status === "success") {
        console.log("任务创建成功，ID:", result.id);
    }
} catch (error) {
    console.error("创建任务失败:", error.message);
}
```

### 4.2 获取所有任务

**接口**: `GetAllTasks(): Promise<Task[]>`

**功能**: 获取系统中所有任务的列表

**返回值**:
```typescript
Promise<Task[]>

interface Task {
    id: string;          // 任务ID
    name: string;        // 任务名称
    description: string; // 任务描述
    status: string;      // 任务状态
    createdAt: string;   // 创建时间
    updatedAt: string;   // 更新时间
    tables: TaskTable[]; // 任务关联的表
}
```

### 4.3 更新任务

**接口**: `UpdateTask(id: string, name: string, description: string): Promise<UpdateTaskResult>`

**功能**: 更新指定任务的信息

**参数**:
```typescript
id: string;          // 任务ID
name: string;        // 新的任务名称
description: string; // 新的任务描述
```

**返回值**:
```typescript
Promise<UpdateTaskResult>

interface UpdateTaskResult {
    status: string;  // "success" 或 "failed"
    message: string; // 操作结果描述
}
```

### 4.4 删除任务

**接口**: `DeleteTask(id: string): Promise<DeleteTaskResult>`

**功能**: 删除指定的任务

**参数**:
```typescript
id: string  // 任务ID
```

**返回值**:
```typescript
Promise<DeleteTaskResult>

interface DeleteTaskResult {
    status: string;  // "success" 或 "failed"
    message: string; // 操作结果描述
}
```

### 4.5 添加表到任务

**接口**: `AddTablesToTask(taskID: string, tableIDs: string[]): Promise<AddTablesResult>`

**功能**: 批量添加表到指定任务

**参数**:
```typescript
taskID: string;     // 任务ID
tableIDs: string[]; // 要添加的表ID数组
```

**返回值**:
```typescript
Promise<AddTablesResult>

interface AddTablesResult {
    status: string;  // "success" 或 "failed"
    message: string; // 操作结果描述
}
```

### 4.6 获取任务下的表

**接口**: `GetTaskTables(taskID: string): Promise<TaskTable[]>`

**功能**: 获取指定任务下的所有表

**参数**:
```typescript
taskID: string  // 任务ID
```

**返回值**:
```typescript
Promise<TaskTable[]>

interface TaskTable {
    id: string;             // 任务表关联ID
    taskID: string;          // 任务ID
    tableID: string;         // 表ID
    addedAt: string;         // 添加时间
    tblStatus: string;       // 表状态: "待分析" | "分析中" | "分析完成"
    connectionID: string;     // 连接ID
    connectionName: string;   // 连接名称
    tableName: string;        // 表名
    tableComment: string;     // 表注释
    rowCount: number;         // 行数
    tableSize: number;       // 表大小(字节)
    columnCount: number;     // 列数
}
```

### 4.7 从任务中移除表

**接口**: `RemoveTableFromTask(taskID: string, taskTableID: string): Promise<RemoveTableResult>`

**功能**: 从指定任务中移除表

**参数**:
```typescript
taskID: string;       // 任务ID
taskTableID: string;  // 任务表关联ID
```

**返回值**:
```typescript
Promise<RemoveTableResult>

interface RemoveTableResult {
    status: string;  // "success" 或 "failed"
    message: string; // 操作结果描述
}
```

### 4.8 启动任务分析

**接口**: `StartTaskAnalysis(taskID: string): Promise<StartAnalysisResult>`

**功能**: 启动指定任务的分析工作

**参数**:
```typescript
taskID: string  // 任务ID
```

**返回值**:
```typescript
Promise<StartAnalysisResult>

interface StartAnalysisResult {
    status: string;  // "success" 或 "failed"
    message: string; // 操作结果描述
}
```

### 4.9 取消表分析

**接口**: `CancelTableAnalysis(taskID: string, taskTableID: string): Promise<CancelAnalysisResult>`

**功能**: 取消指定表中正在进行的分析

**参数**:
```typescript
taskID: string;      // 任务ID
taskTableID: string; // 任务表关联ID
```

**返回值**:
```typescript
Promise<CancelAnalysisResult>

interface CancelAnalysisResult {
    status: string;  // "success" 或 "failed"
    message: string; // 操作结果描述
}
```

### 4.10 获取表分析结果

**接口**: `GetTableAnalysisResult(taskID: string, taskTableID: string): Promise<AnalysisResult>`

**功能**: 获取指定表中分析的基本结果

**参数**:
```typescript
taskID: string;      // 任务ID
taskTableID: string; // 任务表关联ID
```

**返回值**:
```typescript
Promise<AnalysisResult>

interface AnalysisResult {
    status: string;                           // 状态
    results: {
        row_count?: number;                   // 行数
        non_null_rate?: Record<string, number>; // 非空值率统计
    };
    tableName: string;                        // 表名
    databaseId: string;                       // 数据库ID
    startedAt: string;                        // 开始时间
    completedAt?: string;                     // 完成时间
    duration: number;                        // 执行时长(毫秒)
    rules: string[];                          // 应用的规则列表
}
```

### 4.11 获取增强的分析结果

**接口**: `GetEnhancedAnalysisResult(taskID: string, taskTableID: string): Promise<EnhancedAnalysisResult>`

**功能**: 获取指定表中分析的增强结果，包含完整的列信息

**参数**:
```typescript
taskID: string;      // 任务ID
taskTableID: string; // 任务表关联ID
```

**返回值**:
```typescript
Promise<EnhancedAnalysisResult>

interface EnhancedAnalysisResult {
    status: string;                           // 状态
    results: {
        row_count?: number;                   // 行数
        non_null_rate?: Record<string, number>; // 非空值率统计
    };
    tableName: string;                        // 表名
    tableComment: string;                     // 表注释
    columns: Array<{
        name: string;    // 列名
        type: string;    // 列类型
        comment: string; // 列注释
        ordinal: number; // 列序号
    }>;
    databaseId: string;                       // 数据库ID
    analysisStatus: string;                   // 分析状态
    startedAt: string;                        // 开始时间
    completedAt?: string;                     // 完成时间
    duration: number;                        // 执行时长(毫秒)
    rules: string[];                          // 应用的规则列表
}
```

### 4.12 获取所有连接的元数据信息

**接口**: `GetAllConnectionsWithMetadata(): Promise<ConnectionWithMetadata[]>`

**功能**: 获取所有数据库连接及其元数据信息，用于表选择对话框

**返回值**:
```typescript
Promise<ConnectionWithMetadata[]>

interface ConnectionWithMetadata {
    id: string;     // 连接ID
    name: string;   // 连接名称
    type: string;   // 数据库类型
    tables: Array<{
        id: string;         // 表ID
        name: string;       // 表名
        comment: string;     // 表注释
        rowCount: number;   // 行数
        tableSize: number;  // 表大小(字节)
        columnCount: number; // 列数
    }>;
}
```

### 4.13 记录前端用户操作日志

**接口**: `LogFrontendAction(module: string, action: string, details: string): Promise<void>`

**功能**: 记录前端用户操作到后端日志系统，实现前后端日志统一

**参数**:
```typescript
module: string;   // 模块名称 (如 "Sidebar", "DatabaseConfig")
action: string;   // 操作类型 (如 "click", "submit", "navigate")
details: string; // 详细信息
```

---

## 5. 分析结果接口

### 5.1 获取分析结果

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

### 5.2 删除分析结果

**接口**: `DeleteAnalysisResult(resultID: string): Promise<void>`

**功能**: 删除指定的分析结果

**参数**:
```typescript
resultID: string  // 要删除的结果ID
```

### 5.3 获取可用规则列表

**接口**: `GetAvailableRules(): Promise<string[]>`

**功能**: 获取当前系统支持的分析规则列表

**返回值**:
```typescript
Promise<string[]>  // 规则名称数组
// 示例: ["row_count", "non_null_rate"]
```

---

## 6. 系统工具接口

### 6.1 前端日志记录接口

**接口**: `LogFrontendAction(module: string, action: string, details: string): Promise<void>`

**功能**: 记录前端用户操作日志，用于用户行为分析和问题排查

**参数**:
```typescript
module: string;  // 功能模块名称，如 "DATABASE_CONFIG", "TASK_MANAGEMENT"
action: string;  // 操作类型，如 "TEST_CONNECTION", "CREATE_TASK"
details: string; // 操作详情，可包含具体参数和结果
```

**返回值**:
```typescript
Promise<void>
```

**示例**:
```typescript
// 记录数据库连接测试
await LogFrontendAction("DATABASE_CONFIG", "TEST_CONNECTION", "测试连接: test_db");

// 记录任务创建
await LogFrontendAction("TASK_MANAGEMENT", "CREATE_TASK", "创建任务: 用户数据分析");

// 记录分析启动
await LogFrontendAction("ANALYSIS", "START_ANALYSIS", "启动分析: task_001, 5个表");
```

### 6.2 获取所有连接及其元数据

**接口**: `GetAllConnectionsWithMetadata(): Promise<ConnectionWithMetadata[]>`

**功能**: 获取所有数据库连接及其关联的表元数据信息

**返回值**:
```typescript
Promise<ConnectionWithMetadata[]>

interface ConnectionWithMetadata {
    connection: DatabaseConfig;    // 连接配置
    tableCount: number;           // 表数量
    lastUpdated: string;          // 最后更新时间
    status: string;               // 元数据状态
}
```

### 6.3 问候接口

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

### 完整的数据库连接和元数据更新流程

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

// 3. 更新数据库元数据
const metadataResult = await UpdateDatabaseMetadata(config.id);
if (metadataResult.status === "success") {
    console.log(`元数据更新成功: 更新了 ${metadataResult.tableCount} 个表`);
}

// 4. 获取所有连接的元数据信息
const connections = await GetAllConnectionsWithMetadata();
console.log("所有连接及其表信息:", connections);
```

### 完整的任务管理和分析流程

```typescript
// 1. 创建分析任务
const taskResult = await CreateTask("用户数据分析", "分析用户表相关数据");
if (taskResult.status === "success") {
    const taskId = taskResult.id;
    console.log("任务创建成功，ID:", taskId);

    // 2. 获取连接的表信息
    const connections = await GetAllConnectionsWithMetadata();
    const userTableId = connections[0].tables.find(t => t.name === "users")?.id;

    if (userTableId) {
        // 3. 添加表到任务
        const addResult = await AddTablesToTask(taskId, [userTableId]);
        if (addResult.status === "success") {
            console.log("表添加成功");

            // 4. 启动任务分析
            const startResult = await StartTaskAnalysis(taskId);
            if (startResult.status === "success") {
                console.log("分析已启动");

                // 5. 监控任务进度
                const checkProgress = async () => {
                    const taskTables = await GetTaskTables(taskId);
                    const completedTable = taskTables.find(t => t.tblStatus === "分析完成");

                    if (completedTable) {
                        console.log("表分析完成:", completedTable.tableName);

                        // 6. 获取增强分析结果
                        const result = await GetEnhancedAnalysisResult(taskId, completedTable.id);
                        if (result.status === "success") {
                            console.log("分析结果:", result.results);
                            console.log("列信息:", result.columns);
                        }
                    } else {
                        setTimeout(checkProgress, 3000); // 3秒后再次检查
                    }
                };

                checkProgress();
            }
        }
    }
}

// 7. 获取所有任务
const allTasks = await GetAllTasks();
console.log("系统中的所有任务:", allTasks);
```

### 元数据管理示例

```typescript
// 1. 获取元数据表列表
const tables = await GetMetadataTables("conn_001");
console.log("元数据表:", tables);

// 2. 获取具体表的列信息
if (tables.length > 0) {
    const columns = await GetMetadataColumns(tables[0].id);
    console.log("表列信息:", columns);
}

// 3. 记录用户操作日志
await LogFrontendAction("TaskManager", "click", "用户点击了开始分析按钮");
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
- **查询取消机制**: context感知的SQL查询中断，120秒超时保护

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