import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ModeToggle } from "@/components/mode-toggle";
import { Search, Download, RefreshCw, Calendar, Clock } from "lucide-react";
import type { AnalysisResult } from "@/types";

interface ResultsPageProps {
	connectionId?: string;
	onGetAnalysisResults: (connectionId: string) => Promise<any[]>;
}

export function ResultsPage({ connectionId, onGetAnalysisResults }: ResultsPageProps) {
	const [results, setResults] = useState<AnalysisResult[]>([]);
	const [filteredResults, setFilteredResults] = useState<AnalysisResult[]>([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [loading, setLoading] = useState(true);

	// 获取分析结果
	useEffect(() => {
		fetchResults();
	}, [connectionId]);

	// 过滤结果
	useEffect(() => {
		if (searchTerm.trim() === "") {
			setFilteredResults(results);
		} else {
			const filtered = results.filter(result =>
				result.tableName.toLowerCase().includes(searchTerm.toLowerCase())
			);
			setFilteredResults(filtered);
		}
	}, [results, searchTerm]);

	const fetchResults = async () => {
		setLoading(true);
		try {
			if (!connectionId) {
				setResults([]);
				setLoading(false);
				return;
			}

			// 调用后端API获取真实的分析结果
			const backendResults = await onGetAnalysisResults(connectionId);

			// 转换后端格式为前端格式
			const convertedResults: AnalysisResult[] = backendResults.map((result: any) => ({
				id: result.id,
				databaseId: result.databaseId,
				tableName: result.tableName,
				rules: result.rules,
				results: result.results,
				status: result.status,
				startedAt: new Date(result.startedAt),
				completedAt: result.completedAt ? new Date(result.completedAt) : undefined,
				duration: result.duration
			}));

			setResults(convertedResults);
			setLoading(false);
		} catch (error) {
			console.error("Failed to fetch analysis results:", error);
			setLoading(false);
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "completed":
				return "bg-green-100 text-green-800";
			case "running":
				return "bg-blue-100 text-blue-800";
			case "failed":
				return "bg-red-100 text-red-800";
			case "cancelled":
				return "bg-orange-100 text-orange-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const getStatusText = (status: string) => {
		switch (status) {
			case "completed":
				return "已完成";
			case "running":
				return "分析中";
			case "failed":
				return "失败";
			case "cancelled":
				return "已取消";
			default:
				return "未知";
		}
	};

	const formatDuration = (milliseconds: number) => {
		const seconds = Math.floor(milliseconds / 1000);
		if (seconds < 60) {
			return `${seconds}秒`;
		}
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}分${remainingSeconds}秒`;
	};

	const formatDate = (date: Date) => {
		return date.toLocaleString("zh-CN", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit"
		});
	};

	const exportResults = () => {
		// 导出分析结果到JSON文件
		const dataStr = JSON.stringify(results, null, 2);
		const dataBlob = new Blob([dataStr], { type: "application/json" });
		const url = URL.createObjectURL(dataBlob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `analysis-results-${new Date().toISOString().split('T')[0]}.json`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	return (
		<div className="container mx-auto p-6 max-w-6xl">
			<div className="flex justify-between items-center mb-6">
				<div>
					<h1 className="text-3xl font-bold">分析结果</h1>
					<p className="text-muted-foreground mt-2">
						查看已完成的数据表分析结果
					</p>
				</div>
				<div className="flex items-center gap-4">
					<ModeToggle />
				</div>
			</div>

			{/* 搜索和操作栏 */}
			<Card className="p-4 mb-6">
				<div className="flex justify-between items-center">
					<div className="flex items-center gap-4 flex-1 max-w-md">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
							<Input
								placeholder="搜索表名..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-10"
							/>
						</div>
						<span className="text-sm text-muted-foreground">
							{filteredResults.length} 个结果
						</span>
					</div>
					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={fetchResults}
							disabled={loading}
						>
							<RefreshCw className="h-4 w-4 mr-2" />
							刷新
						</Button>
						<Button
							variant="outline"
							onClick={exportResults}
							disabled={results.length === 0}
						>
							<Download className="h-4 w-4 mr-2" />
							导出
						</Button>
					</div>
				</div>
			</Card>

			{/* 结果列表 */}
			{loading ? (
				<div className="text-center py-12">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-lg">加载分析结果...</p>
				</div>
			) : filteredResults.length === 0 ? (
				<div className="text-center py-12">
					<p className="text-lg">暂无分析结果</p>
					<p className="text-sm text-muted-foreground mt-2">
						{searchTerm ? "没有找到匹配的分析结果" : "请先进行数据表分析"}
					</p>
				</div>
			) : (
				<div className="grid gap-4">
					{filteredResults.map((result) => (
						<Card key={result.id} className="p-6">
							<div className="flex justify-between items-start mb-4">
								<div>
									<h3 className="text-xl font-semibold">{result.tableName}</h3>
									<div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
										<div className="flex items-center gap-1">
											<Calendar className="h-4 w-4" />
											<span>{formatDate(result.startedAt)}</span>
										</div>
										<div className="flex items-center gap-1">
											<Clock className="h-4 w-4" />
											<span>{formatDuration(result.duration)}</span>
										</div>
									</div>
								</div>
								<Badge className={getStatusColor(result.status)}>
									{getStatusText(result.status)}
								</Badge>
							</div>

							{/* 规则标签 */}
							<div className="flex flex-wrap gap-2 mb-4">
								{result.rules.map((rule) => (
									<Badge key={rule} variant="outline">
										{rule}
									</Badge>
								))}
							</div>

							{/* 分析结果详情 */}
							<div className="border rounded">
								<div className="bg-gray-50 px-4 py-2 border-b">
									<h4 className="font-medium">分析结果</h4>
								</div>
								<div className="p-4">
									<pre className="text-sm bg-muted p-4 rounded overflow-x-auto">
										{JSON.stringify(result.results, null, 2)}
									</pre>
								</div>
							</div>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
