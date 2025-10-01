## 准确性
- 当技术资料不完整时，不要瞎猜，通过`context7`提供的资料回答，如果依然不确认，就说“抱歉，我无法回答这个问题。”

## About

**A modern Wails desktop app** featuring a modern stack:
- **React** for UI
- **TypeScript** for type safety
- **Shadcn UI** for accessible, themeable components
- **Biome** for code formatting and linting
- **Wails** for desktop app development
- **Go** for backend

## Development

```sh
# install dependencies
make deps

# run in development mode
make dev
```


## Key Frontend Libraries

This project utilizes a modern frontend stack:

- [**React**](https://react.dev/): A JavaScript library for building user interfaces.
- [**TypeScript**](https://www.typescriptlang.org/): A typed superset of JavaScript that compiles to plain JavaScript.
- [**Vite**](https://vitejs.dev/): A fast build tool and development server.
- [**Tailwind CSS**](https://tailwindcss.com/): A utility-first CSS framework for rapid UI development.
- [**Shadcn UI**](https://ui.shadcn.com/): A collection of re-usable UI components built with Radix UI and Tailwind CSS.
- [**Biome**](https://biomejs.dev/): A fast formatter and linter for web projects.
- [**Radix UI**](https://www.radix-ui.com/): Primitives for building accessible design systems and web applications.

### Common Shadcn UI Commands

Use the following commands (from the `frontend` directory) to add new Shadcn UI components:

```sh
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
# ...add any other supported component
```



## Makefile Commands

The project includes a `Makefile` to simplify common development tasks. Run `make help` to see all available commands. Here are some of a few key targets:

- `make dev`: Run the application in development mode with hot reloading.
- `make build-windows`: Build the application for Windows (64-bit).
- `make build-mac`: Build the application for macOS (universal).
- `make clean`: Clean build artifacts.
- `make deps`: Install frontend dependencies from `package.json`.
- `make lint`: Lint the frontend code using Biome.
- `make format`: Format the frontend code using Biome.
- `make check`: Check and apply automatic fixes to the frontend code using Biome.
