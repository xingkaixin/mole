export type DatabaseTypeOption = {
	value: string;
	label: string;
	defaultPort: number;
};

export const DATABASE_TYPES: DatabaseTypeOption[] = [
	{ value: "mysql", label: "MySQL", defaultPort: 3306 },
	{ value: "sqlserver", label: "SQL Server", defaultPort: 1433 },
	{ value: "oracle", label: "Oracle", defaultPort: 1521 },
	{ value: "postgresql", label: "PostgreSQL", defaultPort: 5432 },
];

export const DEFAULT_DATABASE_TYPE = DATABASE_TYPES[0].value;

const DATABASE_TYPE_VALUES = new Set(DATABASE_TYPES.map((type) => type.value));

export function normalizeDatabaseType(type?: string | null): string {
	if (!type) {
		return DEFAULT_DATABASE_TYPE;
	}

	const normalized = type.toLowerCase();
	if (DATABASE_TYPE_VALUES.has(normalized)) {
		return normalized;
	}

	return DEFAULT_DATABASE_TYPE;
}

export function getDatabaseTypeLabel(type: string): string {
	const normalized = normalizeDatabaseType(type);
	const option = DATABASE_TYPES.find((item) => item.value === normalized);
	return option ? option.label : type;
}

export function getDefaultPort(type: string): number {
	const normalized = normalizeDatabaseType(type);
	const option = DATABASE_TYPES.find((item) => item.value === normalized);
	return option?.defaultPort ?? DATABASE_TYPES[0].defaultPort;
}
