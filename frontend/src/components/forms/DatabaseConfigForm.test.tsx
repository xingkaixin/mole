import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DatabaseConfigForm } from "./DatabaseConfigForm";

vi.mock("@/components/ui/select", () => {
	return {
		Select: ({ value, onValueChange, children }: any) => (
			<select
				data-testid="db-type-select"
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

const baseConfig = {
	id: "1",
	name: "Primary",
	type: "mysql",
	host: "localhost",
	port: 3306,
	username: "root",
	password: "secret",
	database: "main",
	concurrency: 5,
};

describe("DatabaseConfigForm", () => {
	const onConfigChange = vi.fn();
	const onTestConnection = vi.fn();
	const onSaveConnection = vi.fn();
	const onBack = vi.fn();

	beforeEach(() => {
		onConfigChange.mockReset();
		onTestConnection.mockReset();
		onSaveConnection.mockReset();
		onBack.mockReset();
	});

	it("updates fields and announces type changes", () => {
		render(
			<DatabaseConfigForm
				config={baseConfig}
				isAdding
				onConfigChange={onConfigChange}
				onTestConnection={onTestConnection}
				onSaveConnection={onSaveConnection}
				onBack={onBack}
				connectionStatus=""
			/>,
		);

		fireEvent.change(screen.getByLabelText("连接别名"), {
			target: { value: "Updated" },
		});
		fireEvent.change(screen.getByLabelText("主机地址"), {
			target: { value: "db" },
		});
		fireEvent.change(screen.getByLabelText("端口"), {
			target: { value: "5432" },
		});

		const select = screen.getByTestId("db-type-select");
		fireEvent.change(select, { target: { value: "postgresql" } });

		expect(onConfigChange).toHaveBeenCalledWith("name", "Updated");
		expect(onConfigChange).toHaveBeenCalledWith("host", "db");
		expect(onConfigChange).toHaveBeenCalledWith("port", 5432);
		expect(onConfigChange).toHaveBeenCalledWith("type", "postgresql");
		expect(onConfigChange).toHaveBeenCalledWith("port", 5432);
	});

	it("submits form and triggers connection test", () => {
		render(
			<DatabaseConfigForm
				config={baseConfig}
				isAdding={false}
				onConfigChange={onConfigChange}
				onTestConnection={onTestConnection}
				onSaveConnection={onSaveConnection}
				onBack={onBack}
				connectionStatus="连接成功"
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "测试连接" }));
		expect(onTestConnection).toHaveBeenCalledTimes(1);

		const formElement = document.querySelector("form");
		expect(formElement).not.toBeNull();
		fireEvent.submit(formElement as HTMLFormElement);
		expect(onSaveConnection).toHaveBeenCalledTimes(1);

		fireEvent.click(screen.getByRole("button", { name: "返回" }));
		expect(onBack).toHaveBeenCalledTimes(1);

		expect(screen.getByText("连接成功")).toBeInTheDocument();
	});
});
