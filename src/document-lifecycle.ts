import { MindGraphError } from "./errors.js";
import { errorFields, permitsRetry } from "./retry.js";
import type {
  DocumentStatus,
  ReadinessDimension,
  WaitForDocumentOptions,
} from "./types.js";

export const DOCUMENT_STATUS_CONTRACT = "document-status.v1" as const;
export const DEFAULT_WAIT_TIMEOUT_MS = 60_000;
export const MIN_WAIT_TIMEOUT_MS = 1;
export const MAX_WAIT_TIMEOUT_MS = 300_000;
export const DEFAULT_WAIT_INTERVAL_MS = 1_000;
export const MIN_WAIT_INTERVAL_MS = 100;

const VALID_DIMENSIONS = new Set<string>(["lexical", "vector", "extraction"]);
const VALID_DIMENSION_STATES = new Set<string>([
  "ready",
  "not_ready",
  "unknown",
  "not_requested",
]);

export class ValidationError extends MindGraphError {
  constructor(message: string) {
    super(message, 0, { code: "validation_error", retriable: false });
    this.name = "ValidationError";
  }
}

export class ReadinessUnknownError extends MindGraphError {
  public readonly documentUid: string;
  public readonly lastStatus: DocumentStatus;

  constructor(documentUid: string, lastStatus: DocumentStatus, message?: string) {
    super(
      message ?? `Readiness is unknown for document ${documentUid}`,
      200,
      { code: "readiness_unknown", retriable: false },
    );
    this.name = "ReadinessUnknownError";
    this.documentUid = documentUid;
    this.lastStatus = lastStatus;
  }
}

export class DocumentSupersededError extends MindGraphError {
  public readonly documentUid: string;
  public readonly expectedAttemptId: string;
  public readonly observedAttemptId: string;
  public readonly lastStatus: DocumentStatus;

  constructor(
    documentUid: string,
    expectedAttemptId: string,
    observedAttemptId: string,
    lastStatus: DocumentStatus,
  ) {
    super(
      `Document ${documentUid} attempt ${expectedAttemptId} was superseded by ${observedAttemptId}`,
      200,
      { code: "document_superseded", retriable: false },
    );
    this.name = "DocumentSupersededError";
    this.documentUid = documentUid;
    this.expectedAttemptId = expectedAttemptId;
    this.observedAttemptId = observedAttemptId;
    this.lastStatus = lastStatus;
  }
}

export class ReadinessNotRequestedError extends MindGraphError {
  public readonly documentUid: string;
  public readonly dimension: ReadinessDimension;
  public readonly lastStatus: DocumentStatus;

  constructor(
    documentUid: string,
    dimension: ReadinessDimension,
    lastStatus: DocumentStatus,
  ) {
    super(
      `Readiness dimension "${dimension}" was not requested for document ${documentUid}`,
      200,
      { code: "readiness_not_requested", retriable: false },
    );
    this.name = "ReadinessNotRequestedError";
    this.documentUid = documentUid;
    this.dimension = dimension;
    this.lastStatus = lastStatus;
  }
}

export class DocumentIncompleteError extends MindGraphError {
  public readonly documentUid: string;
  public readonly dimension: ReadinessDimension;
  public readonly lastStatus: DocumentStatus;

  constructor(
    documentUid: string,
    dimension: ReadinessDimension,
    lastStatus: DocumentStatus,
  ) {
    super(
      `Document ${documentUid} ended in state "${lastStatus.attempt_state}" without "${dimension}" readiness`,
      200,
      { code: "document_incomplete", retriable: false },
    );
    this.name = "DocumentIncompleteError";
    this.documentUid = documentUid;
    this.dimension = dimension;
    this.lastStatus = lastStatus;
  }
}

export class DocumentWaitTimeoutError extends MindGraphError {
  public readonly documentUid: string;
  public readonly attemptId: string | null;
  public readonly lastStatus: DocumentStatus | null;

  constructor(
    documentUid: string,
    attemptId: string | null,
    lastStatus: DocumentStatus | null,
    message?: string,
  ) {
    super(
      message ?? `Timed out waiting for document ${documentUid}`,
      0,
      { code: "document_wait_timeout", retriable: true },
    );
    this.name = "DocumentWaitTimeoutError";
    this.documentUid = documentUid;
    this.attemptId = attemptId;
    this.lastStatus = lastStatus;
  }
}

export class DocumentWaitCancelledError extends MindGraphError {
  public readonly documentUid: string;
  public readonly attemptId: string | null;
  public readonly lastStatus: DocumentStatus | null;

  constructor(
    documentUid: string,
    attemptId: string | null,
    lastStatus: DocumentStatus | null,
  ) {
    super(
      `Cancelled waiting for document ${documentUid}`,
      0,
      { code: "document_wait_cancelled", retriable: false },
    );
    this.name = "DocumentWaitCancelledError";
    this.documentUid = documentUid;
    this.attemptId = attemptId;
    this.lastStatus = lastStatus;
  }
}

