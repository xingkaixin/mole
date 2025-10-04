"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type CreateTaskDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	onCreateTask: (name: string) => void
}

export function CreateTaskDialog({ open, onOpenChange, onCreateTask }: CreateTaskDialogProps) {
	const [taskName, setTaskName] = useState("")
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (taskName.trim()) {
			setIsSubmitting(true)
			await onCreateTask(taskName.trim())
			setTaskName("")
			setIsSubmitting(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[400px]">
				<DialogHeader>
					<DialogTitle>创建新任务</DialogTitle>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="taskName">任务名称</Label>
						<Input
							id="taskName"
							value={taskName}
							onChange={(e) => setTaskName(e.target.value)}
							placeholder="例如: 用户数据分析"
							required
							disabled={isSubmitting}
						/>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
							取消
						</Button>
						<Button type="submit" disabled={!taskName.trim() || isSubmitting}>
							{isSubmitting ? "创建中..." : "创建"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}