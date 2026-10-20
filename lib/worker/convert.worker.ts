import { convert } from "../converters/core";
import { ConvertError, type ConvertRequest, type ConvertResponse } from "../converters/types";

const scope = self as unknown as {
  onmessage: ((e: MessageEvent<ConvertRequest>) => void) | null;
  postMessage(message: ConvertResponse): void;
};

scope.onmessage = async (e) => {
  const req = e.data;
  try {
    const { blob, width, height, notes } = await convert(req);
    scope.postMessage({ id: req.id, ok: true, blob, width, height, notes });
  } catch (err) {
    if (err instanceof ConvertError) {
      scope.postMessage({ id: req.id, ok: false, code: err.code, message: err.message });
    } else {
      scope.postMessage({ id: req.id, ok: false, code: "unknown", message: String(err) });
    }
  }
};
