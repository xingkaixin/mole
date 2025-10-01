import { Edit, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DatabaseConfig } from "@/types";

interface WelcomePageProps {
	connections: DatabaseConfig[];
	onAddConnection: () => void;
	onEditConnection: (connection: DatabaseConfig) => void;
	onDeleteConnection: (connectionId: string) => void;
	onSelectConnection: (connection: DatabaseConfig) => void;
}

export function WelcomePage({
	connections,
	onAddConnection,
	onEditConnection,
	onDeleteConnection,
	onSelectConnection,
}: WelcomePageProps) {
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [connectionToDelete, setConnectionToDelete] =
		useState<DatabaseConfig | null>(null);

	const handleDeleteClick = (connection: DatabaseConfig) => {
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
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
			<div className="max-w-6xl mx-auto">
				{/* Header */}
				<div className="text-center mb-12">
					<h1 className="text-4xl font-bold text-gray-900 mb-4">Mole</h1>
					<p className="text-xl text-gray-600 max-w-2xl mx-auto">
						数据探查工具 - 帮助您快速分析数据库表结构、数据质量和业务规则
					</p>
				</div>

				{/* Database Connections */}
				<div className="bg-white rounded-2xl shadow-lg p-8">
					<div className="mb-6">
						<h2 className="text-2xl font-semibold text-gray-900">数据库连接</h2>
					</div>

					{!connections || connections.length === 0 ? (
						<div className="text-center py-12">
							<button
								type="button"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									onAddConnection();
								}}
								className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer"
							>
								<Plus className="w-8 h-8 text-gray-600" />
							</button>
							<h3 className="text-lg font-medium text-gray-900 mb-2">
								暂无数据库连接
							</h3>
							<p className="text-gray-500">
								点击上方加号添加数据库连接以开始数据探查
							</p>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{connections.map((connection) => (
								<Card
									key={connection.id}
									className="p-4 cursor-pointer hover:shadow-md transition-shadow"
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										onSelectConnection(connection);
									}}
								>
									<div className="flex justify-between items-start mb-3">
										<div>
											<h3 className="font-semibold text-gray-900">
												{connection.name}
											</h3>
											<p className="text-sm text-gray-500 capitalize">
												{connection.type}
											</p>
										</div>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="sm"
													onClick={(e) => e.stopPropagation()}
												>
													<MoreHorizontal className="w-4 h-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem
													onClick={(e) => {
														e.stopPropagation();
														onEditConnection(connection);
													}}
												>
													<Edit className="w-4 h-4 mr-2" />
													编辑
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={(e) => {
														e.preventDefault();
														e.stopPropagation();
														handleDeleteClick(connection);
													}}
													className="text-red-600"
												>
													<Trash2 className="w-4 h-4 mr-2" />
													删除
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
									<div className="space-y-1 text-sm text-gray-600">
										<div>
											{connection.host}:{connection.port}
										</div>
										<div>{connection.database}</div>
										<div>{connection.username}</div>
									</div>
								</Card>
							))}
						</div>
					)}
				</div>
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
