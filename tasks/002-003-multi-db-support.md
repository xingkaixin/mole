# 功能扩展 - 多数据库支持

## 目标
扩展支持PostgreSQL数据库

## 功能范围
- ✅ PostgreSQL数据库连接
- ✅ PostgreSQL表结构查询
- ✅ PostgreSQL数据类型适配

## 技术实现
### 前端
1. 数据库类型选择
   - MySQL
   - PostgreSQL
2. 动态表单
   - 根据数据库类型显示相应字段

### 后端
1. 数据库驱动管理
   - MySQL: `github.com/go-sql-driver/mysql`
   - PostgreSQL: `github.com/lib/pq`
2. 连接字符串构建
   - MySQL: `user:password@tcp(host:port)/dbname`
   - PostgreSQL: `postgres://user:password@host:port/dbname?sslmode=disable`
3. 表结构查询适配
   - MySQL: `SHOW TABLES`
   - PostgreSQL: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`

## 关键约束
- 保持现有MySQL功能不变
- 统一的数据库接口抽象
- 错误处理适配不同数据库

## 验收标准
- [ ] 能成功连接PostgreSQL数据库
- [ ] 能获取PostgreSQL表清单
- [ ] 能对PostgreSQL表进行数据总量统计
- [ ] 能对PostgreSQL表进行空值率检查
- [ ] 能对PostgreSQL表进行唯一性检查