import { ArrowUpDown, Database, Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface ColumnData {
	name: string;
	nonNullRate: number;
}

interface AnalysisResultViewerProps {
	result: Record<string, unknown>;
	onBack: () => void;
}

export function AnalysisResultViewer({
	result,
	onBack,
}: AnalysisResultViewerProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

	// 解析结果数据
	const analysisData = result.results as
		| {
				row_count?: number;
				non_null_rate?: Record<string, number>;
		  }
		| undefined;

	// 获取行数
	const rowCount = analysisData?.row_count || 0;

	// 将non_null_rate转换为数组格式
	const columns: ColumnData[] = Object.entries(
		analysisData?.non_null_rate || {},
	).map(([name, nonNullRate]) => ({
		name,
		nonNullRate: Math.round(nonNullRate * 100), // 转换为百分比
	}));

	// 搜索过滤
	const filteredColumns = columns.filter((column) =>
		column.name.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	// 排序
	const sortedColumns = [...filteredColumns].sort((a, b) => {
		return sortOrder === "asc"
			? a.nonNullRate - b.nonNullRate
			: b.nonNullRate - a.nonNullRate;
	});

	// 切换排序
	const toggleSort = () => {
		setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
	};

	// 格式化时间
	const _formatDate = (date: Date) => {
		return new Date(date).toLocaleString("zh-CN", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	return (
		<div className="h-full flex flex-col">
			{/* 头部信息 - 固定在顶部 */}
			<div className="flex-shrink-0 p-6 border-b border-gray-200 bg-white">
				<div className="flex justify-between items-center">
					<h2 className="text-2xl font-bold">分析结果详情</h2>
					<div className="flex gap-2">
						<Button variant="outline" onClick={onBack}>
							返回列表
						</Button>
					</div>
				</div>
			</div>

			{/* 基本信息 - 固定在顶部 */}
			<div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-b border-gray-200">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="flex items-center gap-2">
						<Database className="w-4 h-4 text-gray-500" />
						<span className="font-medium">表名：</span>
						<span className="truncate">{String(result.tableName)}</span>
					</div>
					<div className="flex items-center gap-2">
						<Database className="w-4 h-4 text-blue-500" />
						<span className="font-medium">总行数：</span>
						<Badge variant="secondary">{rowCount.toLocaleString()}</Badge>
					</div>
					<div className="flex items-center gap-2">
						<span className="font-medium">列数量：</span>
						<Badge variant="outline">{columns.length}</Badge>
					</div>
				</div>
			</div>

			{/* 搜索和排序 - 固定在顶部 */}
			<div className="flex-shrink-0 px-6 py-4 bg-white border-b border-gray-200">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Search className="w-4 h-4 text-gray-400" />
						<Input
							type="text"
							placeholder="搜索列名..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-64"
						/>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={toggleSort}
						className="flex items-center gap-2"
					>
						<ArrowUpDown className="w-4 h-4" />
						非空值率 {sortOrder === "asc" ? "升序" : "降序"}
					</Button>
				</div>
			</div>

			{/* 列信息表格 - 可滚动区域 */}
			<div className="flex-1 flex flex-col bg-gray-50">
				<div className="flex-shrink-0 px-6 py-4">
					<div className="bg-white rounded-lg shadow-sm p-4 border-b border-gray-200">
						<h3 className="text-lg font-medium">列非空值率分析</h3>
						<p className="text-sm text-gray-500">
							显示 {sortedColumns.length} / {columns.length} 个列
						</p>
					</div>
				</div>

				{/* 表格滚动区域 */}
				<div className="flex-1 px-6 pb-6 overflow-auto">
					<div className="bg-white rounded-lg shadow-sm">
						{sortedColumns.length === 0 ? (
							<div className="text-center py-8 text-gray-500">
								{searchQuery ? "没有找到匹配的列" : "没有列数据"}
							</div>
						) : (
							<div className="min-w-full">
								<Table>
									<TableHeader className="sticky top-0 bg-white z-10">
										<TableRow>
											<TableHead>列名</TableHead>
											<TableHead className="text-right">非空值率</TableHead>
											<TableHead className="w-48">可视化</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{sortedColumns.map((column) => (
											<TableRow key={column.name}>
												<TableCell className="font-mono text-sm">
													{column.name}
												</TableCell>
												<TableCell className="text-right">
													<Badge
														variant={
															column.nonNullRate >= 90
																? "default"
																: column.nonNullRate >= 70
																	? "secondary"
																	: "destructive"
														}
													>
														{column.nonNullRate}%
													</Badge>
												</TableCell>
												<TableCell>
													<div className="w-full bg-gray-200 rounded-full h-2">
														<div
															className={`h-2 rounded-full transition-all duration-300 ${
																column.nonNullRate >= 90
																	? "bg-green-500"
																	: column.nonNullRate >= 70
																		? "bg-yellow-500"
																		: "bg-red-500"
															}`}
															style={{ width: `${column.nonNullRate}%` }}
														/>
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
