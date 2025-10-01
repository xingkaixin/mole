import { useState, useEffect } from "react";
import { AnalysisProgress } from "@/components/AnalysisProgress";
import { ModeToggle } from "@/components/mode-toggle";
import type { AnalysisTask } from "@/components/AnalysisProgress";

interface AnalysisPageProps {
	selectedTablesCount: number;
}

export function AnalysisPage({ selectedTablesCount }: AnalysisPageProps) {
	const [tasks, setTasks] = useState<AnalysisTask[]>([]);

	// 模拟任务数据
	useEffect(() => {
		// 这里应该从后端获取实时任务状态
		// 暂时使用模拟数据
		const mockTasks: AnalysisTask[] = [
			{
				id: "1",
				tableName: "users",
				status: "running",
				progress: 50,
			},
			{
				id: "2",
				tableName: "orders",
				status: "pending",
				progress: 0,
			},
		];
		setTasks(mockTasks);
	}, []);

	const handleCancelTask = (taskId: string) => {
		// 取消单个任务
		console.log("Cancelling task:", taskId);
	};

	const handleCancelAll = () => {
		// 取消所有任务
		console.log("Cancelling all tasks");
	};

	return (
		<div>
			<div className="flex justify-end mb-4">
				<ModeToggle />
			</div>
			<AnalysisProgress
				selectedTablesCount={selectedTablesCount}
				tasks={tasks}
				onCancelTask={handleCancelTask}
				onCancelAll={handleCancelAll}
			/>
		</div>
	);
}
