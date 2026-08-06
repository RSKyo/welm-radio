const defaultDuration = 3000;

export class Toast {
  #element;
  #messageElement;
  #timer = null;

  constructor(options = {}) {
    this.#element = document.createElement("div");
    this.#element.className = "toast";
    this.#element.setAttribute("role", "status");
    this.#element.setAttribute("aria-live", "polite");

    this.#messageElement = document.createElement("div");
    this.#messageElement.className = "toast-message";

    this.#element.append(this.#messageElement);
    document.body.append(this.#element);

    this.#element.addEventListener("mouseenter", () => {
      clearTimeout(this.#timer);
      this.#timer = null;
    });

    this.#element.addEventListener("mouseleave", () => {
      this.hide();
    });

    if (options.className) {
      this.#element.classList.add(options.className);
    }
  }

  show(message) {
    this.#showMessage(message, false);
  }

  error(message) {
    this.#showMessage(message, true);
  }

  #showMessage(message, isError) {
    clearTimeout(this.#timer);

    this.#messageElement.textContent = message;
    this.#element.classList.toggle("is-error", isError);
    this.#element.classList.add("is-visible");

    this.#timer = setTimeout(() => {
      this.hide();
    }, defaultDuration);
  }

  hide() {
    clearTimeout(this.#timer);
    this.#timer = null;

    this.#element.classList.remove("is-visible");
  }
}