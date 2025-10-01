import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export interface AnalysisTask {
	id: string;
	tableName: string;
	status: "pending" | "running" | "completed" | "failed" | "cancelled";
	progress: number;
	errorMessage?: string;
}

interface AnalysisProgressProps {
	selectedTablesCount: number;
	tasks: AnalysisTask[];
	onCancelTask?: (taskId: string) => void;
	onCancelAll?: () => void;
}

export function AnalysisProgress({
	selectedTablesCount,
	tasks = [],
	onCancelTask,
	onCancelAll,
}: AnalysisProgressProps) {
	const [progress, setProgress] = useState(0);

	// 计算总体进度
	useEffect(() => {
		if (tasks.length === 0) {
			setProgress(0);
			return;
		}

		const completedTasks = tasks.filter(task => task.status === "completed").length;
		const totalTasks = tasks.length;
		const newProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
		setProgress(newProgress);
	}, [tasks]);

	// 统计任务状态
	const stats = {
		total: tasks.length,
		completed: tasks.filter(task => task.status === "completed").length,
		running: tasks.filter(task => task.status === "running").length,
		pending: tasks.filter(task => task.status === "pending").length,
		failed: tasks.filter(task => task.status === "failed").length,
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
	const getStatusColor = (status: string) => {
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
		<Card className="p-6 max-w-6xl mx-auto">
			<div className="flex justify-between items-center mb-6">
				<h2 className="text-2xl font-bold">正在分析数据</h2>
				{onCancelAll && (
					<Button variant="outline" onClick={onCancelAll}>
						取消所有任务
					</Button>
				)}
			</div>

			{/* 总体进度 */}
			<div className="mb-8">
				<div className="flex justify-between items-center mb-2">
					<span className="text-sm font-medium">总体进度</span>
					<span className="text-sm text-muted-foreground">
						{stats.completed}/{stats.total} 完成
					</span>
				</div>
				<Progress value={progress} className="h-2" />
			</div>

			{/* 任务统计 */}
			<div className="grid grid-cols-5 gap-4 mb-6">
				<div className="text-center">
					<div className="text-2xl font-bold text-gray-600">{stats.total}</div>
					<div className="text-sm text-muted-foreground">总任务</div>
				</div>
				<div className="text-center">
					<div className="text-2xl font-bold text-blue-600">{stats.running}</div>
					<div className="text-sm text-muted-foreground">进行中</div>
				</div>
				<div className="text-center">
					<div className="text-2xl font-bold text-green-600">{stats.completed}</div>
					<div className="text-sm text-muted-foreground">已完成</div>
				</div>
				<div className="text-center">
					<div className="text-2xl font-bold text-gray-500">{stats.pending}</div>
					<div className="text-sm text-muted-foreground">等待中</div>
				</div>
				<div className="text-center">
					<div className="text-2xl font-bold text-red-600">{stats.failed}</div>
					<div className="text-sm text-muted-foreground">失败</div>
				</div>
			</div>

			{/* 任务列表 */}
			{tasks.length > 0 ? (
				<div className="border rounded">
					<div className="bg-gray-50 px-4 py-2 border-b">
						<div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-600">
							<div className="col-span-6">表名</div>
							<div className="col-span-3 text-center">状态</div>
							<div className="col-span-2 text-center">进度</div>
							<div className="col-span-1 text-right">操作</div>
						</div>
					</div>
					<div className="max-h-96 overflow-y-auto">
						{tasks.map((task) => (
							<div
								key={task.id}
								className="px-4 py-3 border-b last:border-b-0 hover:bg-gray-50"
							>
								<div className="grid grid-cols-12 gap-4 items-center">
									{/* 表名 */}
									<div className="col-span-6">
										<span className="font-medium">{task.tableName}</span>
										{task.errorMessage && (
											<div className="text-xs text-red-500 mt-1">
												{task.errorMessage}
											</div>
										)}
									</div>

									{/* 状态 */}
									<div className="col-span-3 text-center">
										<span className={`text-sm ${getStatusColor(task.status)}`}>
											{getStatusText(task.status)}
										</span>
										{task.status === "running" && (
											<div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mx-auto mt-1"></div>
										)}
									</div>

									{/* 进度 */}
									<div className="col-span-2 text-center">
										<span className="text-sm">{task.progress}%</span>
									</div>

									{/* 操作 */}
									<div className="col-span-1 text-right">
										{task.status === "running" && onCancelTask && (
											<Button
												variant="outline"
												size="sm"
												onClick={() => onCancelTask(task.id)}
												className="text-red-600 hover:text-red-700 hover:bg-red-50"
											>
												取消
											</Button>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			) : (
				<div className="text-center py-12">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-lg">正在分析 {selectedTablesCount} 个表...</p>
					<p className="text-sm text-muted-foreground mt-2">
						请稍候，这可能需要一些时间
					</p>
				</div>
			)}
		</Card>
	);
}
