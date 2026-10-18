import fs from "node:fs";
import nodePath from "node:path";
import { pipeline } from "node:stream/promises";
import { ApiRouter } from "welm-cdp/web";
import {
  setAudioRoot,
  listAudioTypes,
  listAudioLanguages,
  listAudioPositions,
  listAudioDayParts,
  listAudioCategories,
  listAudioAlternateGroups,
  listAudios,
  listAudiosByPaths,
  removeAudios,
  importAudios,
  loadAudioData,
  getAudioContentType,
} from "../service/audio.service.js";

const apiRouter = new ApiRouter("/audio/api");

// -----------------------------------------------------------------------------
// Routers for Audio Service
// -----------------------------------------------------------------------------

// GET /audio/api/types
apiRouter.get("/types", () => {
  return listAudioTypes();
});

// GET /audio/api/languages
apiRouter.get("/languages", () => {
  return listAudioLanguages();
});

// GET /audio/api/positions
apiRouter.get("/positions", () => {
  return listAudioPositions();
});

// GET /audio/api/day-parts
apiRouter.get("/day-parts", () => {
  return listAudioDayParts();
});

// GET /audio/api/categories
apiRouter.get("/categories", () => {
  return listAudioCategories();
});

// GET /audio/api/alternate-groups
apiRouter.get("/alternate-groups", () => {
  return listAudioAlternateGroups();
});

// POST /audio/api/audios
apiRouter.post("/audios", ({ data }) => {
  return listAudios(data.filters);
});

// POST /audio/api/audios-by-paths
apiRouter.post("/audios-by-paths", ({ data }) => {
  return listAudiosByPaths(data.audioPaths);
});

// POST /audio/api/set-audio-root
apiRouter.post("/set-audio-root", () => {
  return setAudioRoot();
});

// POST /audio/api/remove-audios
apiRouter.post("/remove-audios", ({ data }) => {
  return removeAudios(data.audioPaths);
});

// POST /audio/api/import-audios
apiRouter.post("/import-audios", () => {
  return importAudios();
});

// GET /audio/api/load-audio-data
apiRouter.get("/load-audio-data", async ({ data, res }) => {
  const audioPath = data.audioPath;
  const contentType = getAudioContentType(audioPath);
  const buffer = await loadAudioData(audioPath);

  res.type(contentType);
  res.send(buffer);
});

// GET /audio/api/load-audio-stream
apiRouter.get("/load-audio-stream", async ({ data, req, res }) => {
  const audioPath = data.audioPath;

  const stat = fs.statSync(audioPath);
  const fileSize = stat.size;
  const contentType = getAudioContentType(audioPath);

  const range = req.headers.range;

  if (range == null) {
    res.status(200);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Length", fileSize);
    res.setHeader("Content-Type", contentType);

    await pipeline(fs.createReadStream(audioPath), res);

    return;
  }

  const match = /^bytes=(\d+)-(\d*)$/.exec(range);

  if (match == null) {
    // 416 Range Not Satisfiable，表示你请求的字节范围无效，服务器无法满足
    res.status(416);
    res.setHeader("Content-Range", `bytes */${fileSize}`);
    res.end();

    return;
  }

  const start = Number(match[1]);

  const end =
    match[2] === "" ? fileSize - 1 : Math.min(Number(match[2]), fileSize - 1);

  if (start >= fileSize || end < start) {
    res.status(416);
    res.setHeader("Content-Range", `bytes */${fileSize}`);
    res.end();

    return;
  }

  const contentLength = end - start + 1;

  // 206 Partial Content，表示请求成功，但服务器只返回资源的一部分
  res.status(206);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
  res.setHeader("Content-Length", contentLength);
  res.setHeader("Content-Type", contentType);

  // Do not use:
  //   fs.createReadStream(audioPath).pipe(res);
  //
  // `pipe()` starts streaming asynchronously and returns immediately.
  // The route handler may finish before the response has actually started,
  // so ApiRouter can still see `res.headersSent === false` and send its own
  // response (for example 204), which can interrupt/corrupt the audio stream.
  //
  // `await pipeline()` keeps the handler pending until the stream finishes,
  // so the response is fully controlled by this route.
  await pipeline(
    fs.createReadStream(audioPath, {
      start,
      end,
    }),
    res,
  );
});

export default apiRouter;
