import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DatabaseConfig } from "@/types";

interface WelcomePageProps {
  connections: DatabaseConfig[];
  onAddConnection: () => void;
  onEditConnection: (connection: DatabaseConfig) => void;
  onDeleteConnection: (connectionId: string) => void;
  onSelectConnection: (connection: DatabaseConfig) => void;
}

export function WelcomePage({
  connections,
  onAddConnection,
  onEditConnection,
  onDeleteConnection,
  onSelectConnection,
}: WelcomePageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Mole</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            数据探查工具 - 帮助您快速分析数据库表结构、数据质量和业务规则
          </p>
        </div>

        {/* Database Connections */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">数据库连接</h2>
            <Button
              onClick={onAddConnection}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              添加连接
            </Button>
          </div>

          {connections.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                暂无数据库连接
              </h3>
              <p className="text-gray-500 mb-6">
                请先添加数据库连接以开始数据探查
              </p>
              <Button onClick={onAddConnection} size="lg">
                添加第一个连接
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connections.map((connection) => (
                <Card
                  key={connection.id}
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onSelectConnection(connection)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {connection.name}
                      </h3>
                      <p className="text-sm text-gray-500 capitalize">
                        {connection.type}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditConnection(connection);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("确定要删除这个连接吗？")) {
                              onDeleteConnection(connection.id!);
                            }
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div>
                      {connection.host}:{connection.port}
                    </div>
                    <div>{connection.database}</div>
                    <div>{connection.username}</div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
