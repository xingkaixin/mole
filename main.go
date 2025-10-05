package main

import (
	"context"
	"embed"
	"fmt"
	"os"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"mole/backend"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Create an instance of the app structure
	app := backend.NewApp()

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "Mole",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.Startup,
		OnBeforeClose: func(ctx context.Context) (prevent bool) {
			// 应用关闭前的清理工作
			logger := backend.GetLogger()
			if logger != nil {
				logger.LogInfo("MAIN", "应用关闭 - Wails应用即将退出")
				logger.Close()
			}
			return false
		},
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
		// 如果Wails启动失败，仍然尝试记录日志
		tempLogger := backend.GetLogger()
		if tempLogger != nil {
			tempLogger.LogError("MAIN", fmt.Sprintf("应用启动失败 - %s", err.Error()))
		}
		os.Exit(1)
	}
}
