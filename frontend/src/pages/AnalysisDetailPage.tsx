import { ArrowLeft, Database, Search } from "lucide-react";
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
  type: string;
  comment: string;
  ordinal: number;
  nonNullRate?: number;
}

interface EnhancedAnalysisResult {
  status: string;
  results: {
    row_count?: number;
    non_null_rate?: Record<string, number>;
  };
  tableName: string;
  tableComment: string;
  columns: Array<{
    name: string;
    type: string;
    comment: string;
    ordinal: number;
  }>;
  databaseId: string;
  analysisStatus: string;
  startedAt: string;
  completedAt: string | null;
  duration: number;
  rules: string[];
}

interface AnalysisDetailPageProps {
  result?: any;
  onBack: () => void;
}

export function AnalysisDetailPage({
  result,
  onBack,
}: AnalysisDetailPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [enhancedResult, setEnhancedResult] =
    useState<EnhancedAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

  // 获取分析结果
  useEffect(() => {
    const loadResult = async () => {
      try {
        setLoading(true);

        let resultData = result;

        // 如果没有传入的结果，从sessionStorage获取
        if (!result) {
          try {
            const savedResult = sessionStorage.getItem("analysisResult");
            if (savedResult) {
              resultData = JSON.parse(savedResult);
            }
          } catch (error) {
            console.error(
              "Failed to load analysis result from sessionStorage:",
              error
            );
            toast.error("加载分析结果失败");
            setLoading(false);
            return;
          }
        }

        if (resultData) {
          // 检查是否已经是增强的结果（包含columns信息）
          if (resultData.columns && Array.isArray(resultData.columns)) {
            console.log("使用增强的分析结果");
            setEnhancedResult(resultData as EnhancedAnalysisResult);
          } else {
            console.log("使用基本的分析结果");
            setAnalysisData(resultData.results);
          }
        }
      } catch (error) {
        console.error("Failed to load analysis result:", error);
        toast.error("加载分析结果失败");
      } finally {
        setLoading(false);
      }
    };

    loadResult();
  }, [result]);

  // 设置分析数据（兼容原有数据结构）
  const [analysisData, setAnalysisData] = useState<any>(null);

  // 获取行数
  const rowCount =
    enhancedResult?.results?.row_count || analysisData?.row_count || 0;

  // 获取列信息 - 优先使用增强结果中的列信息
  const columns: ColumnData[] = [];

  if (enhancedResult?.columns) {
    // 使用增强结果中的列信息，并合并非空率数据
    const nonNullRateData = enhancedResult.results?.non_null_rate || {};
    enhancedResult.columns.forEach((column) => {
      columns.push({
        name: column.name,
        type: column.type,
        comment: column.comment,
        ordinal: column.ordinal,
        nonNullRate: nonNullRateData[column.name]
          ? Math.round(nonNullRateData[column.name] * 100)
          : undefined,
      });
    });
  } else if (analysisData?.non_null_rate) {
    // 降级使用原有数据结构
    Object.entries(analysisData.non_null_rate).forEach(
      ([name, nonNullRate]) => {
        columns.push({
          name,
          type: "未知",
          comment: "",
          ordinal: 0,
          nonNullRate: Math.round((nonNullRate as number) * 100),
        });
      }
    );
  }

  // 搜索过滤
  const filteredColumns = columns.filter((column) =>
    column.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 按字段序号排序
  const sortedColumns = [...filteredColumns].sort(
    (a, b) => a.ordinal - b.ordinal
  );

  // 获取表说明
  const tableComment = enhancedResult?.tableComment || "";

  // 获取表名
  const tableName = enhancedResult?.tableName || result?.tableName || "未知";

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
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-blue-500" />
              <div>
                <span className="font-medium text-gray-700">表名：</span>
                <span className="ml-1 font-mono bg-gray-100 px-2 py-1 rounded">
                  {tableName}
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
          {tableComment && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">表说明：</span>
              <span className="text-gray-600 ml-2">{tableComment}</span>
            </div>
          )}
        </div>
      </Card>

      {/* 搜索控制 */}
      <Card className="p-4 mb-6">
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
      </Card>

      {/* 数据表格 - 占用剩余空间并支持滚动 */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">列信息分析</h3>
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
                  <TableHead className="w-16">序号</TableHead>
                  <TableHead className="w-[300px]">列名</TableHead>
                  <TableHead className="w-[200px]">字段类型</TableHead>
                  <TableHead>字段说明</TableHead>
                  {sortedColumns.some(
                    (col) => col.nonNullRate !== undefined
                  ) && (
                    <TableHead className="text-right w-[120px]">
                      非空值率
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedColumns.map((column) => (
                  <TableRow key={column.name} className="hover:bg-gray-50">
                    <TableCell className="text-gray-500">
                      {column.ordinal}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {column.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {column.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-xs">
                      <div className="truncate" title={column.comment}>
                        {column.comment || "-"}
                      </div>
                    </TableCell>
                    {column.nonNullRate !== undefined && (
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
                    )}
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
