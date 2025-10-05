import { ArrowLeft, ArrowUpDown, Database, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

interface AnalysisDetailPageProps {
	result?: any;
	onBack: () => void;
}

export function AnalysisDetailPage({ result, onBack }: AnalysisDetailPageProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
	const [analysisData, setAnalysisData] = useState<any>(null);
	const [loading, setLoading] = useState(true);

	// 如果有传入的结果，直接使用；否则从sessionStorage获取
	useEffect(() => {
		if (result) {
			setAnalysisData(result.results);
			setLoading(false);
		} else {
			// 从sessionStorage获取分析结果
			try {
				const savedResult = sessionStorage.getItem('analysisResult');
				if (savedResult) {
					const parsedResult = JSON.parse(savedResult);
					setAnalysisData(parsedResult.results);
					result = parsedResult;
				}
			} catch (error) {
				console.error('Failed to load analysis result from sessionStorage:', error);
				toast.error('加载分析结果失败');
			}
			setLoading(false);
		}
	}, [result]);

	// 获取行数
	const rowCount = analysisData?.row_count || 0;

	// 将non_null_rate转换为数组格式
	const columns: ColumnData[] = Object.entries(
		analysisData?.non_null_rate || {},
	).map(([name, nonNullRate]) => ({
		name,
		nonNullRate: Math.round((nonNullRate as number) * 100), // 转换为百分比
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

	if (loading) {
		return (
			<div className="p-8">
				<div className="flex justify-center items-center h-64">
					<div className="text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
						<p className="text-gray-500">加载分析结果中...</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="p-8 h-screen flex flex-col bg-gray-50">
			{/* 页面头部 */}
			<div className="mb-6">
				<div className="flex items-center gap-4 mb-4">
					<Button variant="outline" onClick={onBack}>
						<ArrowLeft className="w-4 h-4 mr-2" />
						返回任务管理
					</Button>
					<div className="h-6 w-px bg-gray-300"></div>
					<h1 className="text-3xl font-bold">分析结果详情</h1>
				</div>
				<p className="text-muted-foreground">
					查看表数据质量分析结果，包括非空值率统计和可视化展示
				</p>
			</div>

			{/* 基本信息卡片 */}
			<Card className="p-6 mb-6">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div className="flex items-center gap-3">
						<Database className="w-5 h-5 text-blue-500" />
						<div>
							<span className="font-medium text-gray-700">表名：</span>
							<span className="ml-1 font-mono bg-gray-100 px-2 py-1 rounded">
								{result?.tableName || "未知"}
							</span>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<Database className="w-5 h-5 text-green-500" />
						<div>
							<span className="font-medium text-gray-700">总行数：</span>
							<Badge variant="secondary" className="ml-1">
								{rowCount.toLocaleString()}
							</Badge>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<Database className="w-5 h-5 text-orange-500" />
						<div>
							<span className="font-medium text-gray-700">列数量：</span>
							<Badge variant="outline" className="ml-1">
								{columns.length}
							</Badge>
						</div>
					</div>
				</div>
			</Card>

			{/* 搜索和排序控制 */}
			<Card className="p-4 mb-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Search className="w-4 h-4 text-gray-400" />
						<Input
							type="text"
							placeholder="搜索列名..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-80"
						/>
						{searchQuery && (
							<span className="text-sm text-gray-500">
								找到 {filteredColumns.length} 个匹配项
							</span>
						)}
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
			</Card>

			{/* 数据表格 - 占用剩余空间并支持滚动 */}
			<Card className="flex-1 flex flex-col overflow-hidden">
				<div className="p-4 border-b border-gray-200">
					<h3 className="text-lg font-semibold">列非空值率分析</h3>
					<p className="text-sm text-gray-500 mt-1">
						显示 {sortedColumns.length} / {columns.length} 个列
					</p>
				</div>

				<div className="flex-1 overflow-auto">
					{sortedColumns.length === 0 ? (
						<div className="flex items-center justify-center h-full">
							<div className="text-center">
								<Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
								<p className="text-gray-500 text-lg">
									{searchQuery ? "没有找到匹配的列" : "没有分析数据"}
								</p>
								{searchQuery && (
									<Button
										variant="outline"
										size="sm"
										onClick={() => setSearchQuery("")}
										className="mt-2"
									>
										清除搜索
									</Button>
								)}
							</div>
						</div>
					) : (
						<Table>
							<TableHeader className="sticky top-0 bg-white z-10">
								<TableRow>
									<TableHead className="w-[300px]">列名</TableHead>
									<TableHead className="text-right w-[120px]">非空值率</TableHead>
									<TableHead className="w-[300px]">可视化</TableHead>
									<TableHead className="text-right text-gray-500 text-sm">
										数据质量
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{sortedColumns.map((column) => (
									<TableRow key={column.name} className="hover:bg-gray-50">
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
											<div className="flex items-center gap-2">
												<div className="flex-1 bg-gray-200 rounded-full h-2">
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
												<span className="text-xs text-gray-500 w-12 text-right">
													{column.nonNullRate}%
												</span>
											</div>
										</TableCell>
										<TableCell className="text-right">
											<span className={`text-xs font-medium ${
												column.nonNullRate >= 90
													? "text-green-600"
													: column.nonNullRate >= 70
														? "text-yellow-600"
														: "text-red-600"
											}`}>
												{column.nonNullRate >= 90
													? "优秀"
													: column.nonNullRate >= 70
														? "良好"
														: "需改进"}
											</span>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</div>
			</Card>
		</div>
	);
}