import { Elm } from "../base/elm.js";
import {
  assertNonBlankString,
  assertNonNegative,
  assertPositive,
} from "../base/assert.js";
import { createElementByHTML } from "../base/elm-helper.js";

const MAIN_TEMPLATE = `
<canvas data-role="canvas"></canvas>
`;

const mainTemplate = createElementByHTML(MAIN_TEMPLATE);

export class Waveform extends Elm {
  // state(read-only)
  #audioCache;
  #audioPath = "";

  // state(read-write)
  #trimStart = 0;
  #trimEnd = 0;

  // element
  #canvasElement;

  // render
  #renderVersion = 0;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "waveform",
    });

    this.#init();
    this.#render();

    void this.draw();
  }

  // -----------------------------------------------------------------------------
  // initialization
  // -----------------------------------------------------------------------------

  #init() {
    this.applyOption(
      "audioCache",
      (value, assertionSubject) => {
        if (
          value == null ||
          typeof value.getAudioBuffer !== "function"
        ) {
          throw new Error(
            `${assertionSubject} must provide getAudioBuffer()`,
          );
        }

        this.#audioCache = value;
      },
      true,
    );

    this.applyOption(
      "audioPath",
      (value, assertionSubject) => {
        assertNonBlankString(value, assertionSubject);
        this.#audioPath = value;
      },
      true,
    );

    this.applyOption("trimStart", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#trimStart = value;
    });

    this.applyOption("trimEnd", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#trimEnd = value;
    });

    if (this.#trimEnd <= this.#trimStart) {
      throw new Error("trimEnd must be greater than trimStart");
    }
  }

  // -----------------------------------------------------------------------------
  // state(read-only)
  // -----------------------------------------------------------------------------

  get audioPath() {
    return this.#audioPath;
  }

  // -----------------------------------------------------------------------------
  // state(read-write)
  // -----------------------------------------------------------------------------

  get trimStart() {
    return this.#trimStart;
  }

  set trimStart(value) {
    assertNonNegative(value, "trimStart");

    if (value >= this.#trimEnd) {
      throw new Error("trimStart must be less than trimEnd");
    }

    if (value === this.#trimStart) {
      return;
    }

    this.#trimStart = value;

    void this.draw();
  }

  get trimEnd() {
    return this.#trimEnd;
  }

  set trimEnd(value) {
    assertPositive(value, "trimEnd");

    if (value <= this.#trimStart) {
      throw new Error("trimEnd must be greater than trimStart");
    }

    if (value === this.#trimEnd) {
      return;
    }

    this.#trimEnd = value;

    void this.draw();
  }

  // -----------------------------------------------------------------------------
  // waveform
  // -----------------------------------------------------------------------------

  async draw() {
    const renderVersion = ++this.#renderVersion;

    const audioBuffer =
      await this.#audioCache.getAudioBuffer(this.#audioPath);

    // A newer draw request has already started.
    if (renderVersion !== this.#renderVersion) {
      return;
    }

    this.#drawAudioBuffer(audioBuffer);
  }

  clear() {
    ++this.#renderVersion;

    const context = this.#canvasElement.getContext("2d");

    context.clearRect(
      0,
      0,
      this.#canvasElement.width,
      this.#canvasElement.height,
    );
  }

  // -----------------------------------------------------------------------------
  // render
  // -----------------------------------------------------------------------------

  #render() {
    const mainElement = mainTemplate.cloneNode(true);

    this.rootElement.replaceChildren(mainElement);

    this.#canvasElement =
      this.rootElement.querySelector('[data-role="canvas"]');
  }

  #drawAudioBuffer(audioBuffer) {
    const width = this.rootElement.clientWidth;
    const height = this.rootElement.clientHeight;

    if (width <= 0 || height <= 0) {
      return;
    }

    const devicePixelRatio = window.devicePixelRatio || 1;

    this.#canvasElement.width = Math.round(width * devicePixelRatio);
    this.#canvasElement.height = Math.round(height * devicePixelRatio);

    this.#canvasElement.style.width = `${width}px`;
    this.#canvasElement.style.height = `${height}px`;

    const context = this.#canvasElement.getContext("2d");

    context.setTransform(
      devicePixelRatio,
      0,
      0,
      devicePixelRatio,
      0,
      0,
    );

    context.clearRect(0, 0, width, height);

    const trimStart = Math.min(
      this.#trimStart,
      audioBuffer.duration,
    );

    const trimEnd = Math.min(
      this.#trimEnd,
      audioBuffer.duration,
    );

    if (trimEnd <= trimStart) {
      return;
    }

    const sampleRate = audioBuffer.sampleRate;

    const startSample = Math.floor(trimStart * sampleRate);
    const endSample = Math.min(
      Math.ceil(trimEnd * sampleRate),
      audioBuffer.length,
    );

    const sampleCount = endSample - startSample;

    if (sampleCount <= 0) {
      return;
    }

    const samplesPerPixel = sampleCount / width;
    const centerY = height / 2;
    const amplitude = height / 2;

    context.beginPath();

    for (let x = 0; x < width; x++) {
      const sampleStart =
        startSample + Math.floor(x * samplesPerPixel);

      const sampleEnd = Math.min(
        startSample + Math.ceil((x + 1) * samplesPerPixel),
        endSample,
      );

      let min = 1;
      let max = -1;

      for (
        let sampleIndex = sampleStart;
        sampleIndex < sampleEnd;
        sampleIndex++
      ) {
        let value = 0;

        for (
          let channelIndex = 0;
          channelIndex < audioBuffer.numberOfChannels;
          channelIndex++
        ) {
          value += audioBuffer
            .getChannelData(channelIndex)[sampleIndex];
        }

        value /= audioBuffer.numberOfChannels;

        if (value < min) {
          min = value;
        }

        if (value > max) {
          max = value;
        }
      }

      const top = centerY - max * amplitude;
      const bottom = centerY - min * amplitude;

      context.moveTo(x + 0.5, top);
      context.lineTo(x + 0.5, bottom);
    }

    context.strokeStyle = "currentColor";
    context.lineWidth = 1;
    context.stroke();
  }
}