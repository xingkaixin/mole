.PHONY: dev build-windows build-mac clean deps lint format check test help

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

# Lint frontend code
lint:
	cd frontend && bun run lint

# Format frontend code
format:
	cd frontend && bun run format

# Check frontend code
check:
	cd frontend && bun run check

# Test frontend code
test:
	cd frontend && bun run test

# Help command to show available targets
help:
	@echo "Available commands:"
	@echo "  make dev           - Run the application in development mode"
	@echo "  make build-windows - Build the application for Windows (64-bit)"
	@echo "  make build-linux   - Build the application for Linux (64-bit)"
	@echo "  make build-mac     - Build the application for macOS (universal)"
	@echo "  make clean         - Clean build artifacts"
	@echo "  make lint          - Lint frontend code"
	@echo "  make format        - Format frontend code"
	@echo "  make check         - Check and apply fixes to frontend code"
	@echo "  make test         - Test frontend code"