import { ApiRouter } from "welm-cdp/web";
import {
  getWhisperModel,
  selectWhisperModel,
  transcriptions,
  isTranscribing,
} from "../service/whisper.service.js";

const apiRouter = new ApiRouter("/whisper/api");

// -----------------------------------------------------------------------------
// Routers for Whisper Service
// -----------------------------------------------------------------------------

// GET /whisper/api/model/select
apiRouter.get("/model/select", async (data, options) => {
  return await selectWhisperModel(options);
});

// GET /whisper/api/model
apiRouter.get("/model", async (data, options) => {
  return getWhisperModel(options);
});

// POST /whisper/api/transcriptions
apiRouter.post("/transcriptions", async (data, options) => {
  const { audioPath, language } = data;

  return await transcriptions(audioPath, language, options);
});

// GET /whisper/api/isTranscribing
apiRouter.get("/isTranscribing", async (data, options) => {
  return isTranscribing(options);
});

export default apiRouter;