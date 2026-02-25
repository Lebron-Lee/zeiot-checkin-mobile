import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

// WebSocket clients registry
const wsClients = new Set<WebSocket>();

export function broadcastToClients(message: unknown) {
  const data = JSON.stringify(message);
  wsClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // WebSocket server
  const wss = new WebSocketServer({ server, path: "/ws" });
  wss.on("connection", (ws) => {
    wsClients.add(ws);
    console.log(`[WS] Client connected. Total: ${wsClients.size}`);
    ws.on("close", () => {
      wsClients.delete(ws);
      console.log(`[WS] Client disconnected. Total: ${wsClients.size}`);
    });
    ws.on("error", () => wsClients.delete(ws));
    // Send initial connection confirmation
    ws.send(JSON.stringify({ type: "CONNECTED", data: { time: Date.now() } }));
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerOAuthRoutes(app);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
