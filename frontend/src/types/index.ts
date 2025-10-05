export interface DatabaseConfig {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  concurrency: number; // 并发度配置，默认5
}

export interface RuleResult {
  ruleName: string;
  table: string;
  column?: string;
  value: unknown;
  status: string;
}

export type AppStep =
  | "welcome"
  | "config"
  | "analysis_tables"
  | "table_selection"
  | "analysis"
  | "results"
  | "tasks"
  | "analysis_detail";

export type TaskTable = {
  id: string;
  tableId: string; // 实际的表ID
  connectionId: string;
  connectionName: string;
  tableName: string;
  tableComment: string;
  rowCount: number;
  tableSize: number;
  columnCount: number;
  tblStatus: string; // 表状态：待分析｜分析中｜分析完成
  addedAt: string;
};

export type Task = {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  tables: TaskTable[];
};

export interface TableInfo {
  name: string;
  exists: boolean;
}

export interface TableSelectionPageProps {
  tables: TableInfo[];
  selectedTables: string[];
  onTableToggle: (table: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBack: () => void;
  onConfirmSelection: () => void;
}

export interface TableMetadata {
  row_count?: number;
  data_size?: number;
  column_count?: number;
  comment?: string;
  error?: string;
}

export interface AnalysisResult {
  id: string;
  databaseId: string;
  tableName: string;
  rules: string[];
  results: Record<string, unknown>;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  startedAt: Date;
  completedAt?: Date;
  duration: number;
}
