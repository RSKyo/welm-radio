import { ApiRouter } from "welm-cdp/web";
import {
  getWhisperModel,
  setWhisperModel,
  startTranscription,
  isTranscribing,
} from "../service/whisper.service.js";

const apiRouter = new ApiRouter("/whisper/api");

// -----------------------------------------------------------------------------
// Routers for Whisper Service
// -----------------------------------------------------------------------------

// GET /whisper/api/whisper-model
apiRouter.get("/whisper-model", () => {
  return getWhisperModel();
});

// GET /whisper/api/set-whisper-model
apiRouter.get("/set-whisper-model", () => {
  return setWhisperModel();
});

// POST /whisper/api/start-transcription
apiRouter.post("/start-transcription", (data) => {
  return startTranscription(data.audioPath, data.language);
});

// GET /whisper/api/is-transcribing
apiRouter.get("/is-transcribing", () => {
  return isTranscribing();
});

export default apiRouter;
