package backend

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"time"
)

type LogLevel int

const (
	TRACE LogLevel = iota
	DEBUG
	INFO
	WARN
	ERROR
	FATAL
)

var logLevelNames = map[LogLevel]string{
	TRACE: "TRACE",
	DEBUG: "DEBUG",
	INFO:  "INFO",
	WARN:  "WARN",
	ERROR: "ERROR",
	FATAL: "FATAL",
}

type Logger struct {
	ctx        context.Context
	logFile    *os.File
	logLevel   LogLevel
	moduleName string
}

var globalLogger *Logger

// InitLogger 初始化全局日志记录器
func InitLogger(ctx context.Context) error {
	logDir, err := getLogDirectory()
	if err != nil {
		return fmt.Errorf("failed to get log directory: %w", err)
	}

	// 确保日志目录存在
	err = os.MkdirAll(logDir, 0755)
	if err != nil {
		return fmt.Errorf("failed to create log directory: %w", err)
	}

	// 创建日志文件
	logFileName := fmt.Sprintf("mole_%s.log", time.Now().Format("2006-01-02"))
	logFilePath := filepath.Join(logDir, logFileName)
	logFile, err := os.OpenFile(logFilePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return fmt.Errorf("failed to open log file: %w", err)
	}

	globalLogger = &Logger{
		ctx:        ctx,
		logFile:    logFile,
		logLevel:   INFO,
		moduleName: "APP",
	}

	// 记录系统启动日志
	globalLogger.LogInfo("SYSTEM", fmt.Sprintf("应用启动 - 日志系统初始化完成，日志文件: %s", logFilePath))

	return nil
}

// getLogDirectory 获取日志目录路径
func getLogDirectory() (string, error) {
	var basePath string

	switch runtime.GOOS {
	case "darwin":
		// macOS: ~/Library/Logs/mole/
		homeDir, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		basePath = filepath.Join(homeDir, "Library", "Logs", "mole")
	case "windows":
		// Windows: %APPDATA%\mole\logs\
		appData := os.Getenv("APPDATA")
		if appData == "" {
			return "", fmt.Errorf("APPDATA environment variable not set")
		}
		basePath = filepath.Join(appData, "mole", "logs")
	case "linux":
		// Linux: ~/.local/share/mole/logs/
		homeDir, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		basePath = filepath.Join(homeDir, ".local", "share", "mole", "logs")
	default:
		return "", fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
	}

	return basePath, nil
}

// GetLogger 获取全局日志记录器
func GetLogger() *Logger {
	if globalLogger == nil {
		// 如果没有初始化，创建一个临时的控制台日志记录器
		return &Logger{
			logLevel:   INFO,
			moduleName: "TEMP",
		}
	}
	return globalLogger
}

// SetLogLevel 设置日志级别
func (l *Logger) SetLogLevel(level LogLevel) {
	l.logLevel = level
}

// SetModuleName 设置模块名称
func (l *Logger) SetModuleName(moduleName string) {
	l.moduleName = moduleName
}

// log 内部日志记录方法
func (l *Logger) log(level LogLevel, operation, message string) {
	if level < l.logLevel {
		return
	}

	timestamp := time.Now().Format("2006-01-02 15:04:05")
	levelName := logLevelNames[level]
	logLine := fmt.Sprintf("%s [%s] %s: %s - %s\n", timestamp, levelName, l.moduleName, operation, message)

	// 输出到控制台 (如果ctx存在，使用Wails runtime)
	if l.ctx != nil {
		switch level {
		case TRACE, DEBUG:
			// Wails runtime 没有Trace/Debug级别，使用Info代替
			fmt.Printf("DEBUG: %s", logLine)
		case INFO:
			fmt.Printf("INFO: %s", logLine)
		case WARN:
			fmt.Printf("WARN: %s", logLine)
		case ERROR, FATAL:
			fmt.Printf("ERROR: %s", logLine)
		}
	} else {
		fmt.Print(logLine)
	}

	// 写入文件
	if l.logFile != nil {
		l.logFile.WriteString(logLine)
		l.logFile.Sync() // 立即刷新到磁盘
	}
}

// LogTrace 记录跟踪级别日志
func (l *Logger) LogTrace(operation, message string) {
	l.log(TRACE, operation, message)
}

// LogDebug 记录调试级别日志
func (l *Logger) LogDebug(operation, message string) {
	l.log(DEBUG, operation, message)
}

// LogInfo 记录信息级别日志
func (l *Logger) LogInfo(operation, message string) {
	l.log(INFO, operation, message)
}

// LogWarn 记录警告级别日志
func (l *Logger) LogWarn(operation, message string) {
	l.log(WARN, operation, message)
}

// LogError 记录错误级别日志
func (l *Logger) LogError(operation, message string) {
	l.log(ERROR, operation, message)
}

// LogFatal 记录致命级别日志
func (l *Logger) LogFatal(operation, message string) {
	l.log(FATAL, operation, message)
}

// Close 关闭日志文件
func (l *Logger) Close() error {
	if l.logFile != nil {
		l.LogInfo("SYSTEM", "应用关闭 - 日志系统正在关闭")
		return l.logFile.Close()
	}
	return nil
}

// LogUserAction 记录用户操作 (专用于前端用户行为记录)
func LogUserAction(module, action, details string) {
	logger := GetLogger()
	logger.SetModuleName(module)
	logger.LogInfo("USER_ACTION", fmt.Sprintf("%s - %s", action, details))
}

// LogSystemEvent 记录系统事件 (专用于系统级事件)
func LogSystemEvent(module, event, details string) {
	logger := GetLogger()
	logger.SetModuleName(module)
	logger.LogInfo("SYSTEM_EVENT", fmt.Sprintf("%s - %s", event, details))
}

// LogError 记录错误 (全局错误记录函数)
func LogError(module, operation, error string) {
	logger := GetLogger()
	logger.SetModuleName(module)
	logger.LogError(operation, error)
}
