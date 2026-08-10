import { Http } from "../js/http.js";

const http = new Http("/audio/api");

export const audioApi = {
  // GET /audio/api/types
  listAudioTypes: () => http.get("/types"),

  // GET /audio/api/languages
  listAudioLanguages: () => http.get("/languages"),

  // GET /audio/api/positions
  listAudioPositions: () => http.get("/positions"),

  // GET /audio/api/day-parts
  listAudioDayParts: () => http.get("/day-parts"),

  // GET /audio/api/categories
  listAudioCategories: () => http.get("/categories"),

  // GET /audio/api/alternate-groups
  listAudioAlternateGroups: () => http.get("/alternate-groups"),

  // POST /audio/api/audios
  listAudios: (filters) => http.post("/audios", { filters }),

  // POST /audio/api/set-audio-root
  setAudioRoot: () => http.post("/set-audio-root"),

  // POST /audio/api/remove-audios
  removeAudios: (audioPaths) => http.post("/remove-audios", { audioPaths }),

  // POST /audio/api/import-audios
  importAudios: () => http.post("/import-audios"),

  getAudioPlayerSrc: (audioPath) => `/audio/api/load-audio?audioPath=${encodeURIComponent(audioPath)}`,
};
