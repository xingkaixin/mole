"use client"

import type React from "react"
import { useId } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DatabaseConfig } from "@/types"

interface DatabaseConfigFormProps {
	config: DatabaseConfig;
	isAdding: boolean;
	onConfigChange: (field: keyof DatabaseConfig, value: string | number) => void;
	onTestConnection: () => void;
	onSaveConnection: () => void;
	onBack: () => void;
	connectionStatus: string;
}

export function DatabaseConfigForm({
	config,
	isAdding,
	onConfigChange,
	onTestConnection,
	onSaveConnection,
	onBack,
	connectionStatus,
}: DatabaseConfigFormProps) {
	const idPrefix = useId();

	return (
		<Card className="p-6 max-w-2xl mx-auto">
			<div className="flex justify-between items-center mb-6">
				<h2 className="text-2xl font-bold">
					{isAdding ? "添加数据库连接" : "编辑数据库连接"}
				</h2>
				<Button variant="outline" onClick={onBack}>
					返回
				</Button>
			</div>

			<form onSubmit={(e) => { e.preventDefault(); onSaveConnection(); }} className="space-y-4">
				{/* 连接名称 */}
				<div className="space-y-2">
					<Label htmlFor={`${idPrefix}-name`}>连接别名</Label>
					<Input
						id={`${idPrefix}-name`}
						value={config.name}
						onChange={(e) => onConfigChange("name", e.target.value)}
						placeholder="例如: Production DB"
						required
					/>
				</div>

				{/* 数据库类型 - 固定为 MySQL */}
				<div className="space-y-2">
					<Label htmlFor={`${idPrefix}-type`}>数据库类型</Label>
					<Select value={config.type} onValueChange={(value) => onConfigChange("type", value)}>
						<SelectTrigger id={`${idPrefix}-type`}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="MySQL">MySQL</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* 主机和端口 */}
				<div className="grid grid-cols-3 gap-4">
					<div className="col-span-2 space-y-2">
						<Label htmlFor={`${idPrefix}-host`}>主机地址</Label>
						<Input
							id={`${idPrefix}-host`}
							value={config.host}
							onChange={(e) => onConfigChange("host", e.target.value)}
							placeholder="例如: localhost"
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor={`${idPrefix}-port`}>端口</Label>
						<Input
							id={`${idPrefix}-port`}
							value={config.port}
							onChange={(e) =>
								onConfigChange("port", parseInt(e.target.value, 10) || 3306)
							}
							placeholder="3306"
							required
						/>
					</div>
				</div>

				{/* 数据库名称 */}
				<div className="space-y-2">
					<Label htmlFor={`${idPrefix}-database`}>数据库名称</Label>
					<Input
						id={`${idPrefix}-database`}
						value={config.database}
						onChange={(e) => onConfigChange("database", e.target.value)}
						placeholder="例如: main_db"
						required
					/>
				</div>

				{/* 用户名和密码 */}
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor={`${idPrefix}-username`}>用户名</Label>
						<Input
							id={`${idPrefix}-username`}
							value={config.username}
							onChange={(e) => onConfigChange("username", e.target.value)}
							placeholder="数据库用户名"
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor={`${idPrefix}-password`}>密码</Label>
						<Input
							id={`${idPrefix}-password`}
							type="password"
							value={config.password}
							onChange={(e) => onConfigChange("password", e.target.value)}
							placeholder="数据库密码"
							required
						/>
					</div>
				</div>

				{/* 并发度配置 */}
				<div className="space-y-2">
					<Label htmlFor={`${idPrefix}-concurrency`}>并发度</Label>
					<Input
						id={`${idPrefix}-concurrency`}
						type="number"
						value={config.concurrency || 5}
						onChange={(e) =>
							onConfigChange("concurrency", parseInt(e.target.value, 10) || 5)
						}
						placeholder="5"
						min="1"
						max="20"
					/>
					<p className="text-xs text-muted-foreground mt-1">
						同时分析表的数量，默认为5
					</p>
				</div>

				{connectionStatus && (
					<div
						className={`p-3 rounded text-sm ${
							connectionStatus.includes("成功")
								? "bg-green-100 text-green-800"
								: "bg-red-100 text-red-800"
						}`}
					>
						{connectionStatus}
					</div>
				)}

				<div className="flex gap-4 pt-4">
					<Button type="button" onClick={onTestConnection} variant="outline">
						测试连接
					</Button>
					<Button type="submit">
						{isAdding ? "添加" : "保存"}
					</Button>
				</div>
			</form>
		</Card>
	);
}
