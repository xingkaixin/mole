import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WelcomePage } from "./WelcomePage";

vi.mock("@/components/database-card", () => ({
	DatabaseCard: ({ connection }: any) => (
		<div data-testid="database-card">{connection.name}</div>
	),
}));

vi.mock("@/components/ui/dialog", () => {
	return {
		Dialog: ({ open, onOpenChange, children }: any) => (
			<div data-testid="dialog" data-open={open}>
				<button
					type="button"
					onClick={() => onOpenChange(!open)}
					data-testid="dialog-toggle"
				/>
				{open ? children : null}
			</div>
		),
		DialogContent: ({ children }: any) => <div>{children}</div>,
		DialogHeader: ({ children }: any) => <div>{children}</div>,
		DialogFooter: ({ children }: any) => <div>{children}</div>,
		DialogTitle: ({ children }: any) => <div>{children}</div>,
		DialogDescription: ({ children }: any) => <div>{children}</div>,
	};
});

vi.mock("@/components/ui/select", () => {
	return {
		Select: ({ value, onValueChange, children }: any) => (
			<select
				data-testid="type-filter"
				value={value}
				onChange={(event) => onValueChange(event.target.value)}
			>
				{children}
			</select>
		),
		SelectTrigger: ({ children }: any) => <>{children}</>,
		SelectContent: ({ children }: any) => <>{children}</>,
		SelectItem: ({ value, children }: any) => (
			<option value={value}>{children}</option>
		),
		SelectValue: ({ placeholder }: any) => <>{placeholder}</>,
	};
});

vi.mock("@/lib/logger", () => ({
	createLogger: () => ({
		info: vi.fn(),
		click: vi.fn(),
	}),
}));

describe("WelcomePage", () => {
	const baseConnections = [
		{
			id: "1",
			name: "Prod",
			type: "mysql",
			host: "prod.db",
			database: "prod",
		},
		{
			id: "2",
			name: "Analytics",
			type: "postgresql",
			host: "analytics.db",
			database: "warehouse",
		},
	];

	const handlers = {
		onAddConnection: vi.fn(),
		onEditConnection: vi.fn(),
		onDeleteConnection: vi.fn(),
		onSelectConnection: vi.fn(),
		onDuplicateConnection: vi.fn(),
		onUpdateMetadata: vi.fn(),
	};

	beforeEach(() => {
		for (const fn of Object.values(handlers)) {
			fn.mockReset();
		}
	});

	it("renders empty state and triggers add", () => {
		render(<WelcomePage connections={[]} {...handlers} />);

		fireEvent.click(screen.getByRole("button", { name: "添加数据库连接" }));
		expect(handlers.onAddConnection).toHaveBeenCalledTimes(1);
	});

	it("filters connections and clears filters", () => {
		render(<WelcomePage connections={baseConnections as any} {...handlers} />);

		expect(screen.getAllByTestId("database-card")).toHaveLength(2);

		fireEvent.change(
			screen.getByPlaceholderText("搜索别名、主机地址、数据库名..."),
			{
				target: { value: "prod" },
			},
		);
		expect(screen.getByText(/找到 1 个匹配项/)).toBeInTheDocument();

		const select = screen.getByTestId("type-filter");
		fireEvent.change(select, { target: { value: "postgresql" } });
		expect(screen.getByText(/找到 0 个匹配项/)).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "清除筛选" }));
		expect(screen.queryByText(/找到/)).not.toBeInTheDocument();
	});
});
