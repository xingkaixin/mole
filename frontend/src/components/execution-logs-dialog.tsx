"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

type TaskExecution = {
	id: string
	startTime: string
	endTime: string
	status: "success" | "failed" | "running"
	tablesAnalyzed: number
	results: string
}

type ExecutionLogsDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	taskName: string
	executions: TaskExecution[]
}

export function ExecutionLogsDialog({ open, onOpenChange, taskName, executions }: ExecutionLogsDialogProps) {
	const getStatusBadge = (status: string) => {
		switch (status) {
			case "success":
				return <Badge variant="default" className="bg-green-500">成功</Badge>
			case "failed":
				return <Badge variant="destructive">失败</Badge>
			case "running":
				return <Badge variant="default" className="bg-blue-500">运行中</Badge>
			default:
				return <Badge variant="outline">未知</Badge>
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>执行日志 - {taskName}</DialogTitle>
				</DialogHeader>

				<ScrollArea className="flex-1">
					<div className="space-y-4">
						{executions.length > 0 ? (
							executions.map((execution) => (
								<div key={execution.id} className="border border-border rounded-lg p-4 space-y-3">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<span className="text-sm font-medium">执行ID: {execution.id}</span>
											{getStatusBadge(execution.status)}
										</div>
										<span className="text-xs text-muted-foreground">
											{execution.startTime}
										</span>
									</div>

									<div className="grid grid-cols-2 gap-4 text-sm">
										<div>
											<span className="text-muted-foreground">开始时间:</span>
											<p>{execution.startTime}</p>
										</div>
										<div>
											<span className="text-muted-foreground">结束时间:</span>
											<p>{execution.endTime}</p>
										</div>
										<div>
											<span className="text-muted-foreground">分析表数:</span>
											<p>{execution.tablesAnalyzed}</p>
										</div>
										<div>
											<span className="text-muted-foreground">执行结果:</span>
											<p>{execution.results}</p>
										</div>
									</div>
								</div>
							))
						) : (
							<div className="text-center py-12 text-muted-foreground">
								<p>暂无执行记录</p>
							</div>
						)}
					</div>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	)
}