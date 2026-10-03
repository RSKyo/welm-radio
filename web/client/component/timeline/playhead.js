class Playhead extends Elm {
  #time = 0;
  #pixelsPerSecond = 0;

  get time() {
    return this.#time;
  }

  set time(value) {
    // assert
    this.#time = value;
    this.#updateUIState();
  }

  get pixelsPerSecond() {
    return this.#pixelsPerSecond;
  }

  set pixelsPerSecond(value) {
    // assert
    this.#pixelsPerSecond = value;
    this.#updateUIState();
  }

  get left() {
    return this.#time * this.#pixelsPerSecond;
  }
}