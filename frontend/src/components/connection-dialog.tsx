"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DatabaseConfig } from "@/types";

type ConnectionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection?: DatabaseConfig | null;
  onSave: (
    connection: DatabaseConfig | Omit<DatabaseConfig, "id">
  ) => void;
};

const DB_TYPES = [{ value: "MySQL", label: "MySQL", defaultPort: "3306" }];

export function ConnectionDialog({
  open,
  onOpenChange,
  connection,
  onSave,
}: ConnectionDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    type: "MySQL",
    host: "",
    port: 3306,
    database: "",
    username: "",
    password: "",
    concurrency: 5,
  });

  useEffect(() => {
    if (connection) {
      setFormData({
        name: connection.name,
        type: connection.type,
        host: connection.host,
        port: connection.port,
        database: connection.database,
        username: connection.username,
        password: connection.password,
        concurrency: connection.concurrency || 5,
      });
    } else {
      setFormData({
        name: "",
        type: "MySQL",
        host: "",
        port: 3306,
        database: "",
        username: "",
        password: "",
        concurrency: 5,
      });
    }
  }, [connection, open]);

  const handleTypeChange = (type: string) => {
    const dbType = DB_TYPES.find((t) => t.value === type);
    setFormData({
      ...formData,
      type,
      port: dbType?.defaultPort ? parseInt(dbType.defaultPort, 10) : 3306,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (connection) {
      onSave({ ...formData, id: connection.id });
    } else {
      onSave(formData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {connection ? "编辑数据库连接" : "添加数据库连接"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">连接别名</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="例如: Production DB"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">数据库类型</Label>
            <Select
              value={formData.type}
              onValueChange={handleTypeChange}
              key={formData.type} // 强制重新渲染
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="选择数据库类型" />
              </SelectTrigger>
              <SelectContent>
                {DB_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="host">主机地址</Label>
              <Input
                id="host"
                value={formData.host}
                onChange={(e) =>
                  setFormData({ ...formData, host: e.target.value })
                }
                placeholder="例如: localhost"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">端口</Label>
              <Input
                id="port"
                value={formData.port}
                onChange={(e) =>
                  setFormData({ ...formData, port: Number(e.target.value) })
                }
                placeholder="3306"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="database">数据库名称</Label>
            <Input
              id="database"
              value={formData.database}
              onChange={(e) =>
                setFormData({ ...formData, database: e.target.value })
              }
              placeholder="例如: main_db"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              placeholder="数据库用户名"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              placeholder="数据库密码"
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit">{connection ? "保存" : "添加"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
