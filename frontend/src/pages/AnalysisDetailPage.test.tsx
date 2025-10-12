import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AnalysisDetailPage } from "./AnalysisDetailPage";

vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
	},
}));

describe("AnalysisDetailPage", () => {
	beforeEach(() => {
		sessionStorage.clear();
	});

	it("renders enhanced results with search filtering", async () => {
		const onBack = vi.fn();
		render(
			<AnalysisDetailPage
				result={{
					tableName: "users",
					tableComment: "用户信息",
					results: {
						row_count: 1234,
						non_null_rate: {
							email: 0.95,
							age: 0.72,
						},
					},
					columns: [
						{ name: "email", type: "varchar", comment: "邮箱", ordinal: 1 },
						{ name: "age", type: "int", comment: "年龄", ordinal: 2 },
					],
				}}
				onBack={onBack}
			/>,
		);

		await waitFor(() =>
			expect(screen.getByText("分析结果详情")).toBeInTheDocument(),
		);
		expect(screen.getByText("users")).toBeInTheDocument();
		expect(screen.getByText("1,234")).toBeInTheDocument();
		expect(screen.getByText("邮箱")).toBeInTheDocument();

		fireEvent.change(screen.getByPlaceholderText("搜索列名..."), {
			target: { value: "email" },
		});
		expect(screen.getByText(/找到 1 个匹配项/)).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "返回任务管理" }));
		expect(onBack).toHaveBeenCalledTimes(1);
	});

	it("falls back to session storage results", async () => {
		const storedResult = {
			tableName: "orders",
			results: {
				row_count: 50,
				non_null_rate: {
					status: 0.9,
				},
			},
		};
		sessionStorage.setItem("analysisResult", JSON.stringify(storedResult));

		render(<AnalysisDetailPage onBack={() => {}} />);

		await waitFor(() => expect(screen.getByText("90%")).toBeInTheDocument());
		expect(screen.getAllByText("未知").length).toBeGreaterThan(0);
		expect(screen.getByText("50")).toBeInTheDocument();
	});
});
