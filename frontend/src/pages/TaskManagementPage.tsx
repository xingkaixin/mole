"use client";

import { Database as DatabaseIcon, Play, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AddTableDialog } from "@/components/add-table-dialog";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { ExecutionLogsDialog } from "@/components/execution-logs-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Task, TaskTable } from "@/types";

export function TaskManagementPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addTableDialogOpen, setAddTableDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  // 加载所有任务
  const loadTasks = useCallback(async () => {
    try {
      const { GetAllTasks } = await import("../../wailsjs/go/backend/App");
      const result = await GetAllTasks();

      const formattedTasks: Task[] = result.map((taskData: any) => ({
        ...taskData,
        tables: [], // 稍后加载
      }));

      setTasks(formattedTasks);

      // 如果有任务但没有选中的任务，选中第一个
      if (formattedTasks.length > 0 && !selectedTaskId) {
        setSelectedTaskId(formattedTasks[0].id);
      }
    } catch (error) {
      console.error("加载任务失败:", error);
      toast.error("加载任务失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedTaskId]);

  // 加载连接和表元数据
  const loadConnections = useCallback(async () => {
    try {
      const { GetAllConnectionsWithMetadata } = await import(
        "../../wailsjs/go/backend/App"
      );
      const result = await GetAllConnectionsWithMetadata();
      setConnections(result);
    } catch (error) {
      console.error("加载连接失败:", error);
    }
  }, []);

  // 加载任务下的表
  const loadTaskTables = useCallback(async (taskId: string) => {
    try {
      const { GetTaskTables } = await import("../../wailsjs/go/backend/App");
      const result = await GetTaskTables(taskId);

      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId ? { ...task, tables: result as TaskTable[] } : task
        )
      );
    } catch (error) {
      console.error("加载任务表失败:", error);
    }
  }, []);

  useEffect(() => {
    loadTasks();
    loadConnections();
  }, [loadConnections, loadTasks]);

  useEffect(() => {
    if (selectedTaskId) {
      loadTaskTables(selectedTaskId);
    }
  }, [selectedTaskId, loadTaskTables]);

  const filteredTables = (selectedTask?.tables || []).filter(
    (table) =>
      table.tableName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      table.connectionName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateTask = async (name: string) => {
    try {
      const { CreateTask } = await import("../../wailsjs/go/backend/App");
      const result = await CreateTask(name, "");

      if (result.status === "success") {
        await loadTasks(); // 重新加载任务列表
        setSelectedTaskId(result.id);
        setCreateDialogOpen(false);
        toast.success("任务创建成功");
      }
    } catch (error) {
      console.error("创建任务失败:", error);
      toast.error("创建任务失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    }
  };

  const handleAddTables = async (tableIds: string[]) => {
    if (!selectedTaskId) return;

    try {
      const { AddTablesToTask } = await import("../../wailsjs/go/backend/App");
      const result = await AddTablesToTask(selectedTaskId, tableIds);

      if (result.status === "success") {
        await loadTaskTables(selectedTaskId); // 重新加载任务表
        setAddTableDialogOpen(false);
        toast.success(result.message);
      }
    } catch (error) {
      console.error("添加表失败:", error);
      toast.error("添加表失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    }
  };

  const handleRemoveTable = async (tableId: string) => {
    if (!selectedTaskId) return;

    console.log("移除表:", {
      selectedTaskId,
      taskTableId: tableId,
      note: "tableId是tasks_tbls表的ID",
    });

    try {
      const { RemoveTableFromTask } = await import(
        "../../wailsjs/go/backend/App"
      );
      const result = await RemoveTableFromTask(selectedTaskId, tableId);

      console.log("移除结果:", result);

      if (result.status === "success") {
        await loadTaskTables(selectedTaskId); // 重新加载任务表
        toast.success(result.message);
      } else {
        toast.error("移除失败", {
          description: result.message || "未知错误",
        });
      }
    } catch (error) {
      console.error("移除表失败:", error);
      toast.error("移除表失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    }
  };

  const handleStartAnalysis = () => {
    if (!selectedTask) return;
    // TODO: 实现分析功能
    toast.info("分析功能开发中...");
  };

  const formatSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024)
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-balance">任务管理</h1>
          <p className="text-muted-foreground text-pretty">
            创建分析任务、添加表并执行分析
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          创建任务
        </Button>
      </div>

      {/* Task Selector and Actions */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex-1">
          <Select
            value={selectedTaskId}
            onValueChange={setSelectedTaskId}
            disabled={loading}
          >
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="选择任务" />
            </SelectTrigger>
            <SelectContent>
              {tasks.map((task) => (
                <SelectItem key={task.id} value={task.id}>
                  {task.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedTask && (
          <div className="flex gap-2">
            <Button
              onClick={() => setAddTableDialogOpen(true)}
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              添加表
            </Button>
            <Button
              onClick={handleStartAnalysis}
              disabled={
                !selectedTask.tables || selectedTask.tables.length === 0
              }
            >
              <Play className="w-4 h-4 mr-2" />
              开始分析
            </Button>
            <Button onClick={() => setLogsDialogOpen(true)} variant="outline">
              查看执行日志
            </Button>
          </div>
        )}
      </div>

      {/* Tables List */}
      {selectedTask && (
        <div className="bg-card border border-border rounded-lg">
          {/* Task Info */}
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">{selectedTask.name}</h3>
              <Badge variant="secondary">
                {selectedTask.tables?.length || 0} 个表
              </Badge>
            </div>
          </div>
          {/* Search */}
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索表名或连接名..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>数据库连接</TableHead>
                <TableHead>表名</TableHead>
                <TableHead className="text-right">行数</TableHead>
                <TableHead className="text-right">大小</TableHead>
                <TableHead className="text-right">列数</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTables.length > 0 ? (
                filteredTables.map((table) => (
                  <TableRow key={table.id}>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <DatabaseIcon className="w-3 h-3" />
                        {table.connectionName}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {table.tableName}
                    </TableCell>
                    <TableCell className="text-right">
                      {table.rowCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatSize(table.tableSize)}
                    </TableCell>
                    <TableCell className="text-right">
                      {table.columnCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTable(table.id)}
                      >
                        移除
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    {searchQuery ? "未找到匹配的表" : "暂无表，点击添加表开始"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && tasks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>请先创建一个任务</p>
        </div>
      )}

      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateTask={handleCreateTask}
      />

      {selectedTask && (
        <>
          <AddTableDialog
            open={addTableDialogOpen}
            onOpenChange={setAddTableDialogOpen}
            onAddTables={handleAddTables}
            connections={connections}
            existingTableIds={selectedTask.tables?.map((t) => t.tableId) || []}
          />
          <ExecutionLogsDialog
            open={logsDialogOpen}
            onOpenChange={setLogsDialogOpen}
            taskName={selectedTask.name}
            executions={[]} // TODO: 实现执行日志
          />
        </>
      )}
    </div>
  );
}
