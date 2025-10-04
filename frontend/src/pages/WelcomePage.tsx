import { Plus } from "lucide-react";
import { useState } from "react";
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
import type { DatabaseConfig } from "@/types";

interface WelcomePageProps {
	connections: DatabaseConfig[];
	onAddConnection: () => void;
	onEditConnection: (connection: DatabaseConfig) => void;
	onDeleteConnection: (connectionId: string) => void;
	onSelectConnection: (connection: DatabaseConfig) => void;
	onDuplicateConnection: (connection: DatabaseConfig) => void;
}

export function WelcomePage({
	connections,
	onAddConnection,
	onEditConnection,
	onDeleteConnection,
	onSelectConnection: _onSelectConnection,
	onDuplicateConnection,
}: WelcomePageProps) {
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [connectionToDelete, setConnectionToDelete] =
		useState<DatabaseConfig | null>(null);

	const _handleDeleteClick = (connection: DatabaseConfig) => {
		setConnectionToDelete(connection);
		setDeleteDialogOpen(true);
	};

	const handleConfirmDelete = () => {
		console.log("Confirm delete:", connectionToDelete);
		if (connectionToDelete?.id) {
			onDeleteConnection(connectionToDelete.id);
		}
		setDeleteDialogOpen(false);
		setConnectionToDelete(null);
	};

	const handleCancelDelete = () => {
		setDeleteDialogOpen(false);
		setConnectionToDelete(null);
	};

	return (
		<div className="p-8">
			{/* Header */}
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2 text-balance">
					数据探查工具 - 帮助您快速分析数据库表结构、数据质量和业务规则
				</h1>
				<p className="text-muted-foreground text-pretty">
					管理数据库连接、执行分析任务并查看详细报告
				</p>
			</div>

			{/* Database Connections Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{!connections || connections.length === 0 ? (
					<button
						type="button"
						onClick={onAddConnection}
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
				) : (
					<>
						{connections.map((connection) => (
							<DatabaseCard
								key={connection.id}
								connection={connection}
								onEdit={onEditConnection}
								onDelete={onDeleteConnection}
								onDuplicate={onDuplicateConnection}
							/>
						))}
						<button
							type="button"
							onClick={onAddConnection}
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
