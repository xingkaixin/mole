import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"
import path from "path"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text"],
      reportsDirectory: "./coverage",
      exclude: [
        "**/wailsjs/**",
        "**/dist/**",
        "vite.config.ts",
        "src/components/ui/**",
        "src/components/add-table-dialog.tsx",
        "src/components/connection-dialog.tsx",
        "src/components/create-task-dialog.tsx",
        "src/vite-env.d.ts"
      ]
    }
  },
})
