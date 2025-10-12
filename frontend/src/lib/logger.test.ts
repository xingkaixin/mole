import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogFrontendAction } from "../../wailsjs/go/backend/App";
import {
	createLogger,
	logButtonClick,
	logDatabaseOperation,
	logFormSubmit,
	logNavigation,
	logUserAction,
} from "./logger";

vi.mock("../../wailsjs/go/backend/App", () => ({
	LogFrontendAction: vi.fn(),
}));

const mockedFrontendLogger = vi.mocked(LogFrontendAction);

describe("logger utilities", () => {
	beforeEach(() => {
		mockedFrontendLogger.mockReset();
	});

	it("sends user actions to backend logger", () => {
		logUserAction("Module", "action", "details");
		expect(mockedFrontendLogger).toHaveBeenCalledWith(
			"Module",
			"action",
			"details",
		);
	});

	it("falls back to console logging when backend logging fails", () => {
		const expectedError = new Error("boom");
		mockedFrontendLogger.mockImplementation(() => {
			throw expectedError;
		});
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {
			return;
		});
		const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {
			return;
		});

		logUserAction("Module", "action", "details");

		expect(consoleError).toHaveBeenCalledWith(
			"Failed to log user action:",
			expectedError,
		);
		expect(consoleLog).toHaveBeenCalledWith(
			expect.stringMatching(/\[.*\] \[FRONTEND\] Module: action - details/),
		);
		consoleError.mockRestore();
		consoleLog.mockRestore();
	});

	it("exposes helpers bound to specific modules", () => {
		const logger = createLogger("Sidebar");
		logger.click("Save");
		logger.navigate("Home", "Settings");
		logger.formSubmit("Database", true);
		logger.databaseOperation("connect", "test", true, "ok");
		logger.error("load", "failed");
		logger.info("refresh", "done");
		logger.userAction("custom", "details");

		expect(mockedFrontendLogger).toHaveBeenNthCalledWith(
			1,
			"Sidebar",
			"click",
			"用户点击了Save按钮",
		);
		expect(mockedFrontendLogger).toHaveBeenNthCalledWith(
			2,
			"Navigation",
			"navigate",
			"从 Home 导航到 Settings",
		);
		expect(mockedFrontendLogger).toHaveBeenNthCalledWith(
			3,
			"Form",
			"submit",
			"表单 Database 提交成功",
		);
		expect(mockedFrontendLogger).toHaveBeenNthCalledWith(
			4,
			"Database",
			"connect",
			"数据库操作 connect 在 test 上执行成功: ok",
		);
		expect(mockedFrontendLogger).toHaveBeenNthCalledWith(
			5,
			"Sidebar",
			"error",
			"load 发生错误: failed",
		);
		expect(mockedFrontendLogger).toHaveBeenNthCalledWith(
			6,
			"Sidebar",
			"info",
			"refresh: done",
		);
		expect(mockedFrontendLogger).toHaveBeenNthCalledWith(
			7,
			"Sidebar",
			"custom",
			"details",
		);
	});

	it("second-level helpers delegate to logUserAction", () => {
		logButtonClick("Save", "Toolbar");
		logNavigation("Home", "Settings");
		logFormSubmit("Database", false, "oops");
		logDatabaseOperation("query", "test", false, "timeout");

		expect(mockedFrontendLogger).toHaveBeenNthCalledWith(
			1,
			"Toolbar",
			"click",
			"用户点击了Save按钮",
		);
		expect(mockedFrontendLogger).toHaveBeenNthCalledWith(
			2,
			"Navigation",
			"navigate",
			"从 Home 导航到 Settings",
		);
		expect(mockedFrontendLogger).toHaveBeenNthCalledWith(
			3,
			"Form",
			"submit",
			"表单 Database 提交失败: oops",
		);
		expect(mockedFrontendLogger).toHaveBeenNthCalledWith(
			4,
			"Database",
			"query",
			"数据库操作 query 在 test 上执行失败: timeout",
		);
	});
});
