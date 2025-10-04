"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type Table = {
	id: string;
	name: string;
	comment: string;
	rowCount: number;
	tableSize: number;
	columnCount: number;
};

type Connection = {
	id: string;
	name: string;
	type: string;
	tables: Table[];
};

type AddTableDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAddTables: (tableIds: string[]) => void;
	connections: Connection[];
	existingTableIds: string[];
};

export function AddTableDialog({
	open,
	onOpenChange,
	onAddTables,
	connections,
	existingTableIds,
}: AddTableDialogProps) {
	const [selectedConnection, setSelectedConnection] = useState("");
	const [selectedTables, setSelectedTables] = useState<string[]>([]);
	const [tableSearchQuery, setTableSearchQuery] = useState("");

	const connection = connections.find((c) => c.id === selectedConnection);

	const filteredTables =
		connection?.tables.filter(
			(table) =>
				table.name.toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
				table.comment.toLowerCase().includes(tableSearchQuery.toLowerCase()),
		) || [];

	const handleToggleTable = (tableId: string) => {
		setSelectedTables((prev) =>
			prev.includes(tableId)
				? prev.filter((t) => t !== tableId)
				: [...prev, tableId],
		);
	};

	const handleSubmit = async () => {
		if (!connection) return;

		await onAddTables(selectedTables);
		setSelectedConnection("");
		setSelectedTables([]);
		setTableSearchQuery("");
	};

	const formatSize = (size: number) => {
		if (size < 1024) return `${size} B`;
		if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
		if (size < 1024 * 1024 * 1024)
			return `${(size / (1024 * 1024)).toFixed(1)} MB`;
		return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
	};

	const handleConnectionChange = (connectionId: string) => {
		setSelectedConnection(connectionId);
		setSelectedTables([]); // 切换连接时清空已选表
		setTableSearchQuery(""); // 清空搜索
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>添加表到任务</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 flex-1 overflow-hidden flex flex-col">
					{/* 连接选择 */}
					<div className="space-y-2">
						<Label>选择数据库连接</Label>
						<Select
							value={selectedConnection}
							onValueChange={handleConnectionChange}
						>
							<SelectTrigger>
								<SelectValue placeholder="选择连接" />
							</SelectTrigger>
							<SelectContent>
								{connections.map((conn) => (
									<SelectItem key={conn.id} value={conn.id}>
										<div className="flex items-center gap-2">
											<span>{conn.name}</span>
											<Badge variant="outline" className="text-xs">
												{conn.type}
											</Badge>
											<Badge variant="secondary" className="text-xs">
												{conn.tables.length} 表
											</Badge>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{connection && (
						<>
							{/* 表搜索 */}
							<div className="space-y-2">
								<Label>搜索表</Label>
								<div className="relative">
									<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
									<Input
										placeholder="搜索表名或注释..."
										value={tableSearchQuery}
										onChange={(e) => setTableSearchQuery(e.target.value)}
										className="pl-9"
									/>
								</div>
								{tableSearchQuery && (
									<p className="text-xs text-muted-foreground">
										找到 {filteredTables.length} 个匹配的表
									</p>
								)}
							</div>

							{/* 表选择 */}
							<div className="space-y-2 flex-1 overflow-hidden flex flex-col">
								<Label>选择表</Label>
								<div className="border border-border rounded-lg p-4 space-y-3 overflow-y-auto flex-1">
									{filteredTables.length > 0 ? (
										filteredTables.map((table) => {
											const isAlreadyAdded = existingTableIds.includes(
												table.id,
											);
											// 调试信息
											// console.log("表检查:", {
											// 	tableId: table.id,
											// 	tableName: table.name,
											// 	isAlreadyAdded,
											// 	existingTableIds,
											// 	isInExisting: existingTableIds.includes(table.id)
											// })
											return (
												<div
													key={table.id}
													className={`flex items-start gap-3 p-2 rounded ${isAlreadyAdded ? "opacity-50" : "hover:bg-secondary/50"}`}
												>
													<Checkbox
														id={table.id}
														checked={
															selectedTables.includes(table.id) ||
															isAlreadyAdded
														}
														onCheckedChange={() =>
															!isAlreadyAdded && handleToggleTable(table.id)
														}
														disabled={isAlreadyAdded}
														className="mt-1"
													/>
													<div className="flex-1 min-w-0">
														<label
															htmlFor={table.id}
															className={`text-sm font-medium ${isAlreadyAdded ? "cursor-not-allowed" : "cursor-pointer"} block`}
														>
															{table.name}
															{isAlreadyAdded && (
																<span className="ml-2 text-xs text-orange-500">
																	(已添加)
																</span>
															)}
														</label>
														{table.comment && (
															<p className="text-xs text-muted-foreground mt-1 line-clamp-1">
																{table.comment}
															</p>
														)}
														<div className="flex gap-4 mt-1">
															<span className="text-xs text-muted-foreground">
																{table.rowCount.toLocaleString()} 行
															</span>
															<span className="text-xs text-muted-foreground">
																{formatSize(table.tableSize)}
															</span>
															<span className="text-xs text-muted-foreground">
																{table.columnCount} 列
															</span>
														</div>
													</div>
												</div>
											);
										})
									) : (
										<div className="text-center py-8 text-muted-foreground">
											{tableSearchQuery ? "未找到匹配的表" : "该连接暂无表数据"}
										</div>
									)}
								</div>
							</div>
						</>
					)}
				</div>

				<DialogFooter className="pt-4">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						取消
					</Button>
					<Button onClick={handleSubmit} disabled={selectedTables.length === 0}>
						添加 ({selectedTables.length})
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
