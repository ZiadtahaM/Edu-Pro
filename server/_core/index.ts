import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";



async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  let currentPort = preferredPort;

  function listenOnPort(port: number) {
    const onError = (err: any) => {
      if (err.code === "EADDRINUSE" && currentPort < preferredPort + 20) {
        currentPort++;
        listenOnPort(currentPort);
      } else {
        console.error("Server listen error:", err);
      }
    };
    server.once("error", onError);
    server.listen(port, () => {
      server.removeListener("error", onError);
      console.log(`Server running on http://localhost:${port}/`);
    });
  }

  listenOnPort(currentPort);
}

startServer().catch(console.error);
