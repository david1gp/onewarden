export const webDevelopmentCommands = [
  { command: "bun run dev:server", description: "Start the Hono server entry point in watch mode." },
  { command: "bun run dev:web", description: "Start the Vite development server for this page." },
  { command: "bun run cli", description: "Run the Stricli CLI from source." },
  { command: "bun run test", description: "Run the Bun test suite." },
  { command: "bun run check", description: "Check formatting, types, tests, and production builds." },
] as const
