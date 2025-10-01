import { useState, useEffect, useCallback } from "react";
import { AnalysisProgress } from "@/components/AnalysisProgress";
import { ModeToggle } from "@/components/mode-toggle";
import type { AnalysisTask } from "@/components/AnalysisProgress";

interface AnalysisPageProps {
	selectedTablesCount: number;
	selectedTables: string[];
	currentConnectionId: string;
	onGetTaskStatus: (taskId: string) => Promise<any>;
	onGetTasksByDatabase: (databaseId: string) => Promise<any[]>;
	onCancelTask: (taskId: string) => Promise<void>;
}

export function AnalysisPage({
	selectedTablesCount,
	selectedTables,
	currentConnectionId,
	onGetTaskStatus,
	onGetTasksByDatabase,
	onCancelTask,
}: AnalysisPageProps) {
	const [tasks, setTasks] = useState<AnalysisTask[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	// 获取任务状态的轮询函数
	const fetchTasks = useCallback(async () => {
		try {
			const tasksData = await onGetTasksByDatabase(currentConnectionId);
			const formattedTasks: AnalysisTask[] = tasksData.map((task: any) => ({
				id: task.id,
				tableName: task.tableName,
				status: task.status,
				progress: task.progress,
				errorMessage: task.errorMessage,
			}));
			setTasks(formattedTasks);
		} catch (error) {
			console.error("Failed to fetch tasks:", error);
		} finally {
			setIsLoading(false);
		}
	}, [currentConnectionId, onGetTasksByDatabase]);

	// 初始化加载任务状态
	useEffect(() => {
		if (currentConnectionId) {
			fetchTasks();
		}
	}, [fetchTasks, currentConnectionId]);

	// 设置定时轮询，每2秒更新一次任务状态
	useEffect(() => {
		if (tasks.length === 0) return;

		const hasActiveTasks = tasks.some(task =>
			task.status === "running" || task.status === "pending"
		);

		if (!hasActiveTasks) return;

		const interval = setInterval(() => {
			fetchTasks();
		}, 2000);

		return () => clearInterval(interval);
	}, [tasks, fetchTasks]);

	const handleCancelTask = async (taskId: string) => {
		try {
			await onCancelTask(taskId);
			// 立即刷新任务状态
			fetchTasks();
		} catch (error) {
			console.error("Failed to cancel task:", error);
		}
	};

	const handleCancelAll = async () => {
		const activeTasks = tasks.filter(task =>
			task.status === "running" || task.status === "pending"
		);

		for (const task of activeTasks) {
			try {
				await onCancelTask(task.id);
			} catch (error) {
				console.error(`Failed to cancel task ${task.id}:`, error);
			}
		}

		// 立即刷新任务状态
		fetchTasks();
	};

	return (
		<div>
			<div className="flex justify-end mb-4">
				<ModeToggle />
			</div>
			<AnalysisProgress
				selectedTablesCount={selectedTablesCount}
				tasks={tasks}
				isLoading={isLoading}
				onCancelTask={handleCancelTask}
				onCancelAll={handleCancelAll}
			/>
		</div>
	);
}
