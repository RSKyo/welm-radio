import { Http } from "../js/http.js";

const http = new Http("/whisper/api");

export const whisperApi = {

  // GET /whisper/api/model/select
  selectWhisperModel: () => http.get(`/model/select`),

  // GET /whisper/api/model
  getWhisperModel: () => http.get(`/model`),

  // POST /whisper/api/transcriptions
  transcriptions: (audioPath, language) =>
    http.post(`/transcriptions`, {
      audioPath,
      language,
    }),

  // GET /whisper/api/isTranscribing
  isTranscribing: () => http.get(`/isTranscribing`),
};
