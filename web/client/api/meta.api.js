import { Http } from "../js/http.js";

const http = new Http("/meta/api");

export const metaApi = {
  // POST /meta/api/save-meta
  saveMeta: (audioPath, meta) =>
    http.post(`/save-meta`, {
      audioPath,
      meta,
    }),
};
