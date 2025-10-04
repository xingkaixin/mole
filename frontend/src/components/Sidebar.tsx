import { Home, Database, ListTodo, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  onAddConnection: () => void;
  onGoHome: () => void;
  onGoToReports: () => void;
  onGoToTasks: () => void;
}

export function Sidebar({
  onAddConnection,
  onGoHome,
  onGoToReports,
  onGoToTasks,
}: SidebarProps) {
  return (
    <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 space-y-4">
      {/* Home Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onGoHome}
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
        onClick={onGoToTasks}
        className="w-12 h-12 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
        title="任务管理"
      >
        <ListTodo className="w-5 h-5" />
      </Button>

      {/* Analysis Reports Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onGoToReports}
        className="w-12 h-12 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
        title="分析报告"
      >
        <FileText className="w-5 h-5" />
      </Button>
    </div>
  );
}
