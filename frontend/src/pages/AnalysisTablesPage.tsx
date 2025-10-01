import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { TableMetadata } from "@/types";

interface AnalysisTablesPageProps {
  selectedTables: string[];
  onRemoveTable: (table: string) => void;
  onAddTables: () => void;
  onStartAnalysis: () => void;
  onBack: () => void;
  onLoadMetadata: (tableNames: string[]) => Promise<Record<string, TableMetadata>>;
}

export function AnalysisTablesPage({
  selectedTables,
  onRemoveTable,
  onAddTables,
  onStartAnalysis,
  onBack,
  onLoadMetadata,
}: AnalysisTablesPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [tableMetadata, setTableMetadata] = useState<Record<string, TableMetadata>>({});
  const [loading, setLoading] = useState(false);

  // 加载元数据
  useEffect(() => {
    const loadMetadata = async () => {
      if (selectedTables.length === 0) return;

      setLoading(true);
      try {
        const metadata = await onLoadMetadata(selectedTables);
        setTableMetadata(metadata);
      } catch (error) {
        console.error("Failed to load table metadata:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMetadata();
  }, [selectedTables, onLoadMetadata]);

  // 过滤已选表
  const filteredTables = useMemo(() => {
    if (!searchQuery.trim()) {
      return selectedTables;
    }
    return selectedTables.filter((table) =>
      table.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [selectedTables, searchQuery]);

  // 格式化数据大小
  const formatDataSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
  };

  // 格式化行数
  const formatRowCount = (count: number): string => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return (count / 1000).toFixed(1) + "K";
    return (count / 1000000).toFixed(1) + "M";
  };

  // 空状态
  if (selectedTables.length === 0) {
    return (
      <Card className="p-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">分析表</h2>
          <Button variant="outline" onClick={onBack}>
            返回
          </Button>
        </div>

        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            尚未选择任何表
          </h3>
          <p className="text-gray-500 mb-6">
            请添加要分析的表以开始数据质量分析
          </p>
          <Button onClick={onAddTables}>
            添加表
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">分析表</h2>
        <Button variant="outline" onClick={onBack}>
          返回
        </Button>
      </div>

      {/* 搜索框和操作按钮 */}
      <div className="mb-6">
        <div className="flex gap-4 mb-4">
          <Input
            type="text"
            placeholder="搜索表名..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button onClick={onAddTables} variant="outline">
            添加表
          </Button>
          <Button onClick={onStartAnalysis}>
            开始分析
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          已选择 {selectedTables.length} 个表
          {searchQuery && ` (过滤后显示 ${filteredTables.length} 个表)`}
          {loading && " - 正在加载元数据..."}
        </p>
      </div>

      {/* 表列表 */}
      <div className="border rounded">
        <div className="bg-gray-50 px-4 py-2 border-b">
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-600">
            <div className="col-span-3">表名</div>
            <div className="col-span-2 text-center">行数</div>
            <div className="col-span-2 text-center">数据大小</div>
            <div className="col-span-2 text-center">列数</div>
            <div className="col-span-2 text-center">注释</div>
            <div className="col-span-1 text-right">操作</div>
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {filteredTables.map((tableName) => {
            const metadata = tableMetadata[tableName];
            const hasError = metadata?.error;

            return (
              <div
                key={tableName}
                className="px-4 py-3 border-b last:border-b-0 hover:bg-gray-50"
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* 表名 */}
                  <div className="col-span-3">
                    <span className="font-medium">{tableName}</span>
                    {hasError && (
                      <div className="text-xs text-red-500 mt-1">
                        元数据获取失败
                      </div>
                    )}
                  </div>

                  {/* 行数 */}
                  <div className="col-span-2 text-center">
                    {metadata?.row_count !== undefined ? (
                      <span className="text-sm">
                        {formatRowCount(metadata.row_count)}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </div>

                  {/* 数据大小 */}
                  <div className="col-span-2 text-center">
                    {metadata?.data_size !== undefined ? (
                      <span className="text-sm">
                        {formatDataSize(metadata.data_size)}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </div>

                  {/* 列数 */}
                  <div className="col-span-2 text-center">
                    {metadata?.column_count !== undefined ? (
                      <span className="text-sm">
                        {metadata.column_count}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </div>

                  {/* 注释 */}
                  <div className="col-span-2 text-center">
                    {metadata?.comment ? (
                      <span
                        className="text-sm text-gray-600 truncate block"
                        title={metadata.comment}
                      >
                        {metadata.comment}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </div>

                  {/* 操作 */}
                  <div className="col-span-1 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRemoveTable(tableName)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      移除
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}