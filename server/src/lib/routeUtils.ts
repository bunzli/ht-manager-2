import { Request, Response } from "express";

export function parseIntParam(
  req: Request,
  res: Response,
  name: string,
): number | null {
  const raw = req.params[name] as string;
  const value = parseInt(raw, 10);
  if (isNaN(value)) {
    res.status(400).json({ error: `Invalid ${name}` });
    return null;
  }
  return value;
}

export function errorResponse(
  res: Response,
  message: string,
  err: unknown,
  status = 500,
): void {
  console.error(`${message}:`, err);
  res.status(status).json({
    error: message,
    details: err instanceof Error ? err.message : String(err),
  });
}
