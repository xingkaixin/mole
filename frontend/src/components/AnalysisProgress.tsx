import { Card } from "@/components/ui/card";

interface AnalysisProgressProps {
	selectedTablesCount: number;
}

export function AnalysisProgress({
	selectedTablesCount,
}: AnalysisProgressProps) {
	return (
		<Card className="p-6 max-w-4xl mx-auto">
			<h2 className="text-2xl font-bold mb-6">正在分析数据</h2>

			<div className="text-center py-12">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
				<p className="text-lg">正在分析 {selectedTablesCount} 个表...</p>
				<p className="text-sm text-muted-foreground mt-2">
					请稍候，这可能需要一些时间
				</p>
			</div>
		</Card>
	);
}
