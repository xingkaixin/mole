import { LogFrontendAction } from '../../wailsjs/go/backend/App';

/**
 * 前端日志记录工具
 * 通过Wails绑定调用后端日志系统，确保前后端日志统一存储
 */

export interface LogOptions {
  module?: string;
  action?: string;
  details?: string;
}

/**
 * 记录用户操作日志
 * @param module 模块名称 (如: 'Sidebar', 'DatabaseConfig')
 * @param action 操作动作 (如: 'click', 'submit', 'navigate')
 * @param details 详细信息
 */
export function logUserAction(module: string, action: string, details: string): void {
  try {
    LogFrontendAction(module, action, details);
  } catch (error) {
    // 如果日志调用失败，输出到控制台作为备选
    console.error('Failed to log user action:', error);
    console.log(`[${new Date().toISOString()}] [FRONTEND] ${module}: ${action} - ${details}`);
  }
}

/**
 * 记录按钮点击事件
 * @param buttonName 按钮名称
 * @param componentName 组件名称
 */
export function logButtonClick(buttonName: string, componentName: string): void {
  logUserAction(componentName, 'click', `用户点击了${buttonName}按钮`);
}

/**
 * 记录页面导航事件
 * @param fromPage 来源页面
 * @param toPage 目标页面
 */
export function logNavigation(fromPage: string, toPage: string): void {
  logUserAction('Navigation', 'navigate', `从 ${fromPage} 导航到 ${toPage}`);
}

/**
 * 记录表单提交事件
 * @param formName 表单名称
 * @param success 是否成功
 * @param error 错误信息 (可选)
 */
export function logFormSubmit(formName: string, success: boolean, error?: string): void {
  const details = success
    ? `表单 ${formName} 提交成功`
    : `表单 ${formName} 提交失败: ${error || '未知错误'}`;

  logUserAction('Form', 'submit', details);
}

/**
 * 记录数据库操作事件
 * @param operation 操作类型 (连接、查询、分析等)
 * @param databaseName 数据库名称
 * @param success 是否成功
 * @param details 详细信息
 */
export function logDatabaseOperation(operation: string, databaseName: string, success: boolean, details?: string): void {
  const actionDetails = success
    ? `数据库操作 ${operation} 在 ${databaseName} 上执行成功: ${details || '无额外信息'}`
    : `数据库操作 ${operation} 在 ${databaseName} 上执行失败: ${details || '未知错误'}`;

  logUserAction('Database', operation, actionDetails);
}

/**
 * 记录错误事件
 * @param module 模块名称
 * @param operation 操作名称
 * @param error 错误对象或消息
 */
export function logError(module: string, operation: string, error: Error | string): void {
  const errorMessage = error instanceof Error ? error.message : error;
  logUserAction(module, 'error', `${operation} 发生错误: ${errorMessage}`);
}

/**
 * 记录信息事件
 * @param module 模块名称
 * @param operation 操作名称
 * @param message 信息内容
 */
export function logInfo(module: string, operation: string, message: string): void {
  logUserAction(module, 'info', `${operation}: ${message}`);
}

/**
 * 创建一个带模块名称的日志记录器
 * @param moduleName 模块名称
 * @returns 返回一个带有预设模块名称的日志记录对象
 */
export function createLogger(moduleName: string) {
  return {
    click: (buttonName: string) => logButtonClick(buttonName, moduleName),
    navigate: (fromPage: string, toPage: string) => logNavigation(fromPage, toPage),
    formSubmit: (formName: string, success: boolean, error?: string) => logFormSubmit(formName, success, error),
    databaseOperation: (operation: string, databaseName: string, success: boolean, details?: string) =>
      logDatabaseOperation(operation, databaseName, success, details),
    error: (operation: string, error: Error | string) => logError(moduleName, operation, error),
    info: (operation: string, message: string) => logInfo(moduleName, operation, message),
    userAction: (action: string, details: string) => logUserAction(moduleName, action, details),
  };
}