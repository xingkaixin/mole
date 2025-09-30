import { ModeToggle } from "@/components/mode-toggle";
import { TableSelectionForm } from "@/components/forms/TableSelectionForm";

interface TablesPageProps {
  tables: string[];
  selectedTables: string[];
  onTableToggle: (table: string) => void;
  onBack: () => void;
  onStartAnalysis: () => void;
}

export function TablesPage({
  tables,
  selectedTables,
  onTableToggle,
  onBack,
  onStartAnalysis
}: TablesPageProps) {
  return (
    <div>
      <div className="flex justify-end mb-4">
        <ModeToggle />
      </div>
      <TableSelectionForm
        tables={tables}
        selectedTables={selectedTables}
        onTableToggle={onTableToggle}
        onBack={onBack}
        onStartAnalysis={onStartAnalysis}
      />
    </div>
  );
}