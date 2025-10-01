import { useState, useEffect } from "react";
import { AnalysisProgress } from "@/components/AnalysisProgress";
import { ModeToggle } from "@/components/mode-toggle";
import type { AnalysisTask } from "@/components/AnalysisProgress";

interface AnalysisPageProps {
	selectedTablesCount: number;
	selectedTables: string[];
}

export function AnalysisPage({ selectedTablesCount, selectedTables }: AnalysisPageProps) {
	const [tasks, setTasks] = useState<AnalysisTask[]>([]);

	// 基于实际选择的表创建任务
	useEffect(() => {
		// 这里应该从后端获取实时任务状态
		// 暂时基于选择的表创建任务
		const analysisTasks: AnalysisTask[] = selectedTables.map((tableName, index) => ({
			id: (index + 1).toString(),
			tableName: tableName,
			status: index === 0 ? "running" : "pending", // 第一个任务运行中，其他等待
			progress: index === 0 ? 50 : 0,
		}));
		setTasks(analysisTasks);
	}, [selectedTables]);

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
