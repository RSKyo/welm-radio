/**
 * Executable web server entry.
 *
 * Do not import this file.
 * Do not export from this file.
 */

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "../infra/config.js";

import { router as audioLibraryRouter } from "./audio-library/router.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverPort = 3000;

const app = express();

// -----------------------------------------------------------------------------
// server
// -----------------------------------------------------------------------------

// 解析 JSON body。POST 请求一般有 body，所以要解析
// 例如 POST /audio-library/api/select-root
// 解析后 req.body 就是 { foo: "bar", baz: "qux" }
// express.json() 内部会 next()
app.use(express.json());

// express.static 负责处理静态资源请求，返回静态文件，例如 /assets/logo.png
app.use("/assets", express.static(path.join(__dirname, "assets")));

// 自己写的测试用的地址，用来检查服务是否启动成功。
// 前端可以请求这个地址，如果返回 200，就说明服务已经启动了
app.get("/__ready", (req, res) => {
  res.json({ ok: true });
});

// -----------------------------------------------------------------------------
// audio-library
// -----------------------------------------------------------------------------

app.use(
  "/audio-library",
  express.static(path.join(__dirname, "audio-library/ui")),
);

app.use("/audio-library/api", audioLibraryRouter);

// -----------------------------------------------------------------------------
// error handler
// -----------------------------------------------------------------------------

// 错误处理中间件：
// - 普通 middleware: (req, res, next)
// - error middleware: (error, req, res, next)
//
// next(error) 会跳转到错误处理流程。
// error 推荐使用 Error 对象。
// 必须放在所有 route/middleware 之后。
app.use((error, req, res, next) => {
  console.error(error);

  res.status(500).json({
    error: error?.message ?? "Internal server error",
  });
});

// -----------------------------------------------------------------------------
// start
// -----------------------------------------------------------------------------

app.listen(serverPort, () => {
  console.log(`welm-radio web server running: http://localhost:${serverPort}`);
});


