/**
 * Backend API response types.
 *
 * These types mirror the exact shape of API responses from the .NET backend.
 * For frontend-enriched types (combining multiple API calls), see ../types.ts
 */

// ─────────────────────────────────────────────────────────────────────────────
// Pool responses
// ─────────────────────────────────────────────────────────────────────────────

/** GET /pools - list item */
export interface PoolResponse {
  id: string;
  name: string;
  createdAt: string; // ISO 8601
}

/** GET /pools/:id - includes casuals */
export interface PoolDetailResponse extends PoolResponse {
  casuals: CasualResponse[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Casual responses
// ─────────────────────────────────────────────────────────────────────────────

/** Invite status values from backend */
export type InviteStatusValue = "Pending" | "Accepted";

/** Casual worker in a pool */
export interface CasualResponse {
  id: string;
  name: string;
  phoneNumber: string;
  inviteStatus: InviteStatusValue;
  isActive: boolean;
  isOptedOut: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shift responses
// ─────────────────────────────────────────────────────────────────────────────

/** Shift status values from backend */
export type ShiftStatusValue = "Open" | "Filled" | "Cancelled";

/** Claim status values from backend */
export type ClaimStatusValue = "Claimed" | "Bailed" | "ReleasedByManager";

/** GET /pools/:id/shifts - list item */
export interface ShiftResponse {
  id: string;
  startsAt: string; // ISO 8601
  endsAt: string; // ISO 8601
  spotsNeeded: number;
  spotsRemaining: number;
  status: ShiftStatusValue;
}

/** Shift with claims included (used in shift details) */
export interface ShiftDetailResponse extends ShiftResponse {
  claims: ClaimResponse[];
}

/** Individual shift claim */
export interface ClaimResponse {
  casualId: string;
  casualName: string;
  status: ClaimStatusValue;
  claimedAt: string; // ISO 8601
}

// ─────────────────────────────────────────────────────────────────────────────
// Request types (for POST/PUT/PATCH)
// ─────────────────────────────────────────────────────────────────────────────

/** POST /pools/:id/shifts */
export interface CreateShiftRequest {
  startsAt: string; // ISO 8601
  endsAt: string; // ISO 8601
  spotsNeeded: number;
}

/** POST /pools/:id/casuals */
export interface AddCasualRequest {
  name: string;
  phoneNumber: string;
}

/** POST /pools */
export interface CreatePoolRequest {
  name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Casual API responses (phone-based auth)
// ─────────────────────────────────────────────────────────────────────────────

/** GET /casual/shifts */
export interface CasualAvailableShiftsResponse {
  casual: CasualResponse;
  availableShifts: ShiftResponse[];
}

/** POST /casual/shifts/:id/claim */
export interface ClaimShiftResponse {
  message: string;
  shift: ShiftDetailResponse;
}

/** POST /casual/shifts/:id/bail */
export interface BailShiftResponse {
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Token-based casual endpoints (anonymous, SMS-initiated)
// ─────────────────────────────────────────────────────────────────────────────

/** POST /casual/verify - phone verification via invite token */
export interface VerifyInviteRequest {
  token: string;
}

export interface VerifyInviteResponse {
  casualId: string;
  casualName: string;
  poolName: string;
  message: string;
}

/** POST /casual/opt-out - unsubscribe from notifications */
export interface OptOutRequest {
  token: string;
}

export interface OptOutResponse {
  message: string;
}

/** POST /casual/claim/:token - one-click shift claim from SMS */
export interface ClaimByTokenResponse {
  message: string;
  shift: ShiftResponse;
  casualName: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Manager casual management
// ─────────────────────────────────────────────────────────────────────────────

/** POST /pools/:id/casuals/:casualId/resend-invite */
export interface ResendInviteResponse {
  message: string;
  casual: CasualResponse;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pool Admin (2IC) types
// ─────────────────────────────────────────────────────────────────────────────

/** Pool admin (2IC) response */
export interface PoolAdminResponse {
  id: string;
  phoneNumber: string;
  name: string;
  invitedAt: string; // ISO 8601
  acceptedAt: string | null; // ISO 8601 or null if pending
  isAccepted: boolean;
}

/** POST /pools/:id/admins */
export interface InviteAdminRequest {
  phoneNumber: string;
  name: string;
}

/** POST /pool-admins/accept/:token */
export interface AcceptAdminInviteResponse {
  poolName: string;
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Casual Availability types
// ─────────────────────────────────────────────────────────────────────────────

/** Availability slot for a specific day */
export interface AvailabilitySlot {
  dayOfWeek: number; // 0=Sun, 6=Sat
  fromTime: string; // "HH:mm"
  toTime: string; // "HH:mm"
}

/** PUT /pools/:id/casuals/:casualId/availability */
export interface SetAvailabilityRequest {
  availability: AvailabilitySlot[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Error handling
// ─────────────────────────────────────────────────────────────────────────────

/** Standard API error response shape */
export interface ApiErrorResponse {
  error: string;
  message?: string;
  details?: Record<string, string[]>;
}

/** Custom error class for API errors */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Check if this is a specific HTTP status code */
  is(status: number): boolean {
    return this.status === status;
  }

  /** Check if this is a conflict (409) error - common with optimistic concurrency */
  get isConflict(): boolean {
    return this.status === 409;
  }

  /** Check if this is a validation error (400) */
  get isValidationError(): boolean {
    return this.status === 400;
  }

  /** Check if this is unauthorized (401) */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** Check if this is not found (404) */
  get isNotFound(): boolean {
    return this.status === 404;
  }
}
