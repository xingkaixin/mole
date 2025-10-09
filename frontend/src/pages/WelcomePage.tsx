import { Filter, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { DatabaseCard } from "@/components/database-card";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { DatabaseConfig } from "@/types";
import { createLogger } from "@/lib/logger";
import { getDatabaseTypeLabel } from "@/lib/databaseTypes";

interface WelcomePageProps {
	connections: DatabaseConfig[];
	onAddConnection: () => void;
	onEditConnection: (connection: DatabaseConfig) => void;
	onDeleteConnection: (connectionId: string) => void;
	onSelectConnection: (connection: DatabaseConfig) => void;
	onDuplicateConnection: (connection: DatabaseConfig) => void;
	onUpdateMetadata: (connectionId: string) => void;
}

export function WelcomePage({
	connections,
	onAddConnection,
	onEditConnection,
	onDeleteConnection,
	onSelectConnection: _onSelectConnection,
	onDuplicateConnection,
	onUpdateMetadata,
}: WelcomePageProps) {
	// 创建欢迎页面日志记录器
	const logger = createLogger('WelcomePage');

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [connectionToDelete, setConnectionToDelete] =
		useState<DatabaseConfig | null>(null);

	// 过滤状态
	const [filters, setFilters] = useState({
		searchText: "", // 通用搜索文本（别名、主机、数据库名）
		type: "all", // 数据库类型
	});

	// 获取所有唯一的数据库类型
const databaseTypes = useMemo(() => {
    const types = [...new Set(connections.map((conn) => conn.type))];
		return types.filter(Boolean);
	}, [connections]);

	// 过滤逻辑
	const filteredConnections = useMemo(() => {
		return connections.filter((connection) => {
			// 通用搜索：匹配别名、主机地址、数据库名
			const searchMatch =
				!filters.searchText ||
				connection.name
					.toLowerCase()
					.includes(filters.searchText.toLowerCase()) ||
				connection.host
					.toLowerCase()
					.includes(filters.searchText.toLowerCase()) ||
				connection.database
					.toLowerCase()
					.includes(filters.searchText.toLowerCase());

			// 类型过滤
			const typeMatch =
				filters.type === "all" || connection.type === filters.type;

			return searchMatch && typeMatch;
		});
	}, [connections, filters]);

	const _handleDeleteClick = (connection: DatabaseConfig) => {
		logger.info('删除对话框', `打开删除确认对话框 - 连接: ${connection.name}`);
		setConnectionToDelete(connection);
		setDeleteDialogOpen(true);
	};

	const handleConfirmDelete = () => {
		if (connectionToDelete?.id) {
			logger.info('确认删除', `删除数据库连接 - ${connectionToDelete.name}`);
			onDeleteConnection(connectionToDelete.id);
		}
		setDeleteDialogOpen(false);
		setConnectionToDelete(null);
	};

	const handleCancelDelete = () => {
		setDeleteDialogOpen(false);
		setConnectionToDelete(null);
	};

	const clearFilters = () => {
		logger.info('清除过滤器', '清除所有搜索和类型过滤器');
		setFilters({ searchText: "", type: "all" });
	};

	const hasActiveFilters = filters.searchText || filters.type !== "all";

	return (
		<div className="p-8">
			{/* Header */}
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2 text-balance">数据探查工具</h1>
				<p className="text-muted-foreground text-pretty">
					管理数据库连接、执行分析任务并查看详细报告
				</p>
			</div>

			{/* Filters Section */}
			{connections && connections.length > 0 && (
				<div className="mb-6 p-4 bg-card border border-border rounded-lg">
					<div className="flex items-center gap-2 mb-4">
						<Filter className="w-4 h-4" />
						<h3 className="font-medium">筛选条件</h3>
						{hasActiveFilters && (
							<Button
								variant="ghost"
								size="sm"
								onClick={clearFilters}
								className="ml-auto"
							>
								清除筛选
							</Button>
						)}
					</div>

					<div className="flex flex-col sm:flex-row gap-3">
						{/* 通用搜索 */}
						<div className="flex-1">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
								<Input
									placeholder="搜索别名、主机地址、数据库名..."
									value={filters.searchText}
									onChange={(e) =>
										setFilters((prev) => ({
											...prev,
											searchText: e.target.value,
										}))
									}
									className="pl-10"
								/>
							</div>
						</div>

						{/* 数据库类型筛选 */}
						<div className="w-full sm:w-48">
							<Select
								value={filters.type}
								onValueChange={(value) =>
									setFilters((prev) => ({ ...prev, type: value }))
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="数据库类型" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">全部类型</SelectItem>
                  {databaseTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getDatabaseTypeLabel(type)}
                    </SelectItem>
                  ))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* 筛选结果统计 */}
					{hasActiveFilters && (
						<div className="mt-3 text-sm text-muted-foreground">
							找到 {filteredConnections.length} 个匹配项，共{" "}
							{connections.length} 个连接
						</div>
					)}
				</div>
			)}

			{/* Database Connections Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{!connections || connections.length === 0 ? (
					<button
						type="button"
						onClick={() => {
							logger.click('添加数据库连接');
							onAddConnection();
						}}
						className="aspect-square border-2 border-dashed border-border rounded-lg flex items-center justify-center hover:border-primary hover:bg-secondary/50 transition-colors group"
					>
						<div className="text-center">
							<div className="w-20 h-20 rounded-full border-2 border-dashed border-muted-foreground group-hover:border-primary mx-auto mb-4 flex items-center justify-center transition-colors">
								<Plus className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
							</div>
							<p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
								添加数据库连接
							</p>
						</div>
					</button>
				) : filteredConnections.length === 0 && hasActiveFilters ? (
					<div className="col-span-full text-center py-12">
						<div className="text-muted-foreground mb-4">
							<Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
							<p>没有找到匹配的数据库连接</p>
							<p className="text-sm">尝试调整筛选条件</p>
						</div>
						<Button variant="outline" onClick={clearFilters}>
							清除筛选条件
						</Button>
					</div>
				) : (
					<>
						{filteredConnections.map((connection) => (
							<DatabaseCard
								key={connection.id}
								connection={connection}
								onEdit={onEditConnection}
								onDelete={onDeleteConnection}
								onDuplicate={onDuplicateConnection}
								onUpdateMetadata={onUpdateMetadata}
							/>
						))}
						<button
							type="button"
							onClick={() => {
								logger.click('添加数据库连接');
								onAddConnection();
							}}
							className="aspect-square border-2 border-dashed border-border rounded-lg flex items-center justify-center hover:border-primary hover:bg-secondary/50 transition-colors group"
						>
							<div className="text-center">
								<div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground group-hover:border-primary mx-auto mb-3 flex items-center justify-center transition-colors">
									<Plus className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
								</div>
								<p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
									添加连接
								</p>
							</div>
						</button>
					</>
				)}
			</div>

			{/* Delete Confirmation Dialog */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>确认删除</DialogTitle>
						<DialogDescription>
							确定要删除连接 "{connectionToDelete?.name}" 吗？此操作无法撤销。
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={handleCancelDelete}>
							取消
						</Button>
						<Button variant="destructive" onClick={handleConfirmDelete}>
							删除
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
