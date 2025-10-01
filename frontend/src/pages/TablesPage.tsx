import { TableSelectionForm } from "@/components/forms/TableSelectionForm";

interface TableInfo {
	name: string;
	exists: boolean;
}

interface TableSelectionPageProps {
	tables: TableInfo[];
	selectedTables: string[];
	onTableToggle: (table: string) => void;
	onSelectAll: () => void;
	onDeselectAll: () => void;
	onBack: () => void;
	onConfirmSelection: () => void;
}

export function TableSelectionPage({
	tables,
	selectedTables,
	onTableToggle,
	onSelectAll,
	onDeselectAll,
	onBack,
	onConfirmSelection,
}: TableSelectionPageProps) {
	return (
		<div>
			<TableSelectionForm
				tables={tables}
				selectedTables={selectedTables}
				onTableToggle={onTableToggle}
				onSelectAll={onSelectAll}
				onDeselectAll={onDeselectAll}
				onBack={onBack}
				onStartAnalysis={onConfirmSelection}
			/>
		</div>
	);
}