export interface ValidatedWaitOptions {
  attemptId: string | null;
  until: ReadinessDimension;
  timeoutMs: number;
  intervalMs: number;
}

export function validateWaitForDocumentOptions(
  opts?: WaitForDocumentOptions,
): ValidatedWaitOptions {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS;
  if (
    typeof timeoutMs !== "number" ||
    !Number.isFinite(timeoutMs) ||
    !Number.isInteger(timeoutMs) ||
    timeoutMs < MIN_WAIT_TIMEOUT_MS ||
    timeoutMs > MAX_WAIT_TIMEOUT_MS
  ) {
    throw new ValidationError(
      `timeoutMs must be a finite integer in [${MIN_WAIT_TIMEOUT_MS}, ${MAX_WAIT_TIMEOUT_MS}]`,
    );
  }

  const until = opts?.until ?? "extraction";
  if (typeof until !== "string" || !VALID_DIMENSIONS.has(until)) {
    throw new ValidationError(
      `until must be one of "lexical", "vector", or "extraction"`,
    );
  }

  const rawInterval = opts?.intervalMs ?? DEFAULT_WAIT_INTERVAL_MS;
  if (typeof rawInterval !== "number" || !Number.isFinite(rawInterval)) {
    throw new ValidationError("intervalMs must be a finite number");
  }
  const intervalMs = Math.max(MIN_WAIT_INTERVAL_MS, rawInterval);

  let attemptId: string | null = null;
  if (opts?.attemptId !== undefined) {
    if (typeof opts.attemptId !== "string" || opts.attemptId.length === 0) {
      throw new ValidationError("attemptId must be a non-empty string when provided");
    }
    attemptId = opts.attemptId;
  }

  return {
    attemptId,
    until: until as ReadinessDimension,
    timeoutMs,
    intervalMs,
  };
}

/**
 * Parse RFC 9110 `Retry-After` (non-negative integer seconds or HTTP-date)
 * into milliseconds relative to `nowMs`. Returns `null` when absent/invalid.
 */
export function parseRetryAfterMs(
  header: string | null | undefined,
  nowMs: number = Date.now(),
): number | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) {
    const secs = Number(trimmed);
    return Number.isFinite(secs) ? secs * 1000 : null;
  }
  const parsedDate = Date.parse(trimmed);
  if (Number.isFinite(parsedDate)) {
    return Math.max(0, parsedDate - nowMs);
  }
  return null;
}

export function validateDocumentStatusPayload(
  value: unknown,
  httpStatus = 200,
): DocumentStatus {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new MindGraphError("Incompatible document status response", httpStatus, {
      code: "incompatible_response",
      retriable: false,
    });
  }
  const obj = value as Record<string, unknown>;
  const readiness = obj.readiness as Record<string, unknown> | undefined;
  const validReadiness =
    !!readiness &&
    typeof readiness === "object" &&
    !Array.isArray(readiness) &&
    typeof readiness.lexical === "string" &&
    VALID_DIMENSION_STATES.has(readiness.lexical) &&
    typeof readiness.vector === "string" &&
    VALID_DIMENSION_STATES.has(readiness.vector) &&
    typeof readiness.extraction === "string" &&
    VALID_DIMENSION_STATES.has(readiness.extraction);
  const hasValidAttemptId =
    Object.prototype.hasOwnProperty.call(obj, "attempt_id") &&
    (obj.attempt_id === null || typeof obj.attempt_id === "string");
  const hasValidAttemptState =
    Object.prototype.hasOwnProperty.call(obj, "attempt_state") &&
    (obj.attempt_state === null || typeof obj.attempt_state === "string");
  if (
    obj.contract !== DOCUMENT_STATUS_CONTRACT ||
    typeof obj.document_uid !== "string" ||
    !hasValidAttemptId ||
    !hasValidAttemptState ||
    !validReadiness
  ) {
    throw new MindGraphError("Incompatible document status response", httpStatus, {
      code: "incompatible_response",
      retriable: false,
    });
  }
  return value as DocumentStatus;
}

export interface RawStatusResponse {
  status: number;
  body: unknown;
  retryAfter: string | null;
}

export interface WaitClock {
  now: () => number;
  sleep: (ms: number, signal?: AbortSignal) => Promise<void>;
}

