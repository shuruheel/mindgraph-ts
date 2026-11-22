import { errorFields } from "./retry.js";

export class MindGraphError extends Error {
  public readonly code?: string;
  public readonly retriable?: boolean;
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "MindGraphError";
    const fields = errorFields(body);
    this.code = fields.code;
    this.retriable = fields.retriable;
  }
}
