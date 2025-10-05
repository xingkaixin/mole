import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sidebar } from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import { AnalysisDetailPage } from "@/pages/AnalysisDetailPage";
import { AnalysisTablesPage } from "@/pages/AnalysisTablesPage";
import { ConfigPage } from "@/pages/ConfigPage";
import { TableSelectionPage } from "@/pages/TablesPage";
import { TaskManagementPage } from "@/pages/TaskManagementPage";
import { WelcomePage } from "@/pages/WelcomePage";
import type {
  AppStep,
  DatabaseConfig,
  RuleResult,
  TableInfo,
  TableMetadata,
} from "@/types";
import {
  ConnectDatabase,
  DeleteDatabaseConnection,
  GetDatabaseConnections,
  GetTableSelections,
  GetTables,
  GetTablesMetadata,
  SaveDatabaseConnection,
  SaveTableSelections,
  StartAnalysisTasks,
  TestDatabaseConnection,
} from "../wailsjs/go/backend/App.js";

function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>("welcome");
  const [previousStep, setPreviousStep] = useState<AppStep | null>(null);
  const [connections, setConnections] = useState<DatabaseConfig[]>([]);
  const [currentConnection, setCurrentConnection] =
    useState<DatabaseConfig | null>(null);
  const [currentAnalysisResult, setCurrentAnalysisResult] = useState<
    any | null
  >(null);
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>({
    id: "",
    name: "",
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "root",
    password: "",
    database: "",
    concurrency: 5, // 默认并发度
  });
  const [connectionStatus, setConnectionStatus] = useState<string>("");
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [tempSelectedTables, setTempSelectedTables] = useState<string[]>([]);
  const [_analysisResults, _setAnalysisResults] = useState<RuleResult[]>([]);
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
    value: string | number
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
        error instanceof Error ? error.message : String(error)
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
          conn.id === connectionToSave.id ? connectionToSave : conn
        );
      }
      saveConnections(newConnections);

      setCurrentConnection(connectionToSave);
      setIsAddingConnection(false);

      // 返回首页
      setCurrentStep("welcome");

      toast.success(isAddingConnection ? "连接添加成功" : "连接更新成功");
    } catch (_error) {
      toast.error("连接测试失败，请检查配置");
    }
  };

  const duplicateConnection = async (connection: DatabaseConfig) => {
    try {
      const duplicatedConnection: DatabaseConfig = {
        ...connection,
        id: Date.now().toString(), // 生成新的ID
        name: `${connection.name} _duplicate`, // 添加duplicate后缀
      };

      // 保存到后端存储
      await SaveDatabaseConnection(duplicatedConnection);

      // 更新本地状态
      const newConnections = [...connections, duplicatedConnection];
      saveConnections(newConnections);

      toast.success("连接复制成功");
    } catch (error) {
      console.error("Failed to duplicate connection:", error);
      toast.error("连接复制失败");
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
          tableInfos.some((table) => table.name === tableName)
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
          (tableName) => !tableInfos.some((table) => table.name === tableName)
        );

        if (missingTables.length > 0) {
          console.warn(`以下表已不存在: ${missingTables.join(", ")}`);
        }
      } catch (error) {
        console.warn("Failed to load saved table selections:", error);
        setSelectedTables([]);
      }

      setCurrentStep("analysis_tables");
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

  // 临时表选择切换 - 只在表选择页面使用，不立即保存
  const toggleTempTableSelection = (table: string) => {
    const newTempSelectedTables = tempSelectedTables.includes(table)
      ? tempSelectedTables.filter((t) => t !== table)
      : [...tempSelectedTables, table];

    setTempSelectedTables(newTempSelectedTables);
  };

  const _handleSelectAll = async () => {
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

  const _handleDeselectAll = async () => {
    setSelectedTables([]);

    // 保存选择状态到后端
    try {
      await SaveTableSelections([]);
    } catch (error) {
      console.warn("Failed to save table selections:", error);
    }
  };

  // 临时批量选择 - 只在表选择页面使用
  const handleTempSelectAll = () => {
    // 只选择存在的表
    const existingTables = tables
      .filter((table) => table.exists)
      .map((table) => table.name);

    setTempSelectedTables(existingTables);
  };

  const handleTempDeselectAll = () => {
    setTempSelectedTables([]);
  };

  // 加载表元数据
  const handleLoadMetadata = async (tableNames: string[]) => {
    try {
      const metadata = await GetTablesMetadata(tableNames);
      return metadata;
    } catch (error) {
      console.error("Failed to load table metadata:", error);
      // 返回空的元数据对象
      const emptyMetadata: Record<string, TableMetadata> = {};
      tableNames.forEach((tableName) => {
        emptyMetadata[tableName] = { error: "Failed to load metadata" };
      });
      return emptyMetadata;
    }
  };

  const startAnalysis = async () => {
    if (selectedTables.length === 0) {
      toast.error("请选择至少一个表进行分析");
      return;
    }

    if (!currentConnection) {
      toast.error("请先选择数据库连接");
      return;
    }

    setCurrentStep("analysis");

    try {
      // 使用新的并发分析系统
      const taskId = await StartAnalysisTasks(
        currentConnection.id,
        selectedTables
      );
      console.log("Analysis task started:", taskId);
      toast.success("分析任务已启动");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      setCurrentStep("analysis_tables");
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
      concurrency: 5,
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
      connections
    );
    try {
      await DeleteDatabaseConnection(connectionId);
      const newConnections = connections.filter(
        (conn) => conn.id !== connectionId
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
    } else if (previousStep) {
      setCurrentStep(previousStep);
      setPreviousStep(null);
    } else {
      setCurrentStep("welcome");
    }
  };

  const handleAddTables = () => {
    setPreviousStep(currentStep);
    setTempSelectedTables([...selectedTables]); // 进入时加载当前已选表作为临时状态
    setCurrentStep("table_selection");
  };

  const handleConfirmSelection = async () => {
    // 只在确认时保存选择状态到数据库
    setSelectedTables(tempSelectedTables);
    try {
      await SaveTableSelections(tempSelectedTables);
    } catch (error) {
      console.warn("Failed to save table selections:", error);
    }
    setCurrentStep("analysis_tables");
    setPreviousStep(null);
  };

  const _handleReanalyze = () => {
    setCurrentStep("analysis_tables");
  };

  const handleGoHome = () => {
    setCurrentStep("welcome");
  };

  const handleGoToTasks = () => {
    setCurrentStep("tasks");
  };

  const handleUpdateMetadata = async (connectionId: string) => {
    try {
      // 这里我们可以直接调用后端API，但为了保持一致性和更好的用户体验，
      // 我们让DatabaseCard组件自己处理这个逻辑
      toast.info("正在更新字典元数据...");
    } catch (error) {
      console.error("Failed to update metadata:", error);
      toast.error("更新字典失败");
    }
  };

  const handleNavigateToAnalysisDetail = (result: any) => {
    setPreviousStep(currentStep);
    setCurrentAnalysisResult(result);
    setCurrentStep("analysis_detail");
  };

  const handleBackFromAnalysisDetail = () => {
    setCurrentAnalysisResult(null);
    if (previousStep) {
      setCurrentStep(previousStep);
      setPreviousStep(null);
    } else {
      setCurrentStep("tasks");
    }
  };

  return (
    <div className="h-screen flex bg-white">
      <Toaster />

      {/* 左侧功能栏 */}
      <Sidebar
        onAddConnection={handleAddConnection}
        onGoHome={handleGoHome}
        onGoToTasks={handleGoToTasks}
      />

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
            onDuplicateConnection={duplicateConnection}
            onUpdateMetadata={handleUpdateMetadata}
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

        {currentStep === "analysis_tables" && (
          <AnalysisTablesPage
            selectedTables={selectedTables}
            onRemoveTable={toggleTableSelection}
            onAddTables={handleAddTables}
            onStartAnalysis={startAnalysis}
            onBack={handleBack}
            onLoadMetadata={handleLoadMetadata}
          />
        )}

        {currentStep === "table_selection" && (
          <TableSelectionPage
            tables={tables}
            selectedTables={tempSelectedTables}
            onTableToggle={toggleTempTableSelection}
            onSelectAll={handleTempSelectAll}
            onDeselectAll={handleTempDeselectAll}
            onBack={handleBack}
            onConfirmSelection={handleConfirmSelection}
          />
        )}

        {currentStep === "tasks" && (
          <TaskManagementPage
            onNavigateToAnalysisDetail={handleNavigateToAnalysisDetail}
          />
        )}

        {currentStep === "analysis_detail" && (
          <AnalysisDetailPage
            result={currentAnalysisResult}
            onBack={handleBackFromAnalysisDetail}
          />
        )}
      </div>
    </div>
  );
}

export default App;
