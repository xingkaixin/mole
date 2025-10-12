import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TaskManagementPage } from "./TaskManagementPage";

const backend = {
	GetAllTasks: vi.fn(),
	GetAllConnectionsWithMetadata: vi.fn(),
	GetTaskTables: vi.fn(),
	CreateTask: vi.fn(),
	AddTablesToTask: vi.fn(),
	RemoveTableFromTask: vi.fn(),
	StartTaskAnalysis: vi.fn(),
	CancelTableAnalysis: vi.fn(),
	GetTableAnalysisResult: vi.fn(),
	GetEnhancedAnalysisResult: vi.fn(),
};

vi.mock("../../wailsjs/go/backend/App", () => backend);

vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
	},
}));

vi.mock("@/components/add-table-dialog", () => {
	const React = require("react");
	return {
		AddTableDialog: ({ open, onAddTables }: any) => {
			React.useEffect(() => {
				if (open) {
					onAddTables(["table-new"]);
				}
			}, [open, onAddTables]);
			return open ? <div data-testid="add-table-dialog" /> : null;
		},
	};
});

vi.mock("@/components/create-task-dialog", () => {
	const React = require("react");
	return {
		CreateTaskDialog: ({ open, onCreateTask }: any) => {
			const triggered = React.useRef(false);
			React.useEffect(() => {
				if (open && !triggered.current) {
					triggered.current = true;
					onCreateTask("新任务");
				}
			}, [open, onCreateTask]);
			return open ? <div data-testid="create-task-dialog" /> : null;
		},
	};
});

