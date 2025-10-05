"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { DatabaseConfig } from "@/types";
import { createLogger } from "@/lib/logger";

type ConnectionDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	connection?: DatabaseConfig | null;
	onSave: (connection: DatabaseConfig | Omit<DatabaseConfig, "id">) => void;
};

const DB_TYPES = [{ value: "MySQL", label: "MySQL", defaultPort: "3306" }];

export function ConnectionDialog({
	open,
	onOpenChange,
	connection,
	onSave,
}: ConnectionDialogProps) {
	// 创建连接对话框日志记录器
	const logger = createLogger('ConnectionDialog');

	const nameId = useId();
	const typeId = useId();
	const hostId = useId();
	const portId = useId();
	const databaseId = useId();
	const usernameId = useId();
	const passwordId = useId();

	const [formData, setFormData] = useState({
		name: "",
		type: "MySQL",
		host: "",
		port: 3306,
		database: "",
		username: "",
		password: "",
		concurrency: 5,
	});

	useEffect(() => {
		if (connection) {
			setFormData({
				name: connection.name,
				type: connection.type,
				host: connection.host,
				port: connection.port,
				database: connection.database,
				username: connection.username,
				password: connection.password,
				concurrency: connection.concurrency || 5,
			});
		} else {
			setFormData({
				name: "",
				type: "MySQL",
				host: "",
				port: 3306,
				database: "",
				username: "",
				password: "",
				concurrency: 5,
			});
		}
	}, [connection]);

	const handleTypeChange = (type: string) => {
		const dbType = DB_TYPES.find((t) => t.value === type);
		setFormData({
			...formData,
			type,
			port: dbType?.defaultPort ? parseInt(dbType.defaultPort, 10) : 3306,
		});
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		const isEdit = !!connection;
		const action = isEdit ? '编辑' : '添加';
		logger.formSubmit('数据库连接', true, `${action}数据库连接 - ${formData.name}`);

		if (connection) {
			onSave({ ...formData, id: connection.id });
		} else {
			onSave(formData);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>
						{connection ? "编辑数据库连接" : "添加数据库连接"}
					</DialogTitle>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor={nameId}>连接别名</Label>
						<Input
							id={nameId}
							value={formData.name}
							onChange={(e) =>
								setFormData({ ...formData, name: e.target.value })
							}
							placeholder="例如: Production DB"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor={typeId}>数据库类型</Label>
						<Select
							value={formData.type}
							onValueChange={handleTypeChange}
							key={formData.type} // 强制重新渲染
						>
							<SelectTrigger id={typeId}>
								<SelectValue placeholder="选择数据库类型" />
							</SelectTrigger>
							<SelectContent>
								{DB_TYPES.map((type) => (
									<SelectItem key={type.value} value={type.value}>
										{type.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="col-span-2 space-y-2">
							<Label htmlFor={hostId}>主机地址</Label>
							<Input
								id={hostId}
								value={formData.host}
								onChange={(e) =>
									setFormData({ ...formData, host: e.target.value })
								}
								placeholder="例如: localhost"
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={portId}>端口</Label>
							<Input
								id={portId}
								value={formData.port}
								onChange={(e) =>
									setFormData({ ...formData, port: Number(e.target.value) })
								}
								placeholder="3306"
								required
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor={databaseId}>数据库名称</Label>
						<Input
							id={databaseId}
							value={formData.database}
							onChange={(e) =>
								setFormData({ ...formData, database: e.target.value })
							}
							placeholder="例如: main_db"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor={usernameId}>用户名</Label>
						<Input
							id={usernameId}
							value={formData.username}
							onChange={(e) =>
								setFormData({ ...formData, username: e.target.value })
							}
							placeholder="数据库用户名"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor={passwordId}>密码</Label>
						<Input
							id={passwordId}
							type="password"
							value={formData.password}
							onChange={(e) =>
								setFormData({ ...formData, password: e.target.value })
							}
							placeholder="数据库密码"
							required
						/>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							取消
						</Button>
						<Button type="submit">{connection ? "保存" : "添加"}</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
