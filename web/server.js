/**
 * Executable entry point for the welm-radio web server.
 *
 * This file starts the HTTP server directly.
 * It must not be imported by other modules and must not export any values.
 */

import express from "express";
import nodePath from "node:path";
import { fileURLToPath } from "node:url";

import { router as audioRouter } from "./router/audio-router.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = nodePath.dirname(__filename);

const defaultHost = "localhost";
const defaultPort = 3000;

// Read server host and port from environment variables, if set.
const serverHost = String(process.env.serverHost ?? defaultHost);
const serverPort = Number(process.env.serverPort ?? defaultPort);

const app = express();

// -----------------------------------------------------------------------------
// middleware
// -----------------------------------------------------------------------------

// Parse JSON request bodies and expose the parsed value through req.body.
app.use(express.json());

// Expose only browser-accessible static resources.
// Server-side modules under infra, router, and service are not exposed.
app.use("/", express.static(nodePath.join(__dirname, "ui")));
app.use("/assets", express.static(nodePath.join(__dirname, "assets")));

// Health-check endpoint used by the launcher to verify that the server
// has started and is ready to accept requests.
app.get("/__ready", (req, res) => {
  res.json({ ok: true });
});

// -----------------------------------------------------------------------------
// business routes
// -----------------------------------------------------------------------------

// Mount audio-related API routes under /audio/api.
app.use("/audio/api", audioRouter);

// -----------------------------------------------------------------------------
// error handling
// -----------------------------------------------------------------------------

// Handle errors forwarded through next(error).
//
// Express identifies error-handling middleware by its four parameters:
// (error, req, res, next).
//
// This middleware must be registered after all other middleware and routes.
app.use((error, req, res, next) => {
  console.error(error);

  res.status(500).json({
    error: error?.message ?? "Internal server error",
  });
});

// -----------------------------------------------------------------------------
// start
// -----------------------------------------------------------------------------

// Start the web server.
// This file is executed as a standalone process by the web launcher.
app.listen(serverPort, serverHost);
