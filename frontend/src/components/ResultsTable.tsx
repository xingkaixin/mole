import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { RuleResult } from "@/types";

interface ResultsTableProps {
  results: RuleResult[];
  onReanalyze: () => void;
}

export function ResultsTable({ results, onReanalyze }: ResultsTableProps) {
  return (
    <Card className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">分析结果</h2>
        <Button variant="outline" onClick={onReanalyze}>
          重新分析
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3">表名</th>
              <th className="text-left p-3">字段</th>
              <th className="text-left p-3">规则</th>
              <th className="text-left p-3">结果</th>
              <th className="text-left p-3">状态</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={`${result.table}-${result.column || 'none'}-${result.ruleName}`} className="border-b hover:bg-gray-50">
                <td className="p-3">{result.table}</td>
                <td className="p-3">{result.column || "-"}</td>
                <td className="p-3">
                  {result.ruleName === "row_count" ? "数据总量" : "空值率"}
                </td>
                <td className="p-3">{String(result.value)}</td>
                <td className="p-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    result.status === "success" ? "bg-green-100 text-green-800" :
                    result.status === "warning" ? "bg-yellow-100 text-yellow-800" :
                    "bg-red-100 text-red-800"
                  }`}>
                    {result.status === "success" ? "正常" :
                     result.status === "warning" ? "警告" : "错误"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {results.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          暂无分析结果
        </div>
      )}
    </Card>
  );
}