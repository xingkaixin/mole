import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner"
import { toast } from "sonner"
import {
  TestDatabaseConnection,
  ConnectDatabase,
  GetTables,
  AnalyzeTables,
  SaveDatabaseConnection,
  GetDatabaseConnections,
  DeleteDatabaseConnection,
} from "../wailsjs/go/backend/App.js";
import { Sidebar } from "@/components/Sidebar";
import { WelcomePage } from "@/pages/WelcomePage";
import { ConfigPage } from "@/pages/ConfigPage";
import { TablesPage } from "@/pages/TablesPage";
import { AnalysisPage } from "@/pages/AnalysisPage";
import { ResultsPage } from "@/pages/ResultsPage";
import type { DatabaseConfig, RuleResult, AppStep } from "@/types";

function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>("welcome");
  const [connections, setConnections] = useState<DatabaseConfig[]>([]);
  const [currentConnection, setCurrentConnection] = useState<DatabaseConfig | null>(null);
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>({
    id: "",
    name: "",
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "root",
    password: "",
    database: ""
  });
  const [connectionStatus, setConnectionStatus] = useState<string>("");
  const [tables, setTables] = useState<string[]>([]);
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

  const updateConfig = (field: keyof DatabaseConfig, value: string | number) => {
    setDbConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const testConnection = async () => {
    try {
      const result = await TestDatabaseConnection(dbConfig);
      setConnectionStatus(result);
      toast.success("连接测试成功");
    } catch (error) {
      setConnectionStatus(error instanceof Error ? error.message : String(error));
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

      const newConnection: DatabaseConfig = {
        ...dbConfig,
        id: Date.now().toString()
      };

      // 保存到后端存储
      await SaveDatabaseConnection(newConnection);

      // 更新本地状态
      const newConnections = [...connections, newConnection];
      saveConnections(newConnections);

      setCurrentConnection(newConnection);
      setIsAddingConnection(false);

      // 自动连接并获取表清单
      await connectAndGetTables(newConnection);

      toast.success("连接保存成功");
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
      setTables(tableList);
      setCurrentStep("tables");
      toast.success("连接成功，已获取表清单");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  const toggleTableSelection = (table: string) => {
    setSelectedTables(prev =>
      prev.includes(table)
        ? prev.filter(t => t !== table)
        : [...prev, table]
    );
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
      database: ""
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
    try {
      await DeleteDatabaseConnection(connectionId);
      const newConnections = connections.filter(conn => conn.id !== connectionId);
      saveConnections(newConnections);
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
            onBack={handleBack}
            onStartAnalysis={startAnalysis}
          />
        )}

        {currentStep === "analysis" && (
          <AnalysisPage selectedTablesCount={selectedTables.length} />
        )}

        {currentStep === "results" && (
          <ResultsPage results={analysisResults} onReanalyze={handleReanalyze} />
        )}
      </div>
    </div>
  );
}

export default App;