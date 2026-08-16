import { ApiRouter } from "welm-cdp/web";
import { saveMeta } from "../service/meta.service.js";

const apiRouter = new ApiRouter("/meta/api");

// -----------------------------------------------------------------------------
// Routers for Meta Service
// -----------------------------------------------------------------------------

// POST /meta/api/save-meta
apiRouter.post("/save-meta", ({ data }) => {
  return saveMeta(data.audioPath, data.meta);
});

export default apiRouter;