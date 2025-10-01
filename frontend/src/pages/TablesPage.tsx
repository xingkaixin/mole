import { TableSelectionForm } from "@/components/forms/TableSelectionForm";

interface TableInfo {
	name: string;
	exists: boolean;
}

interface TablesPageProps {
	tables: TableInfo[];
	selectedTables: string[];
	onTableToggle: (table: string) => void;
	onSelectAll: () => void;
	onDeselectAll: () => void;
	onBack: () => void;
	onStartAnalysis: () => void;
}

export function TablesPage({
	tables,
	selectedTables,
	onTableToggle,
	onSelectAll,
	onDeselectAll,
	onBack,
	onStartAnalysis,
}: TablesPageProps) {
	return (
		<div>
			<TableSelectionForm
				tables={tables}
				selectedTables={selectedTables}
				onTableToggle={onTableToggle}
				onSelectAll={onSelectAll}
				onDeselectAll={onDeselectAll}
				onBack={onBack}
				onStartAnalysis={onStartAnalysis}
			/>
		</div>
	);
}
