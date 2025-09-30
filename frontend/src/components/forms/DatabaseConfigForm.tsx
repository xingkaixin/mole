import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { DatabaseConfig } from "@/types";

interface DatabaseConfigFormProps {
  config: DatabaseConfig;
  isAdding: boolean;
  onConfigChange: (field: keyof DatabaseConfig, value: string | number) => void;
  onTestConnection: () => void;
  onSaveConnection: () => void;
  onBack: () => void;
  connectionStatus: string;
}

export function DatabaseConfigForm({
  config,
  isAdding,
  onConfigChange,
  onTestConnection,
  onSaveConnection,
  onBack,
  connectionStatus
}: DatabaseConfigFormProps) {
  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          {isAdding ? "添加数据库连接" : "编辑数据库连接"}
        </h2>
        <Button variant="outline" onClick={onBack}>
          返回
        </Button>
      </div>

      <div className="space-y-4">
        {/* 连接名称 */}
        <div>
          <label className="text-sm font-medium">连接名称</label>
          <Input
            value={config.name}
            onChange={(e) => onConfigChange("name", e.target.value)}
            placeholder="输入连接别名"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">数据库类型</label>
            <Input
              value={config.type}
              onChange={(e) => onConfigChange("type", e.target.value)}
              disabled
            />
          </div>
          <div>
            <label className="text-sm font-medium">主机地址</label>
            <Input
              value={config.host}
              onChange={(e) => onConfigChange("host", e.target.value)}
              placeholder="localhost"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">端口</label>
            <Input
              type="number"
              value={config.port}
              onChange={(e) => onConfigChange("port", parseInt(e.target.value) || 3306)}
              placeholder="3306"
            />
          </div>
          <div>
            <label className="text-sm font-medium">数据库名</label>
            <Input
              value={config.database}
              onChange={(e) => onConfigChange("database", e.target.value)}
              placeholder="database_name"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">用户名</label>
            <Input
              value={config.username}
              onChange={(e) => onConfigChange("username", e.target.value)}
              placeholder="root"
            />
          </div>
          <div>
            <label className="text-sm font-medium">密码</label>
            <Input
              type="password"
              value={config.password}
              onChange={(e) => onConfigChange("password", e.target.value)}
              placeholder="password"
            />
          </div>
        </div>

        {connectionStatus && (
          <div className={`p-3 rounded text-sm ${
            connectionStatus.includes("成功") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}>
            {connectionStatus}
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <Button onClick={onTestConnection} variant="outline">
            测试连接
          </Button>
          <Button onClick={onSaveConnection}>
            {isAdding ? "保存连接" : "更新连接"}
          </Button>
        </div>
      </div>
    </Card>
  );
}