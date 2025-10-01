import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface TableInfo {
	name: string;
	exists: boolean;
}

interface TableSelectionFormProps {
	tables: TableInfo[];
	selectedTables: string[];
	onTableToggle: (table: string) => void;
	onSelectAll: () => void;
	onDeselectAll: () => void;
	onBack: () => void;
	onStartAnalysis: () => void;
}

export function TableSelectionForm({
	tables,
	selectedTables,
	onTableToggle,
	onSelectAll,
	onDeselectAll,
	onBack,
	onStartAnalysis,
}: TableSelectionFormProps) {
	const [searchQuery, setSearchQuery] = useState("");

	// 过滤表列表
	const filteredTables = useMemo(() => {
		if (!searchQuery.trim()) {
			return tables;
		}
		return tables.filter((table) =>
			table.name.toLowerCase().includes(searchQuery.toLowerCase()),
		);
	}, [tables, searchQuery]);

	return (
		<Card className="p-6 max-w-4xl mx-auto">
			<div className="flex justify-between items-center mb-6">
				<h2 className="text-2xl font-bold">选择要分析的表</h2>
				<Button variant="outline" onClick={onBack}>
					返回
				</Button>
			</div>

			{/* 搜索框和批量操作 */}
			<div className="mb-4">
				<Input
					type="text"
					placeholder="搜索表名..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="mb-4"
				/>

				{/* 批量操作按钮 */}
				<div className="flex gap-2 mb-4">
					<Button
						variant="outline"
						size="sm"
						onClick={onSelectAll}
						disabled={filteredTables.length === 0}
					>
						全选
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={onDeselectAll}
						disabled={selectedTables.length === 0}
					>
						全不选
					</Button>
				</div>

				<p className="text-sm text-muted-foreground mb-4">
					已选择 {selectedTables.length} 个表
					{searchQuery && ` (过滤后显示 ${filteredTables.length} 个表)`}
				</p>
				<div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
					{filteredTables.map((table) => (
						<button
							key={table.name}
							type="button"
							className={`p-3 border rounded transition-colors ${
								selectedTables.includes(table.name)
									? table.exists
										? "bg-blue-100 border-blue-500"
										: "bg-yellow-100 border-yellow-500"
									: table.exists
										? "hover:bg-gray-50"
										: "bg-gray-100 text-gray-500"
							}`}
							onClick={() => onTableToggle(table.name)}
							disabled={!table.exists}
						>
							<div className="flex items-center gap-2">
								<input
									type="checkbox"
									checked={selectedTables.includes(table.name)}
									onChange={() => {}}
									className="w-4 h-4"
									disabled={!table.exists}
								/>
								<div className="flex flex-col items-start">
									<span className="text-sm">{table.name}</span>
									{!table.exists && (
										<span className="text-xs text-yellow-600">表不存在</span>
									)}
								</div>
							</div>
						</button>
					))}
				</div>
			</div>

			{/* 已选表列表 */}
			{selectedTables.length > 0 && (
				<div className="mb-6">
					<h3 className="text-lg font-semibold mb-3">
						已选择的表 ({selectedTables.length})
					</h3>
					<div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded">
						{selectedTables.map((tableName) => {
							const tableInfo = tables.find((t) => t.name === tableName);
							return (
								<div
									key={tableName}
									className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
										tableInfo?.exists
											? "bg-blue-100 text-blue-800 border border-blue-300"
											: "bg-yellow-100 text-yellow-800 border border-yellow-300"
									}`}
								>
									<span>{tableName}</span>
									{!tableInfo?.exists && (
										<span className="text-xs text-yellow-600">(不存在)</span>
									)}
									<button
										type="button"
										onClick={() => onTableToggle(tableName)}
										className="ml-1 text-gray-500 hover:text-red-500"
									>
										×
									</button>
								</div>
							);
						})}
					</div>
				</div>
			)}

			<div className="flex justify-end">
				<Button
					onClick={onStartAnalysis}
					disabled={selectedTables.length === 0}
				>
					开始分析
				</Button>
			</div>
		</Card>
	);
}
