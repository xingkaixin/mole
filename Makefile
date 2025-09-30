.PHONY: dev build-windows build-mac clean deps help

# Run the application in development mode
dev:
	wails dev

# Build the application for Windows
build-windows:
	wails build -platform windows/amd64


# Build the application for macOS
build-mac:
	wails build -platform darwin/universal

# Clean build artifacts
clean:
	rm -rf build/bin
	cd frontend && rm -rf dist

# Install frontend dependencies
deps:
	cd frontend && bun install


# Help command to show available targets
help:
	@echo "Available commands:"
	@echo "  make dev           - Run the application in development mode"
	@echo "  make build-windows - Build the application for Windows (64-bit)"
	@echo "  make build-linux   - Build the application for Linux (64-bit)"
	@echo "  make build-mac     - Build the application for macOS (universal)"
	@echo "  make clean         - Clean build artifacts"