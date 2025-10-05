## 开发方式
- 当技术资料不完整时，不要瞎猜，通过`context7`提供的资料回答，如果依然不确认，就说“抱歉，我无法回答这个问题。”
- 任何时候都要拆解任务，创建To-do List，明确每个任务的目标和步骤。
- 对于应用的测试，告诉我，我会去执行并测试

## About

**A modern Wails desktop app** featuring a modern stack:
- **React** for UI
- **TypeScript** for type safety
- **Shadcn UI** for accessible, themeable components
- **Biome** for code formatting and linting
- **Wails** for desktop app development
- **Go** for backend

## Development

```sh
# install dependencies
make deps

# run in development mode
make dev
```

## 项目结构

```
mole/
├── backend/                    # Go 后端代码
│   ├── app.go                 # 应用核心控制器
│   ├── analysis.go            # 分析引擎和规则
│   ├── connection_pool.go     # 数据库连接池
│   ├── database.go            # 数据库管理
│   ├── storage.go             # 本地存储管理
│   └── task.go                # 任务管理器
│   └── logger.go              # 日志模块
├── frontend/                   # React 前端代码
│   ├── src/
│   │   ├── components/        # 可复用组件
│   │   │   ├── ui/           # UI基础组件 (Shadcn UI)
│   │   │   ├── forms/        # 表单组件
│   │   │   │   ├── DatabaseConfigForm.tsx
│   │   │   │   └── TableSelectionForm.tsx
│   │   │   ├── add-table-dialog.tsx
│   │   │   ├── connection-dialog.tsx
│   │   │   ├── create-task-dialog.tsx
│   │   │   ├── database-card.tsx
│   │   │   ├── execution-logs-dialog.tsx
│   │   │   ├── AnalysisProgress.tsx
│   │   │   ├── AnalysisResultViewer.tsx
│   │   │   ├── ResultsTable.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── mode-toggle.tsx
│   │   │   └── theme-provider.tsx
│   │   ├── pages/            # 页面组件
│   │   │   ├── WelcomePage.tsx
│   │   │   ├── TablesPage.tsx
│   │   │   ├── TaskManagementPage.tsx
│   │   │   ├── TaskProgressPage.tsx
│   │   │   ├── AnalysisPage.tsx
│   │   │   ├── AnalysisTablesPage.tsx
│   │   │   ├── AnalysisReportsPage.tsx
│   │   │   ├── ResultsPage.tsx
│   │   │   └── ConfigPage.tsx
│   │   ├── types/            # TypeScript类型定义
│   │   │   └── index.ts
│   │   ├── lib/              # 工具函数
│   │   │   └── utils.ts
│   │   ├── App.tsx           # 应用主组件
│   │   ├── main.tsx          # 前端入口
│   │   └── global.css        # 全局样式
│   ├── wailsjs/              # Wails 自动生成的绑定代码
│   │   ├── go/backend/       # Go 后端API绑定
│   │   └── runtime/          # Wails 运行时
│   ├── package.json          # 前端依赖配置
│   ├── vite.config.ts        # Vite 构建配置
│   ├── tsconfig.json         # TypeScript 配置
│   ├── biome.json            # 代码格式化和检查配置
│   └── components.json       # Shadcn UI 配置
├── docs/                      # 文档
│   └── spec/                 # 技术规范文档
│       ├── 开发指南.md
│       ├── 技术架构文档.md
│       ├── API接口文档.md
│       ├── 数据库设计文档.md
│       ├── 部署指南.md
│       └── 功能链路说明文档.md
├── main.go                    # 应用入口
├── wails.json                 # Wails 应用配置
├── go.mod                     # Go 模块定义
├── go.sum                     # Go 依赖锁定文件
├── Makefile                   # 构建脚本
└── README.md                  # 项目说明
```


### 日志文件位置
通过检查日志文件，来排查问题
- macOS: `~/Library/Logs/mole/mole_YYYY-MM-DD.log`
- Windows: `%APPDATA%\mole\logs\mole_YYYY-MM-DD.log`
- Linux: `~/.local/share/mole/logs/mole_YYYY-MM-DD.log`

### 日志规范
参考 [开发指南](./docs/spec/开发指南.md##日志系统指南) 了解日志记录的最佳实践和规范。


## Key Frontend Libraries

This project utilizes a modern frontend stack:

- [**React**](https://react.dev/): A JavaScript library for building user interfaces.
- [**TypeScript**](https://www.typescriptlang.org/): A typed superset of JavaScript that compiles to plain JavaScript.
- [**Vite**](https://vitejs.dev/): A fast build tool and development server.
- [**Tailwind CSS**](https://tailwindcss.com/): A utility-first CSS framework for rapid UI development.
- [**Shadcn UI**](https://ui.shadcn.com/): A collection of re-usable UI components built with Radix UI and Tailwind CSS.
- [**Biome**](https://biomejs.dev/): A fast formatter and linter for web projects.
- [**Radix UI**](https://www.radix-ui.com/): Primitives for building accessible design systems and web applications.

### Common Shadcn UI Commands

Use the following commands (from the `frontend` directory) to add new Shadcn UI components:

```sh
bunx --bun shadcn@latest add button
bunx --bun shadcn@latest add input
bunx --bun shadcn@latest add card
# ...add any other supported component
```



## Makefile Commands

The project includes a `Makefile` to simplify common development tasks. Run `make help` to see all available commands. Here are some of a few key targets:

- `make dev`: Run the application in development mode with hot reloading.
- `make build-windows`: Build the application for Windows (64-bit).
- `make build-mac`: Build the application for macOS (universal).
- `make clean`: Clean build artifacts.
- `make deps`: Install frontend dependencies from `package.json`.
- `make lint`: Lint the frontend code using Biome.
- `make format`: Format the frontend code using Biome.
- `make check`: Check and apply automatic fixes to the frontend code using Biome.
