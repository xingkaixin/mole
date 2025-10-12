import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Sidebar } from "./Sidebar";

const clickSpy = vi.fn();

vi.mock("@/lib/logger", () => ({
	createLogger: () => ({
		click: clickSpy,
	}),
}));

beforeEach(() => {
	clickSpy.mockClear();
});

describe("Sidebar", () => {
	it("triggers navigation callbacks with logging", () => {
		const goHome = vi.fn();
		const goToTasks = vi.fn();

		render(
			<Sidebar
				onAddConnection={vi.fn()}
				onGoHome={goHome}
				onGoToTasks={goToTasks}
			/>,
		);

		fireEvent.click(screen.getByTitle("首页"));
		expect(goHome).toHaveBeenCalledTimes(1);
		expect(clickSpy).toHaveBeenCalledWith("首页");

		fireEvent.click(screen.getByTitle("任务管理"));
		expect(goToTasks).toHaveBeenCalledTimes(1);
		expect(clickSpy).toHaveBeenCalledWith("任务管理");
	});
});
