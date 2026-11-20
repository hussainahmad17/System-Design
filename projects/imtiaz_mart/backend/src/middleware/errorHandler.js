import { ZodError } from "zod";
import { HttpError } from "../lib/httpError.js";

// One error shape for every endpoint: { error: { code, message, details? } }
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    const details = {};
    for (const issue of err.issues) details[issue.path.join(".") || "input"] ??= issue.message;
    return res.status(400).json({ error: { code: "VALIDATION_FAILED", message: "Check the highlighted fields", details } });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  // Malformed JSON or a body over the size limit, from express.json()
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: { code: "INVALID_JSON", message: "Request body is not valid JSON" } });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: { code: "BODY_TOO_LARGE", message: "Request body is too large" } });
  }

  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL", message: "Something went wrong on our side" } });
}

export function notFound(req, res) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: `No route for ${req.method} ${req.path}` } });
}
