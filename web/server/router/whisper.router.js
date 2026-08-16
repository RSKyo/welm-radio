import { ApiRouter } from "welm-cdp/web";
import {
  getWhisperModel,
  selectWhisperModel,
  getVadModel,
  selectVadModel,
  startTranscription,
  getTranscriptionStatus,
} from "../service/whisper.service.js";

const apiRouter = new ApiRouter("/whisper/api");

// -----------------------------------------------------------------------------
// Routers for Whisper Service
// -----------------------------------------------------------------------------

// GET /whisper/api/whisper-model
apiRouter.get("/whisper-model", () => {
  return getWhisperModel();
});

// GET /whisper/api/select-whisper-model
apiRouter.get("/select-whisper-model", () => {
  return selectWhisperModel();
});

// GET /whisper/api/vad-model
apiRouter.get("/vad-model", () => {
  return getVadModel();
});

// GET /whisper/api/select-vad-model
apiRouter.get("/select-vad-model", () => {
  return selectVadModel();
});

// POST /whisper/api/start-transcription
apiRouter.post("/start-transcription", ({ data }) => {
  return startTranscription(data.audioPath, data.language);
});

// GET /whisper/api/transcribing-status
apiRouter.get("/transcribing-status", () => {
  return getTranscriptionStatus();
});

export default apiRouter;
