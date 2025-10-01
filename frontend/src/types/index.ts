export interface DatabaseConfig {
	id: string;
	name: string;
	type: string;
	host: string;
	port: number;
	username: string;
	password: string;
	database: string;
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
	| "results";

export interface TableInfo {
	name: string;
	exists: boolean;
}

export interface TableMetadata {
	row_count?: number;
	data_size?: number;
	column_count?: number;
	comment?: string;
	error?: string;
}
