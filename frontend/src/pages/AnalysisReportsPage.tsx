import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Trash2, Search, FileText, Calendar, Database, Clock, CheckCircle, XCircle, Loader2, Filter, ChevronDown } from "lucide-react";
import type { AnalysisResult } from "@/types";
import { AnalysisResultViewer } from "@/components/AnalysisResultViewer";

interface AnalysisReportsPageProps {
	onBack: () => void;
	onGetAnalysisResults: (connectionId: string) => Promise<any[]>;
	onGetDatabaseConnections: () => Promise<any[]>;
	onDeleteAnalysisResult: (resultId: string) => Promise<void>;
	connectionId?: string;
}

export function AnalysisReportsPage({
	onBack,
	onGetAnalysisResults,
	onGetDatabaseConnections,
	onDeleteAnalysisResult,
	connectionId,
}: AnalysisReportsPageProps) {
	const [analysisResults, setAnalysisResults] = useState<any[]>([]);
	const [filteredResults, setFilteredResults] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedResult, setSelectedResult] = useState<any | null>(null);
	const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
	const [databaseConnections, setDatabaseConnections] = useState<any[]>([]);
	const [selectedDatabaseId, setSelectedDatabaseId] = useState<string>("all");

	// 加载数据库连接
	useEffect(() => {
		const loadDatabaseConnections = async () => {
			try {
				const connections = await onGetDatabaseConnections();
				setDatabaseConnections(connections || []);
			} catch (error) {
				console.error("Failed to load database connections:", error);
				setDatabaseConnections([]);
			}
		};

		loadDatabaseConnections();
	}, [onGetDatabaseConnections]);

	// 加载分析结果
	useEffect(() => {
		const loadResults = async () => {
			try {
				setLoading(true);
				// 获取所有分析结果
				const results = await onGetAnalysisResults("all");
				// 确保results不为null或undefined
				const validResults = results || [];
				// 按创建时间倒序排列，新的结果在前面
				const sortedResults = validResults.sort((a, b) =>
					new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
				);
				setAnalysisResults(sortedResults);
				setFilteredResults(sortedResults);
			} catch (error) {
				console.error("Failed to load analysis results:", error);
				toast.error("加载分析结果失败");
				setAnalysisResults([]);
				setFilteredResults([]);
			} finally {
				setLoading(false);
			}
		};

		loadResults();
	}, [onGetAnalysisResults]);

	// 搜索和数据库过滤
	useEffect(() => {
		let filtered = analysisResults;

		// 按数据库连接过滤
		if (selectedDatabaseId !== "all") {
			filtered = filtered.filter(result => result.databaseId === selectedDatabaseId);
		}

		// 按搜索关键词过滤
		if (searchQuery.trim()) {
			filtered = filtered.filter(result =>
				result.tableName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				result.rules.some((rule: string) => rule.toLowerCase().includes(searchQuery.toLowerCase())) ||
				(result.databaseName && result.databaseName.toLowerCase().includes(searchQuery.toLowerCase()))
			);
		}

		setFilteredResults(filtered);
	}, [searchQuery, selectedDatabaseId, analysisResults]);

	// 获取状态颜色
	const getStatusColor = (status: string) => {
		switch (status) {
			case "completed":
				return "bg-green-100 text-green-800";
			case "running":
				return "bg-blue-100 text-blue-800";
			case "failed":
				return "bg-red-100 text-red-800";
			case "cancelled":
				return "bg-gray-100 text-gray-800";
			default:
				return "bg-yellow-100 text-yellow-800";
		}
	};

	// 获取状态图标
	const getStatusIcon = (status: string) => {
		switch (status) {
			case "completed":
				return <CheckCircle className="w-4 h-4" />;
			case "running":
				return <Loader2 className="w-4 h-4 animate-spin" />;
			case "failed":
				return <XCircle className="w-4 h-4" />;
			case "cancelled":
				return <XCircle className="w-4 h-4" />;
			default:
				return <Clock className="w-4 h-4" />;
		}
	};

	// 格式化时间
	const formatDate = (date: Date) => {
		return new Date(date).toLocaleString("zh-CN", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// 格式化持续时间
	const formatDuration = (seconds: number) => {
		if (seconds < 60) return `${seconds}秒`;
		if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
		return `${Math.floor(seconds / 3600)}时${Math.floor((seconds % 3600) / 60)}分`;
	};

	// 删除分析结果
	const handleDeleteResult = async (resultId: string) => {
		try {
			setDeletingIds(prev => new Set(prev).add(resultId));
			await onDeleteAnalysisResult(resultId);

			// 从前端状态中移除
			setAnalysisResults(prev => prev.filter(r => r.id !== resultId));
			setFilteredResults(prev => prev.filter(r => r.id !== resultId));

			toast.success("分析结果已删除");
		} catch (error) {
			console.error("Failed to delete analysis result:", error);
			toast.error("删除分析结果失败");
		} finally {
			setDeletingIds(prev => {
				const newSet = new Set(prev);
				newSet.delete(resultId);
				return newSet;
			});
		}
	};

	// 查看结果详情
	const handleViewResult = (result: any) => {
		setSelectedResult(result);
	};

	if (selectedResult) {
		return (
			<AnalysisResultViewer
				result={selectedResult}
				onBack={() => setSelectedResult(null)}
			/>
		);
	}

	return (
		<Card className="p-6 max-w-6xl mx-auto">
			<div className="flex justify-between items-center mb-6">
				<h2 className="text-2xl font-bold">分析报告</h2>
				<Button variant="outline" onClick={onBack}>
					返回
				</Button>
			</div>

			{/* 搜索和过滤器 */}
			<div className="mb-6 space-y-4">
				<div className="flex gap-4">
					{/* 搜索框 */}
					<div className="flex-1 relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
						<Input
							type="text"
							placeholder="搜索表名、分析规则或数据库名称..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10"
						/>
					</div>

					{/* 数据库连接过滤器 */}
					<div className="w-64">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" className="w-full justify-between">
									<div className="flex items-center gap-2">
										<Filter className="w-4 h-4" />
										<span>
											{selectedDatabaseId === "all"
												? "所有数据库连接"
												: databaseConnections.find((c: any) => c.id === selectedDatabaseId)?.name || selectedDatabaseId
											}
										</span>
									</div>
									<ChevronDown className="w-4 h-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="w-64" align="end">
								<DropdownMenuItem
									onClick={() => setSelectedDatabaseId("all")}
									className={selectedDatabaseId === "all" ? "bg-accent" : ""}
								>
									所有数据库连接
								</DropdownMenuItem>
								{databaseConnections.map((conn: any) => (
									<DropdownMenuItem
										key={conn.id}
										onClick={() => setSelectedDatabaseId(conn.id)}
										className={selectedDatabaseId === conn.id ? "bg-accent" : ""}
									>
										{conn.name}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>

				<p className="text-sm text-muted-foreground">
					共 {filteredResults.length} 个分析结果
					{searchQuery && ` (搜索: "${searchQuery}")`}
					{selectedDatabaseId !== "all" && ` (数据库: ${databaseConnections.find((c: any) => c.id === selectedDatabaseId)?.name || selectedDatabaseId})`}
				</p>
			</div>

			{loading ? (
				<div className="flex justify-center py-12">
					<Loader2 className="w-8 h-8 animate-spin text-blue-500" />
				</div>
			) : filteredResults.length === 0 ? (
				<div className="text-center py-12">
					<div className="text-gray-400 mb-4">
						<FileText className="w-16 h-16 mx-auto" />
					</div>
					<h3 className="text-xl font-semibold text-gray-600 mb-2">
						暂无分析结果
					</h3>
					<p className="text-gray-500">
						{searchQuery ? "没有找到匹配的分析结果" : "还没有执行过任何分析任务"}
					</p>
				</div>
			) : (
				/* 结果列表 */
				<div className="space-y-4">
					{filteredResults.map((result) => (
						<Card key={result.id} className="p-4 hover:shadow-md transition-shadow">
							<div className="flex items-center justify-between">
								<div className="flex-1">
									<div className="flex items-center gap-3 mb-2">
										<h3 className="font-semibold text-lg">{result.tableName}</h3>
										{result.databaseName && (
											<Badge variant="secondary" className="text-xs">
												<Database className="w-3 h-3 mr-1" />
												{result.databaseName}
											</Badge>
										)}
										<Badge className={getStatusColor(result.status)}>
											{getStatusIcon(result.status)}
											<span className="ml-1">
												{result.status === "completed" ? "已完成" :
												 result.status === "running" ? "运行中" :
												 result.status === "failed" ? "失败" :
												 result.status === "cancelled" ? "已取消" : "等待中"}
											</span>
										</Badge>
									</div>

									<div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
										<div className="flex items-center gap-1">
											<Calendar className="w-4 h-4" />
											<span>{formatDate(result.startedAt)}</span>
										</div>
										<div className="flex items-center gap-1">
											<Clock className="w-4 h-4" />
											<span>{formatDuration(result.duration)}</span>
										</div>
										{result.completedAt && (
											<div className="flex items-center gap-1">
												<CheckCircle className="w-4 h-4 text-green-500" />
												<span>完成于 {formatDate(result.completedAt)}</span>
											</div>
										)}
									</div>

									<div className="flex items-center gap-2">
										<span className="text-sm text-gray-500">分析规则:</span>
										<div className="flex gap-1">
											{result.rules.map((rule: string) => (
												<Badge key={rule} variant="outline" className="text-xs">
													{rule}
												</Badge>
											))}
										</div>
									</div>
								</div>

								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => handleViewResult(result)}
									>
										查看详情
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => handleDeleteResult(result.id)}
										className="text-red-600 hover:text-red-700 hover:bg-red-50"
										disabled={deletingIds.has(result.id)}
									>
										{deletingIds.has(result.id) ? (
											<Loader2 className="w-4 h-4 animate-spin" />
										) : (
											<Trash2 className="w-4 h-4" />
										)}
									</Button>
								</div>
							</div>
						</Card>
					))}
				</div>
			)}
		</Card>
	);
}