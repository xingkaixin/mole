import { DatabaseConfigForm } from "@/components/forms/DatabaseConfigForm";
import { DatabaseConfig } from "@/types";

interface ConfigPageProps {
  config: DatabaseConfig;
  isAdding: boolean;
  onConfigChange: (field: keyof DatabaseConfig, value: string | number) => void;
  onTestConnection: () => void;
  onSaveConnection: () => void;
  onBack: () => void;
  connectionStatus: string;
}

export function ConfigPage({
  config,
  isAdding,
  onConfigChange,
  onTestConnection,
  onSaveConnection,
  onBack,
  connectionStatus
}: ConfigPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <DatabaseConfigForm
          config={config}
          isAdding={isAdding}
          onConfigChange={onConfigChange}
          onTestConnection={onTestConnection}
          onSaveConnection={onSaveConnection}
          onBack={onBack}
          connectionStatus={connectionStatus}
        />
      </div>
    </div>
  );
}