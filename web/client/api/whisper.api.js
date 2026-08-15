import { Http } from "../js/http.js";

const http = new Http("/whisper/api");

export const whisperApi = {
  // GET /whisper/api/whisper-model
  getWhisperModel: () => http.get("/whisper-model"),

  // GET /whisper/api/select-whisper-model
  selectWhisperModel: () => http.get("/select-whisper-model"),

  // POST /whisper/api/start-transcription
  startTranscription: (audioPath, language) =>
    http.post("/start-transcription", {
      audioPath,
      language,
    }),

  // GET /whisper/api/transcribing-status
  getTranscriptionStatus: () => http.get("/transcribing-status"),
};
