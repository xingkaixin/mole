import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn helper", () => {
	it("merges class names with tailwind precedence", () => {
		expect(cn("p-2", null, undefined, "bg-red-500", "bg-blue-500")).toBe(
			"p-2 bg-blue-500",
		);
	});

	it("handles conditional classes", () => {
		expect(cn("text-sm", { hidden: false, flex: true })).toBe("text-sm flex");
	});
});
