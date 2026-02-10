/**
 * TypeScript interfaces for Setup Manager webhook payloads
 * with input validation utilities
 */

export interface SetupManagerStartedWebhook {
  name: "Started";
  event: "com.jamf.setupmanager.started";
  timestamp: string;
  started: string;
  modelName: string;
  modelIdentifier: string;
  macOSBuild: string;
  macOSVersion: string;
  serialNumber: string;
  setupManagerVersion: string;
  jamfProVersion?: string;
  jssID?: string;
}

export interface EnrollmentAction {
  label: string;
  status: "finished" | "failed";
}

export interface UserEntry {
  department?: string;
  computerName?: string;
  userID?: string;
  assetTag?: string;
}

export interface SetupManagerFinishedWebhook extends Omit<SetupManagerStartedWebhook, 'name' | 'event'> {
  name: "Finished";
  event: "com.jamf.setupmanager.finished";
  duration: number;
  finished: string;
  computerName?: string;
  userEntry?: UserEntry;
  enrollmentActions?: EnrollmentAction[];
  uploadThroughput?: number;
  downloadThroughput?: number;
}

export type SetupManagerWebhook = SetupManagerStartedWebhook | SetupManagerFinishedWebhook;

export interface StoredEvent {
  payload: SetupManagerWebhook;
  timestamp: number;
  eventId: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Required fields for all Setup Manager webhooks
 */
const REQUIRED_BASE_FIELDS = [
  'name',
  'event',
  'timestamp',
  'started',
  'modelName',
  'modelIdentifier',
  'macOSBuild',
  'macOSVersion',
  'serialNumber',
  'setupManagerVersion'
] as const;

/**
 * Additional required fields for finished webhooks
 */
const REQUIRED_FINISHED_FIELDS = ['duration', 'finished'] as const;

/**
 * Valid event types
 */
const VALID_EVENTS = [
  'com.jamf.setupmanager.started',
  'com.jamf.setupmanager.finished'
] as const;

/**
 * Validates that a value is a non-empty string
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validates that a value is a valid ISO 8601 timestamp
 */
function isValidTimestamp(value: unknown): boolean {
  if (!isNonEmptyString(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Validates that a value is a non-negative number
 */
function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && isFinite(value);
}

/**
 * Validates an enrollment action object
 */
function isValidEnrollmentAction(action: unknown): action is EnrollmentAction {
  if (typeof action !== 'object' || action === null) return false;
  if (hasDangerousKeys(action)) return false;
  const obj = action as Record<string, unknown>;
  return (
    isNonEmptyString(obj.label) &&
    (obj.status === 'finished' || obj.status === 'failed')
  );
}

/**
 * Validates a UserEntry object
 */
function isValidUserEntry(entry: unknown): entry is UserEntry {
  if (typeof entry !== 'object' || entry === null) return false;
  if (hasDangerousKeys(entry)) return false;
  const obj = entry as Record<string, unknown>;

  // All fields are optional, but if present must be strings
  const optionalStringFields = ['department', 'computerName', 'userID', 'assetTag'];
  for (const field of optionalStringFields) {
    if (obj[field] !== undefined && typeof obj[field] !== 'string') {
      return false;
    }
  }
  return true;
}

/**
 * Property names that could enable prototype pollution if passed through
 */
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'] as const;

/**
 * Checks an object for prototype pollution keys
 */
function hasDangerousKeys(obj: object): boolean {
  return Object.keys(obj).some((key) =>
    (DANGEROUS_KEYS as readonly string[]).includes(key)
  );
}

/**
 * Validates a Setup Manager webhook payload
 * Returns validation result with error message if invalid
 */
export function validateWebhookPayload(payload: unknown): ValidationResult {
  // Check if payload is an object
  if (typeof payload !== 'object' || payload === null) {
    return { valid: false, error: 'Payload must be a non-null object' };
  }

  // Reject payloads with prototype pollution keys
  if (hasDangerousKeys(payload)) {
    return { valid: false, error: 'Payload contains forbidden property names' };
  }

  const obj = payload as Record<string, unknown>;

  // Validate event type first
  if (!VALID_EVENTS.includes(obj.event as typeof VALID_EVENTS[number])) {
    return {
      valid: false,
      error: 'Invalid event type'
    };
  }

  // Validate required base fields
  for (const field of REQUIRED_BASE_FIELDS) {
    if (!isNonEmptyString(obj[field])) {
      return { valid: false, error: `Missing or invalid required field: ${field}` };
    }
  }

  // Validate timestamps
  if (!isValidTimestamp(obj.timestamp)) {
    return { valid: false, error: 'Invalid timestamp format' };
  }
  if (!isValidTimestamp(obj.started)) {
    return { valid: false, error: 'Invalid started timestamp format' };
  }

  // Validate name matches event type
  if (obj.event === 'com.jamf.setupmanager.started' && obj.name !== 'Started') {
    return { valid: false, error: 'name must be "Started" for started events' };
  }
  if (obj.event === 'com.jamf.setupmanager.finished' && obj.name !== 'Finished') {
    return { valid: false, error: 'name must be "Finished" for finished events' };
  }

  // Additional validation for finished events
  if (obj.event === 'com.jamf.setupmanager.finished') {
    for (const field of REQUIRED_FINISHED_FIELDS) {
      if (field === 'duration') {
        if (!isNonNegativeNumber(obj[field])) {
          return { valid: false, error: 'duration must be a non-negative number' };
        }
      } else if (!isNonEmptyString(obj[field])) {
        return { valid: false, error: `Missing or invalid required field: ${field}` };
      }
    }

    if (!isValidTimestamp(obj.finished)) {
      return { valid: false, error: 'Invalid finished timestamp format' };
    }

    // Validate optional enrollmentActions array
    if (obj.enrollmentActions !== undefined) {
      if (!Array.isArray(obj.enrollmentActions)) {
        return { valid: false, error: 'enrollmentActions must be an array' };
      }
      for (let i = 0; i < obj.enrollmentActions.length; i++) {
        if (!isValidEnrollmentAction(obj.enrollmentActions[i])) {
          return { valid: false, error: `Invalid enrollment action at index ${i}` };
        }
      }
    }

    // Validate optional userEntry
    if (obj.userEntry !== undefined && !isValidUserEntry(obj.userEntry)) {
      return { valid: false, error: 'Invalid userEntry object' };
    }

    // Validate optional throughput fields
    if (obj.uploadThroughput !== undefined && !isNonNegativeNumber(obj.uploadThroughput)) {
      return { valid: false, error: 'uploadThroughput must be a non-negative number' };
    }
    if (obj.downloadThroughput !== undefined && !isNonNegativeNumber(obj.downloadThroughput)) {
      return { valid: false, error: 'downloadThroughput must be a non-negative number' };
    }
  }

  // Validate optional string fields
  const optionalStringFields = ['jamfProVersion', 'jssID', 'computerName'];
  for (const field of optionalStringFields) {
    if (obj[field] !== undefined && typeof obj[field] !== 'string') {
      return { valid: false, error: `${field} must be a string if provided` };
    }
  }

  return { valid: true };
}

/**
 * Type guard to check if a validated payload is a SetupManagerWebhook
 */
export function isSetupManagerWebhook(payload: unknown): payload is SetupManagerWebhook {
  return validateWebhookPayload(payload).valid;
}

// UI types

export interface FilterState {
  eventType: "all" | "started" | "finished" | "failed";
  macOSVersion: string;
  model: string;
  timeRange: "hour" | "day" | "week" | "all";
  search: string;
}

export interface Stats {
  total: number;
  started: number;
  finished: number;
  avgDuration: number;
  successRate: number;
  failedActions: number;
}

/** Flat webhook shape used by UI components (union fields optional) */
export interface WebhookPayload {
  name: "Started" | "Finished";
  event: "com.jamf.setupmanager.started" | "com.jamf.setupmanager.finished";
  timestamp: string;
  started: string;
  finished?: string;
  duration?: number;
  modelName: string;
  modelIdentifier: string;
  macOSBuild: string;
  macOSVersion: string;
  serialNumber: string;
  setupManagerVersion: string;
  computerName?: string;
  jamfProVersion?: string;
  jssID?: string;
  userEntry?: UserEntry;
  enrollmentActions?: EnrollmentAction[];
  uploadThroughput?: number;
  downloadThroughput?: number;
}
