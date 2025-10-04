"use client";

import { Copy, Database, Edit, MoreVertical, Trash2 } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DatabaseConfig } from "@/types";


type DatabaseCardProps = {
	connection: DatabaseConfig;
	onEdit: (connection: DatabaseConfig) => void;
	onDelete: (id: string) => void;
	onDuplicate: (connection: DatabaseConfig) => void;
};

export function DatabaseCard({
	connection,
	onEdit,
	onDelete,
	onDuplicate,
}: DatabaseCardProps) {
	const handleDelete = () => {
		onDelete(connection.id);
	};

	return (
		<div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors group relative">
			{/* Settings Menu */}
			<DropdownMenu>
				<DropdownMenuTrigger className="absolute top-4 right-4 w-8 h-8 rounded flex items-center justify-center hover:bg-secondary transition-colors">
					<MoreVertical className="w-4 h-4 text-muted-foreground" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={() => onEdit(connection)}>
						<Edit className="w-4 h-4 mr-2" />
						编辑
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => onDuplicate(connection)}>
						<Copy className="w-4 h-4 mr-2" />
						复制
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
