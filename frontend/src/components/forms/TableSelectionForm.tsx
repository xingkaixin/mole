import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface TableSelectionFormProps {
  tables: string[];
  selectedTables: string[];
  onTableToggle: (table: string) => void;
  onBack: () => void;
  onStartAnalysis: () => void;
}

export function TableSelectionForm({
  tables,
  selectedTables,
  onTableToggle,
  onBack,
  onStartAnalysis
}: TableSelectionFormProps) {
  return (
    <Card className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">选择要分析的表</h2>
        <Button variant="outline" onClick={onBack}>
          返回
        </Button>
      </div>

      <div className="mb-4">
        <p className="text-sm text-muted-foreground mb-4">
          已选择 {selectedTables.length} 个表
        </p>
        <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
          {tables.map(table => (
            <button
              key={table}
              type="button"
              className={`p-3 border rounded transition-colors ${
                selectedTables.includes(table)
                  ? "bg-blue-100 border-blue-500"
                  : "hover:bg-gray-50"
              }`}
              onClick={() => onTableToggle(table)}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedTables.includes(table)}
                  onChange={() => {}}
                  className="w-4 h-4"
                />
                <span className="text-sm">{table}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onStartAnalysis} disabled={selectedTables.length === 0}>
          开始分析
        </Button>
      </div>
    </Card>
  );
}