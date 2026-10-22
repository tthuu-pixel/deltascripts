export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function requireValue(value: unknown, message: string, status = 400): asserts value {
  if (!value) throw new HttpError(status, message);
}
