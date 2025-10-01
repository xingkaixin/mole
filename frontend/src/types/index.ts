export interface DatabaseConfig {
  id?: string;
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

export type AppStep = "welcome" | "config" | "tables" | "analysis" | "results";