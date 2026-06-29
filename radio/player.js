let ctx;
let musicGain;
let voiceGain;
let masterGain;

let musicSource;
let musicBuffer;

let voiceBuffer;

async function loadAudio(url) {
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  return await ctx.decodeAudioData(arrayBuffer);
}

async function start() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  await ctx.resume();

  // master nodes
  masterGain = ctx.createGain();

  musicGain = ctx.createGain();
  voiceGain = ctx.createGain();

  musicGain.gain.value = 1.0;
  voiceGain.gain.value = 1.0;

musicGain.connect(masterGain);
voiceGain.connect(masterGain);

masterGain.connect(ctx.destination);

  // ⚠️ 用你本地的音频文件路径
  musicBuffer = await loadAudio("music.mp3");
  voiceBuffer = await loadAudio("voice.mp3");

  playMusicLoop();

  console.log("audio engine ready");
}

function playMusicLoop() {
  musicSource = ctx.createBufferSource();
  musicSource.buffer = musicBuffer;
  musicSource.loop = true;

  musicSource.connect(musicGain);
  musicSource.start();
}

function playVoice() {
  const source = ctx.createBufferSource();
  source.buffer = voiceBuffer;

  source.connect(voiceGain);

  // ducking start
  duckMusic(0.25);

  source.start();

  source.onended = () => {
    // restore music
    duckMusic(1.0);
  };
}

function duckMusic(value) {
  musicGain.gain.linearRampToValueAtTime(
    value,
    ctx.currentTime + 0.5
  );
}