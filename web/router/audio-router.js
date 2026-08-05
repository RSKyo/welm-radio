import { ApiRouter } from "welm-cdp/web";
import {
  selectAudioDir,
  selectWhisperModel,
  getWhisperModel,
  listAudioType,
  listAudioLanguage,
  listAudioPosition,
  listAudioDayPart,
  listAudioCategory,
  listAudioAlternateGroup,
  listAudio,
  removeAudio,
  addAudio,
  renameAudio,
  loadAudio,
  transcribeAudioAndSaveMeta,
  isTranscriptionInProgress,
} from "../service/audio-service.js";
import { saveMeta } from "../service/meta-service.js";

const apiRouter = new ApiRouter();
export default apiRouter.handle;

// -----------------------------------------------------------------------------
// Routes for audio management
// -----------------------------------------------------------------------------

apiRouter.get("/select-audio-dir", async (data, options) => {
  return await selectAudioDir(options);
});

apiRouter.get("/list-audio-type", async (data, options) => {
  return listAudioType(options);
});

apiRouter.get("/list-audio-language", async (data, options) => {
  return listAudioLanguage(options);
});

apiRouter.get("/list-audio-position", async (data, options) => {
  return listAudioPosition(options);
});

apiRouter.get("/list-audio-day-part", async (data, options) => {
  return listAudioDayPart(options);
});

apiRouter.get("/list-audio-category", async (data, options) => {
  return listAudioCategory(options);
});

apiRouter.get("/list-audio-alternate-group", async (data, options) => {
  return listAudioAlternateGroup(options);
});

apiRouter.post("/list-audio", async (data, options) => {
  return listAudio(data.filters, options);
});

apiRouter.post("/remove-audio", async (data, options) => {
  removeAudio(data.files, options);
});

apiRouter.get("/add-audio", async (req, res, data, options) => {
  const files = await addAudio(options);

  res.json({
    files,
    canceled: !files,
  });
});

apiRouter.post("/rename-audio", async (req, res, data, options) => {
  const { audioPath, name } = data;

  const result = await renameAudio(audioPath, name, options);

  res.json(result);
});

apiRouter.get("/load-audio", async (req, res, data, options) => {
  const { filePath } = data;

  const { contentType, buffer } = await loadAudio(filePath, options);

  res.type(contentType);
  res.send(buffer);
});

apiRouter.post(
  "/transcribe-audio-and-save-meta",
  async (req, res, data, options) => {
    const { audioPath, language } = data;

    const savedMeta = await transcribeAudioAndSaveMeta(
      audioPath,
      language,
      options,
    );

    res.json(savedMeta);
  },
);

apiRouter.get(
  "/is-transcription-in-progress",
  async (req, res, data, options) => {
    const inProgress = isTranscriptionInProgress();

    res.json({
      inProgress,
    });
  },
);

apiRouter.post("/save-meta", async (req, res, data, options) => {
  const { audioPath, meta } = data;

  const savedMeta = await saveMeta(audioPath, meta, options);

  res.json(savedMeta);
});

// -----------------------------------------------------------------------------
// Routes for Whisper
// -----------------------------------------------------------------------------

apiRouter.get("/whisper-model/select", async (req, res, data, options) => {
  const path = await selectWhisperModel(options);

  res.json({
    path,
    canceled: !path,
  });
});

apiRouter.get("/whisper-model", async (req, res, data, options) => {
  const model = getWhisperModel(options);

  res.json(model);
});