vi.mock("@/components/ui/select", () => {
	return {
		Select: ({ value, onValueChange, disabled, children }: any) => (
			<select
				data-testid="task-selector"
				value={value}
				onChange={(event) => onValueChange(event.target.value)}
				disabled={disabled}
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

type TableOverrides = Partial<{
	id: string;
	tableId: string;
	tableName: string;
	connectionName: string;
	tblStatus: string;
	rowCount: number;
	tableSize: number;
	columnCount: number;
}>;

const makeTable = (overrides: TableOverrides = {}) => ({
	id: `task-table-${Math.random()}`,
	tableId: overrides.tableId || "tbl",
	tableName: overrides.tableName || "table",
	connectionName: overrides.connectionName || "Connection",
	tblStatus: overrides.tblStatus || "待分析",
	rowCount: overrides.rowCount ?? 10,
	tableSize: overrides.tableSize ?? 100,
	columnCount: overrides.columnCount ?? 3,
});

describe("TaskManagementPage", () => {
	beforeEach(() => {
		for (const fn of Object.values(backend)) {
			fn.mockReset();
		}

		backend.GetAllTasks.mockResolvedValueOnce([
			{ id: "task1", name: "任务一" },
			{ id: "task2", name: "任务二" },
		]).mockResolvedValue([
			{ id: "task1", name: "任务一" },
			{ id: "task2", name: "任务二" },
			{ id: "task3", name: "新任务" },
		]);

		backend.GetAllConnectionsWithMetadata.mockResolvedValue([
			{ id: "conn1", name: "连接一" },
		]);

		backend.GetTaskTables.mockResolvedValue([
			makeTable({
				id: "tbl1",
				tableId: "tbl-1",
				tableName: "users",
				connectionName: "主库",
				tblStatus: "待分析",
				tableSize: 100,
			}),
			makeTable({
				id: "tbl2",
				tableId: "tbl-2",
				tableName: "orders",
				connectionName: "分析库",
				tblStatus: "分析完成",
				tableSize: 1500,
				rowCount: 5000,
			}),
			makeTable({
				id: "tbl3",
				tableId: "tbl-3",
				tableName: "logs",
				connectionName: "日志库",
				tblStatus: "分析中",
				tableSize: 5 * 1024 * 1024,
				rowCount: 120000,
			}),
			makeTable({
				id: "tbl4",
				tableId: "tbl-4",
				tableName: "archived",
				connectionName: "冷库",
				tblStatus: "未知",
				tableSize: 5 * 1024 * 1024 * 1024,
				rowCount: 42,
			}),
		]);

		backend.CreateTask.mockResolvedValue({ status: "success", id: "task3" });
		backend.AddTablesToTask.mockResolvedValue({
			status: "success",
			message: "已添加",
		});
		backend.RemoveTableFromTask.mockResolvedValue({
			status: "success",
			message: "已移除",
		});
		backend.StartTaskAnalysis.mockResolvedValue({
			status: "success",
			message: "开始分析",
		});
		backend.CancelTableAnalysis.mockResolvedValue({
			status: "success",
			message: "已取消",
		});
		backend.GetEnhancedAnalysisResult.mockResolvedValue({
			status: "success",
			result: {},
		});
		backend.GetTableAnalysisResult.mockResolvedValue({
			status: "success",
			results: {},
		});
	});

	it("loads tasks, filters tables, and navigates to analysis", async () => {
		const onNavigate = vi.fn();
		render(<TaskManagementPage onNavigateToAnalysisDetail={onNavigate} />);

		await waitFor(() => expect(backend.GetAllTasks).toHaveBeenCalledTimes(1));
		expect(screen.getByText("任务管理")).toBeInTheDocument();
		const selector = await screen.findByTestId("task-selector");

		await waitFor(() => expect(selector).toHaveValue("task1"));

		fireEvent.click(screen.getByRole("button", { name: "添加表" }));
		await waitFor(() =>
			expect(backend.AddTablesToTask.mock.calls.length).toBeGreaterThanOrEqual(
				1,
			),
		);
		await waitFor(() =>
			expect(backend.GetTaskTables.mock.calls.length).toBeGreaterThanOrEqual(1),
		);

		await waitFor(() => expect(screen.getByText("users")).toBeInTheDocument());

		fireEvent.change(screen.getByPlaceholderText("搜索表名或连接名..."), {
			target: { value: "orders" },
		});
		expect(screen.getByText("orders")).toBeInTheDocument();
		fireEvent.change(screen.getByPlaceholderText("搜索表名或连接名..."), {
			target: { value: "不存在" },
		});
		expect(screen.getByText("未找到匹配的表")).toBeInTheDocument();
		fireEvent.change(screen.getByPlaceholderText("搜索表名或连接名..."), {
			target: { value: "" },
		});

		expect(screen.getByText("100 B")).toBeInTheDocument();
		expect(screen.getByText("1.5 KB")).toBeInTheDocument();
		expect(screen.getByText("5.0 MB")).toBeInTheDocument();
		expect(screen.getByText("5.0 GB")).toBeInTheDocument();

		fireEvent.click(screen.getByTitle("查看分析详情"));
		await waitFor(() => expect(onNavigate).toHaveBeenCalled());
		expect(backend.GetEnhancedAnalysisResult).toHaveBeenCalled();

		const logsRow = screen.getByText("logs").closest("tr");
		expect(logsRow).not.toBeNull();
		const buttons = within(logsRow as HTMLElement).getAllByRole("button");
		fireEvent.click(buttons[0]);
		await waitFor(() => expect(backend.CancelTableAnalysis).toHaveBeenCalled());
	});

	it("handles task creation and table mutations", async () => {
		const onNavigate = vi.fn();
		render(<TaskManagementPage onNavigateToAnalysisDetail={onNavigate} />);

		await waitFor(() => expect(backend.GetAllTasks).toHaveBeenCalledTimes(1));
		expect(screen.getByText("任务管理")).toBeInTheDocument();
		await screen.findByTestId("task-selector");

		fireEvent.click(screen.getByRole("button", { name: "添加表" }));
		await waitFor(() =>
			expect(backend.AddTablesToTask.mock.calls.length).toBeGreaterThanOrEqual(
				1,
			),
		);
		await waitFor(() =>
			expect(backend.GetTaskTables.mock.calls.length).toBeGreaterThanOrEqual(1),
		);
		await waitFor(() => expect(screen.getByText("users")).toBeInTheDocument());

		fireEvent.click(screen.getByRole("button", { name: "创建任务" }));
		await waitFor(() => expect(backend.CreateTask).toHaveBeenCalled());
		await waitFor(() =>
			expect(backend.GetAllTasks.mock.calls.length).toBeGreaterThanOrEqual(2),
		);
		fireEvent.change(screen.getByTestId("task-selector"), {
			target: { value: "task1" },
		});

		fireEvent.click(screen.getByRole("button", { name: "添加表" }));
		await waitFor(() =>
			expect(backend.AddTablesToTask.mock.calls.length).toBeGreaterThanOrEqual(
				2,
			),
		);
		await waitFor(() =>
			expect(backend.GetTaskTables.mock.calls.length).toBeGreaterThanOrEqual(2),
		);
		expect(screen.getByRole("button", { name: "开始分析" })).not.toBeDisabled();

		fireEvent.click(screen.getByRole("button", { name: "开始分析" }));
		await waitFor(() => expect(backend.StartTaskAnalysis).toHaveBeenCalled());

		fireEvent.click(screen.getAllByText("移除")[0]);
		await waitFor(() => expect(backend.RemoveTableFromTask).toHaveBeenCalled());

		fireEvent.change(screen.getByTestId("task-selector"), {
			target: { value: "task2" },
		});
		expect(backend.GetTaskTables.mock.calls.length).toBeGreaterThanOrEqual(4);
	});
});