export function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function runWaitForDocumentLoop(
  documentUid: string,
  opts: ValidatedWaitOptions,
  fetchOnce: (remainingMs: number, signal?: AbortSignal) => Promise<RawStatusResponse>,
  signal?: AbortSignal,
  clock: WaitClock = { now: Date.now, sleep: defaultSleep },
): Promise<DocumentStatus> {
  let pinnedAttemptId: string | null = opts.attemptId;
  let lastStatus: DocumentStatus | null = null;

  if (signal?.aborted) {
    throw new DocumentWaitCancelledError(documentUid, pinnedAttemptId, lastStatus);
  }

  const deadline = clock.now() + opts.timeoutMs;

  while (true) {
    if (signal?.aborted) {
      throw new DocumentWaitCancelledError(documentUid, pinnedAttemptId, lastStatus);
    }
    const remainingBefore = deadline - clock.now();
    if (remainingBefore <= 0) {
      throw new DocumentWaitTimeoutError(documentUid, pinnedAttemptId, lastStatus);
    }

    let raw: RawStatusResponse;
    try {
      raw = await fetchOnce(remainingBefore, signal);
    } catch (error) {
      if (signal?.aborted) {
        throw new DocumentWaitCancelledError(documentUid, pinnedAttemptId, lastStatus);
      }
      if (error instanceof MindGraphError && error.code === "timeout") {
        throw new DocumentWaitTimeoutError(documentUid, pinnedAttemptId, lastStatus);
      }
      throw error;
    }

    if (signal?.aborted) {
      throw new DocumentWaitCancelledError(documentUid, pinnedAttemptId, lastStatus);
    }

    if (raw.status === 200) {
      const status = validateDocumentStatusPayload(raw.body, 200);
      lastStatus = status;

      // §5.2 rule 2: attempt pinning (never follow a successor silently)
      if (status.attempt_id === null) {
        throw new ReadinessUnknownError(
          documentUid,
          status,
          `Document ${documentUid} is not lifecycle-tracked (attempt_id is null)`,
        );
      }
      if (pinnedAttemptId === null) {
        pinnedAttemptId = status.attempt_id;
      } else if (status.attempt_id !== pinnedAttemptId) {
        throw new DocumentSupersededError(
          documentUid,
          pinnedAttemptId,
          status.attempt_id,
          status,
        );
      }

      // §5.2 rule 3: target dimension evaluation
      const dimState = status.readiness[opts.until];
      if (dimState === "ready") {
        return status;
      }
      if (dimState === "not_requested") {
        throw new ReadinessNotRequestedError(documentUid, opts.until, status);
      }

      // Classify active vs terminal strictly by attempt_state (never processing_status).
      if (status.attempt_state !== "running") {
        if (dimState === "unknown") {
          throw new ReadinessUnknownError(documentUid, status);
        }
        throw new DocumentIncompleteError(documentUid, opts.until, status);
      }

      // Still active ("running"): honor optional 200 Retry-After clamped to deadline.
      const nowMs = clock.now();
      const remainingAfter = deadline - nowMs;
      if (remainingAfter <= 0) {
        throw new DocumentWaitTimeoutError(documentUid, pinnedAttemptId, lastStatus);
      }
      const retryAfterMs = parseRetryAfterMs(raw.retryAfter, nowMs);
      if (retryAfterMs !== null && retryAfterMs >= remainingAfter) {
        throw new DocumentWaitTimeoutError(documentUid, pinnedAttemptId, lastStatus);
      }
      const delayMs = Math.min(Math.max(opts.intervalMs, retryAfterMs ?? 0), remainingAfter);
      await clock.sleep(delayMs, signal);
      if (signal?.aborted) {
        throw new DocumentWaitCancelledError(documentUid, pinnedAttemptId, lastStatus);
      }
      continue;
    }

    const fields = errorFields(raw.body);

    // §5.2 rule 4: 409 status_changed transparent retry
    if (raw.status === 409 && fields.code === "status_changed") {
      const remainingAfter = deadline - clock.now();
      if (remainingAfter <= 0) {
        throw new DocumentWaitTimeoutError(documentUid, pinnedAttemptId, lastStatus);
      }
      await clock.sleep(Math.min(opts.intervalMs, remainingAfter), signal);
      if (signal?.aborted) {
        throw new DocumentWaitCancelledError(documentUid, pinnedAttemptId, lastStatus);
      }
      continue;
    }

    // §5.2 rule 5: 429 / retriable 503 with Retry-After clamped to deadline
    if (raw.status === 429 || (raw.status === 503 && permitsRetry(fields))) {
      const nowMs = clock.now();
      const remainingAfter = deadline - nowMs;
      if (remainingAfter <= 0) {
        throw new DocumentWaitTimeoutError(documentUid, pinnedAttemptId, lastStatus);
      }
      const retryAfterMs = parseRetryAfterMs(raw.retryAfter, nowMs);
      if (retryAfterMs !== null && retryAfterMs >= remainingAfter) {
        throw new DocumentWaitTimeoutError(documentUid, pinnedAttemptId, lastStatus);
      }
      const delayMs = Math.min(Math.max(opts.intervalMs, retryAfterMs ?? 0), remainingAfter);
      await clock.sleep(delayMs, signal);
      if (signal?.aborted) {
        throw new DocumentWaitCancelledError(documentUid, pinnedAttemptId, lastStatus);
      }
      continue;
    }

    throw new MindGraphError(
      `GET /ingest/document/${encodeURIComponent(documentUid)}/status failed: ${raw.status}`,
      raw.status,
      raw.body,
    );
  }
}
