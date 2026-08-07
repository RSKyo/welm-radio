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
  removeAudios,
  importAudios,
  loadAudio,
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
apiRouter.post("/audios", (data) => {
  return listAudios(data.filters);
});

// POST /audio/api/set-audio-root
apiRouter.post("/set-audio-root", () => {
  return setAudioRoot();
});

// POST /audio/api/remove-audios
apiRouter.post("/remove-audios", (data) => {
  return removeAudios(data.audioPaths);
});

// POST /audio/api/import-audios
apiRouter.post("/import-audios", () => {
  return importAudios();
});

// GET /audio/api/load-audio
apiRouter.get("/load-audio", async (data, { res }) => {
  const { contentType, buffer } = await loadAudio(data.audioPath);

  res.type(contentType);
  res.send(buffer);
});

export default apiRouter;
