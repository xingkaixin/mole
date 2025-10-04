import { Database, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Task {
	id: string;
	tableName: string;
	databaseId: string;
	status: "pending" | "running" | "completed" | "failed" | "cancelled";
	progress: number;
	errorMessage?: string;
	startedAt?: string;
	completedAt?: string;
	duration?: number;
}

interface DatabaseTask {
	databaseId: string;
	databaseName: string;
	tasks: Task[];
}

interface TaskProgressPageProps {
	onGetTasksByDatabase: (databaseId: string) => Promise<any[]>;
	onGetDatabaseConnections: () => Promise<any[]>;
	onCancelTask: (taskId: string) => Promise<void>;
	onGoToReports: () => void;
	onGoHome: () => void;
}

export function TaskProgressPage({
	onGetTasksByDatabase,
	onGetDatabaseConnections,
	onCancelTask,
	onGoToReports,
	onGoHome,
}: TaskProgressPageProps) {
	const [databaseTasks, setDatabaseTasks] = useState<DatabaseTask[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [_connections, setConnections] = useState<any[]>([]);

	// 获取数据库连接信息
	const fetchConnections = useCallback(async () => {
		try {
			const connData = await onGetDatabaseConnections();
			setConnections(connData || []);
		} catch (error) {
			console.error("Failed to fetch connections:", error);
		}
	}, [onGetDatabaseConnections]);

	// 获取所有数据库的任务
	const fetchAllTasks = useCallback(async () => {
		try {
			setIsLoading(true);
			const connData = await onGetDatabaseConnections();
			const dbTasks: DatabaseTask[] = [];

			for (const conn of connData) {
				const tasksData = await onGetTasksByDatabase(conn.id);
				const formattedTasks: Task[] = tasksData.map((task: any) => ({
					id: task.id,
					tableName: task.tableName,
					databaseId: task.databaseId,
					status: task.status,
					progress: task.progress,
					errorMessage: task.errorMessage,
					startedAt: task.startedAt,
					completedAt: task.completedAt,
					duration: task.duration,
				}));

				// 只显示有任务的数据库
				if (formattedTasks.length > 0) {
					dbTasks.push({
						databaseId: conn.id,
						databaseName: conn.name,
						tasks: formattedTasks,
					});
				}
			}

			setDatabaseTasks(dbTasks);
		} catch (error) {
			console.error("Failed to fetch tasks:", error);
		} finally {
			setIsLoading(false);
		}
	}, [onGetTasksByDatabase, onGetDatabaseConnections]);

	// 初始化加载
	useEffect(() => {
		fetchConnections();
		fetchAllTasks();
	}, [fetchConnections, fetchAllTasks]);

	// 设置定时轮询，每3秒更新一次任务状态
	useEffect(() => {
		const hasActiveTasks = databaseTasks.some((db) =>
			db.tasks.some(
				(task) => task.status === "running" || task.status === "pending",
			),
		);

		if (!hasActiveTasks) return;

		const interval = setInterval(() => {
			fetchAllTasks();
		}, 3000);

		return () => clearInterval(interval);
	}, [databaseTasks, fetchAllTasks]);

	// 取消任务
	const handleCancelTask = async (taskId: string) => {
		try {
			await onCancelTask(taskId);
			fetchAllTasks();
		} catch (error) {
			console.error("Failed to cancel task:", error);
		}
	};

	// 刷新所有任务
	const handleRefresh = () => {
		fetchAllTasks();
	};

	// 格式化状态文本
	const getStatusText = (status: string) => {
		switch (status) {
			case "pending":
				return "等待中";
			case "running":
				return "分析中";
			case "completed":
				return "已完成";
			case "failed":
				return "失败";
			case "cancelled":
				return "已取消";
			default:
				return "未知";
		}
	};

	// 获取状态颜色
	const getStatusBadgeVariant = (status: string) => {
		switch (status) {
			case "pending":
				return "secondary";
			case "running":
				return "default";
			case "completed":
				return "default";
			case "failed":
				return "destructive";
			case "cancelled":
				return "outline";
			default:
				return "secondary";
		}
	};

	// 获取状态颜色
	const _getStatusColor = (status: string) => {
		switch (status) {
			case "pending":
				return "text-gray-500";
			case "running":
				return "text-blue-600";
			case "completed":
				return "text-green-600";
			case "failed":
				return "text-red-600";
			case "cancelled":
				return "text-orange-600";
			default:
				return "text-gray-500";
		}
	};

	return (
		<div className="p-6 max-w-6xl mx-auto">
			{/* Header */}
			<div className="flex justify-between items-center mb-6">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">任务进度</h1>
					<p className="text-gray-600 mt-1">查看所有进行中和已完成的探查任务</p>
				</div>
				<div className="flex space-x-3">
					<Button variant="outline" onClick={handleRefresh}>
						<RefreshCw className="w-4 h-4 mr-2" />
						刷新
					</Button>
					<Button variant="outline" onClick={onGoToReports}>
						查看报告
					</Button>
					<Button variant="outline" onClick={onGoHome}>
						返回首页
					</Button>
				</div>
			</div>

			{isLoading ? (
				<div className="text-center py-12">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-lg">正在加载任务状态...</p>
				</div>
			) : databaseTasks.length === 0 ? (
				<Card className="p-12 text-center">
					<div className="text-gray-400 mb-4">
						<Database className="w-16 h-16 mx-auto" />
					</div>
					<h3 className="text-lg font-medium text-gray-900 mb-2">暂无任务</h3>
					<p className="text-gray-500 mb-4">当前没有进行中或待执行的分析任务</p>
					<Button onClick={onGoHome}>开始新的分析</Button>
				</Card>
			) : (
				<div className="space-y-6">
					{databaseTasks.map((dbTask) => (
						<Card key={dbTask.databaseId} className="p-6">
							<div className="flex items-center justify-between mb-4">
								<div className="flex items-center space-x-3">
									<Database className="w-5 h-5 text-blue-600" />
									<h2 className="text-xl font-semibold">
										{dbTask.databaseName}
									</h2>
									<Badge variant="outline">{dbTask.tasks.length} 个任务</Badge>
								</div>
							</div>

							<ScrollArea className="h-96">
								<div className="space-y-3">
									{dbTask.tasks.map((task) => (
										<Card key={task.id} className="p-4">
											<div className="flex items-center justify-between mb-3">
												<div className="flex items-center space-x-3">
													<span className="font-medium">{task.tableName}</span>
													<Badge variant={getStatusBadgeVariant(task.status)}>
														{getStatusText(task.status)}
													</Badge>
												</div>
												{(task.status === "running" ||
													task.status === "pending") && (
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleCancelTask(task.id)}
														className="text-red-600 hover:text-red-700 hover:bg-red-50"
													>
														<X className="w-4 h-4" />
													</Button>
												)}
											</div>

											<div className="space-y-2">
												<div className="flex justify-between text-sm text-gray-600">
													<span>进度</span>
													<span>{task.progress}%</span>
												</div>
												<Progress value={task.progress} className="h-2" />
											</div>

											{task.errorMessage && (
												<div className="mt-2 text-sm text-red-600">
													错误：{task.errorMessage}
												</div>
											)}

											{task.startedAt && (
												<div className="mt-2 text-xs text-gray-500">
													开始时间：{new Date(task.startedAt).toLocaleString()}
													{task.duration && (
														<span className="ml-3">
															耗时：{(task.duration / 1000).toFixed(1)}秒
														</span>
													)}
												</div>
											)}
										</Card>
									))}
								</div>
							</ScrollArea>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
