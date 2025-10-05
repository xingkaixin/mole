"use client";

import {
	Copy,
	Database,
	Edit,
	MoreVertical,
	RefreshCw,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DatabaseConfig } from "@/types";
import { createLogger } from "@/lib/logger";

type DatabaseCardProps = {
	connection: DatabaseConfig;
	onEdit: (connection: DatabaseConfig) => void;
	onDelete: (id: string) => void;
	onDuplicate: (connection: DatabaseConfig) => void;
	onUpdateMetadata: (id: string) => void;
};

export function DatabaseCard({
	connection,
	onEdit,
	onDelete,
	onDuplicate,
	onUpdateMetadata,
}: DatabaseCardProps) {
	const [isUpdating, setIsUpdating] = useState(false);
	// 创建数据库卡片日志记录器
	const logger = createLogger('DatabaseCard');

	const handleDelete = () => {
		logger.info('删除连接', `删除数据库连接 - ${connection.name}`);
		onDelete(connection.id);
	};

	const handleUpdateMetadata = async () => {
		if (isUpdating) return; // 防止重复点击

		logger.info('更新元数据', `开始更新数据库元数据 - ${connection.name}`);
		setIsUpdating(true);
		toast.info(`正在更新 "${connection.name}" 的字典元数据...`, {
			description: "这可能需要几秒钟时间",
		});

		try {
			// 调用Go后端的UpdateDatabaseMetadata方法
			const { UpdateDatabaseMetadata } = await import(
				"../../wailsjs/go/backend/App"
			);
			const result = await UpdateDatabaseMetadata(connection.id);

			// 根据返回的状态显示相应的消息
			if (result.status === "success") {
				logger.info('元数据更新成功', `${connection.name} - ${result.message}`);
				toast.success(
					`"${result.connectionName || connection.name}" 字典更新成功`,
					{
						description: result.message,
						action: {
							label: "查看详情",
							onClick: () => {
								toast.info(`更新统计`, {
									description: `表数量: ${result.tableCount}, 列数量: ${result.columnCount}`,
								});
							},
						},
					},
				);
			} else {
				logger.error('元数据更新失败', `${connection.name} - ${result.message}`);
				toast.error(
					`"${result.connectionName || connection.name}" 字典更新失败`,
					{
						description: result.message,
						action: {
							label: "重试",
							onClick: handleUpdateMetadata,
						},
					},
				);
			}
		} catch (error) {
			console.error("更新字典失败:", error);
			const errorMessage = error instanceof Error ? error.message : "未知错误";
			logger.error('元数据更新异常', `${connection.name} - ${errorMessage}`);
			toast.error(`"${connection.name}" 字典更新失败`, {
				description: errorMessage,
				action: {
					label: "重试",
					onClick: handleUpdateMetadata,
				},
			});
		} finally {
			setIsUpdating(false);
		}
	};

	return (
		<div
			className={`bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors group relative ${
				isUpdating ? "ring-2 ring-primary/20" : ""
			}`}
		>
			{/* 更新状态指示器 */}
			{isUpdating && (
				<div className="absolute top-2 left-2 w-2 h-2 bg-primary rounded-full animate-pulse" />
			)}

			{/* Settings Menu */}
			<DropdownMenu>
				<DropdownMenuTrigger className="absolute top-4 right-4 w-8 h-8 rounded flex items-center justify-center hover:bg-secondary transition-colors">
					<MoreVertical className="w-4 h-4 text-muted-foreground" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={() => {
						logger.info('编辑连接', `编辑数据库连接 - ${connection.name}`);
						onEdit(connection);
					}}>
						<Edit className="w-4 h-4 mr-2" />
						编辑
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => {
						logger.info('复制连接', `复制数据库连接 - ${connection.name}`);
						onDuplicate(connection);
					}}>
						<Copy className="w-4 h-4 mr-2" />
						复制
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={handleUpdateMetadata}
						disabled={isUpdating}
					>
						<RefreshCw
							className={`w-4 h-4 mr-2 ${isUpdating ? "animate-spin" : ""}`}
						/>
						{isUpdating ? "更新中..." : "更新字典"}
					</DropdownMenuItem>
					<DropdownMenuItem className="text-destructive" onClick={handleDelete}>
						<Trash2 className="w-4 h-4 mr-2" />
						删除
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Database Icon */}
			<div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
				<Database className="w-6 h-6 text-primary" />
			</div>

			{/* Connection Info */}
			<h3 className="text-lg font-semibold mb-2 text-balance">
				{connection.name}
			</h3>
			<div className="space-y-1 text-sm">
				<p className="text-muted-foreground">
					<span className="text-foreground font-medium">类型:</span>{" "}
					{connection.type}
				</p>
				<p className="text-muted-foreground">
					<span className="text-foreground font-medium">主机:</span>{" "}
					{connection.host}:{connection.port}
				</p>
				<p className="text-muted-foreground">
					<span className="text-foreground font-medium">数据库:</span>{" "}
					{connection.database}
				</p>
			</div>
		</div>
	);
}
