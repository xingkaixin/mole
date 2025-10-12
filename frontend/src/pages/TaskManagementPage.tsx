"use client";

import {
	Database as DatabaseIcon,
	FileText,
	Play,
	Plus,
	Search,
	X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AddTableDialog } from "@/components/add-table-dialog";
import { CreateTaskDialog } from "@/components/create-task-dialog";
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

interface TaskManagementPageProps {
	onNavigateToAnalysisDetail?: (result: any) => void;
}

export function TaskManagementPage({
	onNavigateToAnalysisDetail,
}: TaskManagementPageProps) {
	const [tasks, setTasks] = useState<Task[]>([]);
	const [connections, setConnections] = useState<any[]>([]);
	const [selectedTaskId, setSelectedTaskId] = useState<string>("");
	const [searchQuery, setSearchQuery] = useState("");
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [addTableDialogOpen, setAddTableDialogOpen] = useState(false);
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
			toast.error("加载连接失败", {
				description: error instanceof Error ? error.message : "未知错误",
			});
		}
	}, []);

	// 加载任务下的表
	const loadTaskTables = useCallback(async (taskId: string) => {
		try {
			const { GetTaskTables } = await import("../../wailsjs/go/backend/App");
			const result = await GetTaskTables(taskId);

			setTasks((prevTasks) =>
				prevTasks.map((task) =>
					task.id === taskId
						? { ...task, tables: result as TaskTable[] }
						: task,
				),
			);
		} catch (error) {
			toast.error("加载任务表失败", {
				description: error instanceof Error ? error.message : "未知错误",
			});
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

	// 添加状态轮询：定期刷新状态以保持数据一致性
	useEffect(() => {
		if (!selectedTaskId) return;

		const interval = setInterval(async () => {
			await loadTaskTables(selectedTaskId);
		}, 3000); // 每3秒刷新一次，确保状态同步

		return () => clearInterval(interval);
	}, [selectedTaskId, loadTaskTables]);

	const filteredTables = (selectedTask?.tables || []).filter(
		(table) =>
			table.tableName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			table.connectionName.toLowerCase().includes(searchQuery.toLowerCase()),
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

	const handleStartAnalysis = async () => {
		if (!selectedTask) return;

		try {
			const { StartTaskAnalysis } = await import(
				"../../wailsjs/go/backend/App"
			);
			const result = await StartTaskAnalysis(selectedTask.id);

			if (result.status === "success") {
				toast.success("开始分析", {
					description: result.message,
				});
				// 立即重新加载任务表以更新状态
				await loadTaskTables(selectedTask.id);
			} else {
				toast.error("开始分析失败", {
					description: result.message,
				});
				// 即使开始分析失败，也要刷新状态，以防状态有变化
				await loadTaskTables(selectedTask.id);
			}
		} catch (error) {
			console.error("开始分析失败:", error);
			toast.error("开始分析失败", {
				description: error instanceof Error ? error.message : "未知错误",
			});
		}
	};

	const handleCancelAnalysis = async (tableId: string) => {
		if (!selectedTask) return;

		try {
			const { CancelTableAnalysis } = await import(
				"../../wailsjs/go/backend/App"
			);
			const result = await CancelTableAnalysis(selectedTask.id, tableId);

			if (result.status === "success") {
				toast.success("取消分析", {
					description: result.message,
				});
				// 重新加载任务表以更新状态
				await loadTaskTables(selectedTask.id);
			} else {
				toast.error("取消分析失败", {
					description: result.message,
				});
			}
		} catch (error) {
			console.error("取消分析失败:", error);
			toast.error("取消分析失败", {
				description: error instanceof Error ? error.message : "未知错误",
			});
		}
	};

	const handleViewAnalysisDetail = async (tableId: string) => {
		if (!selectedTask) return;

		try {
			console.log("获取分析详情:", {
				taskId: selectedTask.id,
				tableId: tableId,
				note: "tableId应该是tasks_tbls.table_id",
			});

			const { GetTableAnalysisResult, GetEnhancedAnalysisResult } =
				await import("../../wailsjs/go/backend/App");

			// 直接获取增强的分析结果
			let result: any;
			try {
				console.log(
					"正在获取增强分析结果，taskId:",
					selectedTask.id,
					"tableId:",
					tableId,
				);
				const enhancedResult = await GetEnhancedAnalysisResult(
					selectedTask.id,
					tableId,
				);
				console.log("获取增强分析结果成功:", enhancedResult);
				result = enhancedResult;
			} catch (error) {
				console.warn("获取增强分析结果失败，回退到基本结果:", error);
				// 回退到基本结果
				const basicResult = await GetTableAnalysisResult(
					selectedTask.id,
					tableId,
				);
				console.log("获取基本分析结果成功:", basicResult);
				result = basicResult;
			}

			console.log("获取分析结果成功:", result);

			if (result.status === "success") {
				// 将结果存储到sessionStorage，供新页面使用
				sessionStorage.setItem("analysisResult", JSON.stringify(result));

				// 调用父组件的跳转函数
				if (onNavigateToAnalysisDetail) {
					onNavigateToAnalysisDetail(result);
				} else {
					// 如果没有提供跳转函数，提示用户
					toast.info("分析详情已准备就绪");
					console.log("分析详情已保存到sessionStorage，请实现页面跳转逻辑");
				}
			} else {
				console.error("后端返回错误:", result);
				toast.error("获取分析详情失败", {
					description: result.message,
				});
			}
		} catch (error) {
			console.error("获取分析详情失败:", error);
			toast.error("获取分析详情失败", {
				description: error instanceof Error ? error.message : "未知错误",
			});
		}
	};

	const formatSize = (size: number) => {
		if (size < 1024) return `${size} B`;
		if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
		if (size < 1024 * 1024 * 1024)
			return `${(size / (1024 * 1024)).toFixed(1)} MB`;
		return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
	};

	// 获取表状态的颜色
	const getStatusColor = (status: string) => {
		switch (status) {
			case "分析完成":
				return "bg-green-100 text-green-800";
			case "分析中":
				return "bg-blue-100 text-blue-800";
			case "待分析":
				return "bg-yellow-100 text-yellow-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
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
								<TableHead>状态</TableHead>
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
										<TableCell>
											<Badge
												className={getStatusColor(table.tblStatus || "待分析")}
											>
												{table.tblStatus || "待分析"}
											</Badge>
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
											<div className="flex gap-1 justify-end">
												{table.tblStatus === "分析中" ? (
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleCancelAnalysis(table.id)}
														className="text-red-600 hover:text-red-700 hover:bg-red-50"
													>
														<X className="w-4 h-4" />
													</Button>
												) : table.tblStatus === "分析完成" ? (
													<Button
														variant="ghost"
														size="sm"
														onClick={() =>
															handleViewAnalysisDetail(table.tableId)
														}
														title="查看分析详情"
													>
														<FileText className="w-4 h-4" />
													</Button>
												) : null}
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleRemoveTable(table.id)}
												>
													移除
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell
										colSpan={7}
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
				<AddTableDialog
					open={addTableDialogOpen}
					onOpenChange={setAddTableDialogOpen}
					onAddTables={handleAddTables}
					connections={connections}
					existingTableIds={selectedTask.tables?.map((t) => t.tableId) || []}
				/>
			)}
		</div>
	);
}
