import { Toast } from "../component/toast.js";

export const toast = new Toast();

export async function safeRun(handler, ...args) {
  try {
    return await handler(...args);
  } catch (error) {
    console.error(error);

    toast.error(error?.message ?? String(error));

    return undefined;
  }
}

export function safeHandler(handler) {
  return (...args) => safeRun(handler, ...args);
}
