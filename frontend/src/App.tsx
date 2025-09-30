import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner"
import { toast } from "sonner"
import {
  TestDatabaseConnection,
  ConnectDatabase,
  GetTables,
  AnalyzeTables,
  GetAvailableRules
} from "../wailsjs/go/backend/App.js";
import { Sidebar } from "@/components/Sidebar";
import { WelcomePage } from "@/pages/WelcomePage";
import { ConfigPage } from "@/pages/ConfigPage";
import { TablesPage } from "@/pages/TablesPage";
import { AnalysisPage } from "@/pages/AnalysisPage";
import { ResultsPage } from "@/pages/ResultsPage";
import { DatabaseConfig, RuleResult, AppStep } from "@/types";

function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>("welcome");
  const [connections, setConnections] = useState<DatabaseConfig[]>([]);
  const [currentConnection, setCurrentConnection] = useState<DatabaseConfig | null>(null);
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>({
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

  // 从localStorage加载保存的连接
  useEffect(() => {
    const savedConnections = localStorage.getItem("mole-db-connections");
    if (savedConnections) {
      setConnections(JSON.parse(savedConnections));
    }
  }, []);

  // 保存连接到localStorage
  const saveConnections = (newConnections: DatabaseConfig[]) => {
    setConnections(newConnections);
    localStorage.setItem("mole-db-connections", JSON.stringify(newConnections));
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
    } catch (error: any) {
      setConnectionStatus(error.message);
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

      const newConnections = [...connections, newConnection];
      saveConnections(newConnections);

      setCurrentConnection(newConnection);
      setIsAddingConnection(false);

      // 自动连接并获取表清单
      await connectAndGetTables(newConnection);

      toast.success("连接保存成功");
    } catch (error: any) {
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
    } catch (error: any) {
      toast.error(error.message);
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
    } catch (error: any) {
      toast.error(error.message);
      setCurrentStep("tables");
    }
  };

  const handleAddConnection = () => {
    setDbConfig({
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

  const handleDeleteConnection = (connectionId: string) => {
    const newConnections = connections.filter(conn => conn.id !== connectionId);
    saveConnections(newConnections);
    toast.success("连接已删除");
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
    <div id="App" className="h-screen flex bg-white">
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