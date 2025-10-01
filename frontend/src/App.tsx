import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sidebar } from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import { AnalysisPage } from "@/pages/AnalysisPage";
import { ConfigPage } from "@/pages/ConfigPage";
import { ResultsPage } from "@/pages/ResultsPage";
import { TablesPage } from "@/pages/TablesPage";
import { WelcomePage } from "@/pages/WelcomePage";
import type { AppStep, DatabaseConfig, RuleResult, TableInfo } from "@/types";
import {
	AnalyzeTables,
	ConnectDatabase,
	DeleteDatabaseConnection,
	GetDatabaseConnections,
	GetTableSelections,
	GetTables,
	SaveDatabaseConnection,
	SaveTableSelections,
	TestDatabaseConnection,
} from "../wailsjs/go/backend/App.js";

function App() {
	const [currentStep, setCurrentStep] = useState<AppStep>("welcome");
	const [connections, setConnections] = useState<DatabaseConfig[]>([]);
	const [currentConnection, setCurrentConnection] =
		useState<DatabaseConfig | null>(null);
	const [dbConfig, setDbConfig] = useState<DatabaseConfig>({
		id: "",
		name: "",
		type: "mysql",
		host: "localhost",
		port: 3306,
		username: "root",
		password: "",
		database: "",
	});
	const [connectionStatus, setConnectionStatus] = useState<string>("");
	const [tables, setTables] = useState<TableInfo[]>([]);
	const [selectedTables, setSelectedTables] = useState<string[]>([]);
	const [analysisResults, setAnalysisResults] = useState<RuleResult[]>([]);
	const [isAddingConnection, setIsAddingConnection] = useState(false);

	// 从后端存储加载保存的连接
	useEffect(() => {
		const loadConnections = async () => {
			try {
				const savedConnections = await GetDatabaseConnections();
				setConnections(savedConnections || []);
			} catch (error) {
				console.error("Failed to load connections:", error);
				setConnections([]);
			}
		};
		loadConnections();
	}, []);

	// 保存连接到后端存储
	const saveConnections = async (newConnections: DatabaseConfig[]) => {
		setConnections(newConnections);
		// 注意：这里我们不再需要手动保存到localStorage
		// 每个连接在创建时已经通过SaveDatabaseConnection保存到后端
	};

	const updateConfig = (
		field: keyof DatabaseConfig,
		value: string | number,
	) => {
		setDbConfig((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const testConnection = async () => {
		try {
			const result = await TestDatabaseConnection(dbConfig);
			setConnectionStatus(result);
			toast.success("连接测试成功");
		} catch (error) {
			setConnectionStatus(
				error instanceof Error ? error.message : String(error),
			);
			toast.error("连接测试失败");
		}
	};

	const saveConnection = async () => {
		if (!dbConfig.name.trim()) {
			toast.error("请输入连接名称");
			return;
		}

		try {
			await TestDatabaseConnection(dbConfig);

			const connectionToSave: DatabaseConfig = {
				...dbConfig,
				// 如果是新增连接，生成新ID；如果是编辑，保持原ID
				id: dbConfig.id || Date.now().toString(),
			};

			// 保存到后端存储
			await SaveDatabaseConnection(connectionToSave);

			// 更新本地状态
			let newConnections: DatabaseConfig[];
			if (isAddingConnection) {
				// 新增连接
				newConnections = [...connections, connectionToSave];
			} else {
				// 编辑连接 - 替换原有连接
				newConnections = connections.map((conn) =>
					conn.id === connectionToSave.id ? connectionToSave : conn,
				);
			}
			saveConnections(newConnections);

			setCurrentConnection(connectionToSave);
			setIsAddingConnection(false);

			// 自动连接并获取表清单
			await connectAndGetTables(connectionToSave);

			toast.success(isAddingConnection ? "连接添加成功" : "连接更新成功");
		} catch (_error) {
			toast.error("连接测试失败，请检查配置");
		}
	};

	const connectAndGetTables = async (connection?: DatabaseConfig) => {
		const config = connection || currentConnection;
		if (!config) return;

		try {
			await ConnectDatabase(config);
			const tableList = await GetTables();

			// 将表列表转换为TableInfo格式，初始状态为存在
			const tableInfos: TableInfo[] = tableList.map((name) => ({
				name,
				exists: true,
			}));

			setTables(tableInfos);

			// 加载已保存的表选择状态
			try {
				const savedSelections = await GetTableSelections();

				// 验证已保存的表是否仍然存在
				const validSelections = savedSelections.filter((tableName) =>
					tableInfos.some((table) => table.name === tableName),
				);

				// 标记不存在的表
				const updatedTables = tableInfos.map((table) => ({
					...table,
					exists: true, // 新获取的表默认都存在
				}));

				setTables(updatedTables);
				setSelectedTables(validSelections);

				// 如果有不存在的表，显示警告
				const missingTables = savedSelections.filter(
					(tableName) => !tableInfos.some((table) => table.name === tableName),
				);

				if (missingTables.length > 0) {
					console.warn(`以下表已不存在: ${missingTables.join(", ")}`);
				}
			} catch (error) {
				console.warn("Failed to load saved table selections:", error);
				setSelectedTables([]);
			}

			setCurrentStep("tables");
			toast.success("连接成功，已获取表清单");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : String(error));
		}
	};

	const toggleTableSelection = async (table: string) => {
		const newSelectedTables = selectedTables.includes(table)
			? selectedTables.filter((t) => t !== table)
			: [...selectedTables, table];

		setSelectedTables(newSelectedTables);

		// 保存选择状态到后端
		try {
			await SaveTableSelections(newSelectedTables);
		} catch (error) {
			console.warn("Failed to save table selections:", error);
		}
	};

	const handleSelectAll = async () => {
		// 只选择存在的表
		const existingTables = tables
			.filter((table) => table.exists)
			.map((table) => table.name);

		setSelectedTables(existingTables);

		// 保存选择状态到后端
		try {
			await SaveTableSelections(existingTables);
		} catch (error) {
			console.warn("Failed to save table selections:", error);
		}
	};

	const handleDeselectAll = async () => {
		setSelectedTables([]);

		// 保存选择状态到后端
		try {
			await SaveTableSelections([]);
		} catch (error) {
			console.warn("Failed to save table selections:", error);
		}
	};

	const startAnalysis = async () => {
		if (selectedTables.length === 0) {
			toast.error("请选择至少一个表进行分析");
			return;
		}

		setCurrentStep("analysis");

		try {
			const results = await AnalyzeTables(selectedTables);
			setAnalysisResults(results);
			setCurrentStep("results");
			toast.success("分析完成");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : String(error));
			setCurrentStep("tables");
		}
	};

	const handleAddConnection = () => {
		setDbConfig({
			id: "",
			name: "",
			type: "mysql",
			host: "localhost",
			port: 3306,
			username: "root",
			password: "",
			database: "",
		});
		setConnectionStatus("");
		setIsAddingConnection(true);
		setCurrentStep("config");
	};

	const handleEditConnection = (connection: DatabaseConfig) => {
		setDbConfig(connection);
		setConnectionStatus("");
		setIsAddingConnection(false);
		setCurrentStep("config");
	};

	const handleDeleteConnection = async (connectionId: string) => {
		console.log(
			"Deleting connection:",
			connectionId,
			"current connections:",
			connections,
		);
		try {
			await DeleteDatabaseConnection(connectionId);
			const newConnections = connections.filter(
				(conn) => conn.id !== connectionId,
			);
			console.log("New connections after delete:", newConnections);
			saveConnections(newConnections);

			// 如果删除的是当前选中的连接，清理 currentConnection
			if (currentConnection?.id === connectionId) {
				console.log("Clearing current connection");
				setCurrentConnection(null);
			}

			toast.success("连接已删除");
		} catch (error) {
			toast.error("删除连接失败");
			console.error("Failed to delete connection:", error);
		}
	};

	const handleSelectConnection = (connection: DatabaseConfig) => {
		setCurrentConnection(connection);
		connectAndGetTables(connection);
	};

	const handleBack = () => {
		if (isAddingConnection) {
			setCurrentStep("welcome");
			setIsAddingConnection(false);
		} else {
			setCurrentStep("welcome");
		}
	};

	const handleReanalyze = () => {
		setCurrentStep("tables");
	};

	const handleGoHome = () => {
		setCurrentStep("welcome");
	};

	return (
		<div className="h-screen flex bg-white">
			<Toaster />

			{/* 左侧功能栏 */}
			<Sidebar onAddConnection={handleAddConnection} onGoHome={handleGoHome} />

			{/* 主内容区域 */}
			<div className="flex-1 overflow-auto">
				{currentStep === "welcome" && (
					<WelcomePage
						key={connections.length} // 强制重新渲染当连接数量变化时
						connections={connections}
						onAddConnection={handleAddConnection}
						onEditConnection={handleEditConnection}
						onDeleteConnection={handleDeleteConnection}
						onSelectConnection={handleSelectConnection}
					/>
				)}

				{currentStep === "config" && (
					<ConfigPage
						config={dbConfig}
						isAdding={isAddingConnection}
						onConfigChange={updateConfig}
						onTestConnection={testConnection}
						onSaveConnection={saveConnection}
						onBack={handleBack}
						connectionStatus={connectionStatus}
					/>
				)}

				{currentStep === "tables" && (
					<TablesPage
						tables={tables}
						selectedTables={selectedTables}
						onTableToggle={toggleTableSelection}
						onSelectAll={handleSelectAll}
						onDeselectAll={handleDeselectAll}
						onBack={handleBack}
						onStartAnalysis={startAnalysis}
					/>
				)}

				{currentStep === "analysis" && (
					<AnalysisPage selectedTablesCount={selectedTables.length} />
				)}

				{currentStep === "results" && (
					<ResultsPage
						results={analysisResults}
						onReanalyze={handleReanalyze}
					/>
				)}
			</div>
		</div>
	);
}

export default App;
