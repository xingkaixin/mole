import { describe, expect, it } from "vitest";

import {
	DATABASE_TYPES,
	DEFAULT_DATABASE_TYPE,
	getDatabaseTypeLabel,
	getDefaultPort,
	normalizeDatabaseType,
} from "./databaseTypes";

describe("databaseTypes helpers", () => {
	it("normalizes unknown values to default type", () => {
		expect(normalizeDatabaseType(undefined)).toBe(DEFAULT_DATABASE_TYPE);
		expect(normalizeDatabaseType(null)).toBe(DEFAULT_DATABASE_TYPE);
		expect(normalizeDatabaseType("" as unknown as string)).toBe(
			DEFAULT_DATABASE_TYPE,
		);
	});

	it("normalizes supported values case-insensitively", () => {
		for (const option of DATABASE_TYPES) {
			expect(normalizeDatabaseType(option.value.toUpperCase())).toBe(
				option.value,
			);
		}
	});

	it("returns default for unsupported database types", () => {
		expect(normalizeDatabaseType("not-real")).toBe(DEFAULT_DATABASE_TYPE);
	});

	it("provides the corresponding labels", () => {
		for (const option of DATABASE_TYPES) {
			expect(getDatabaseTypeLabel(option.value)).toBe(option.label);
		}
	});

	it("falls back to default label when type unknown", () => {
		expect(getDatabaseTypeLabel("custom")).toBe(DATABASE_TYPES[0].label);
	});

	it("returns the default port for each database type", () => {
		for (const option of DATABASE_TYPES) {
			expect(getDefaultPort(option.value)).toBe(option.defaultPort);
		}
	});

	it("returns default port for unsupported type", () => {
		expect(getDefaultPort("unknown")).toBe(DATABASE_TYPES[0].defaultPort);
	});
});
