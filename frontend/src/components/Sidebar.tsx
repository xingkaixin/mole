import { Home, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createLogger } from "@/lib/logger";

interface SidebarProps {
	onAddConnection: () => void;
	onGoHome: () => void;
	onGoToTasks: () => void;
}

export function Sidebar({
	onAddConnection: _onAddConnection,
	onGoHome,
	onGoToTasks,
}: SidebarProps) {
	// 创建侧边栏日志记录器
	const logger = createLogger('Sidebar');
	return (
		<div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 space-y-4">
			{/* Home Button */}
			<Button
				variant="ghost"
				size="icon"
				onClick={() => {
					logger.click('首页');
					onGoHome();
				}}
				className="w-12 h-12 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
				title="首页"
			>
				<Home className="w-5 h-5" />
			</Button>

			{/* Add Connection Button */}
			{/* <Button
				variant="ghost"
				size="icon"
				onClick={onAddConnection}
				className="w-12 h-12 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
				title="添加数据库连接"
			>
				<Database className="w-5 h-5" />
			</Button> */}

			{/* Task Progress Button */}
			<Button
				variant="ghost"
				size="icon"
				onClick={() => {
					logger.click('任务管理');
					onGoToTasks();
				}}
				className="w-12 h-12 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
				title="任务管理"
			>
				<ListTodo className="w-5 h-5" />
			</Button>
		</div>
	);
}
