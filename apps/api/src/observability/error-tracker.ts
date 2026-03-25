export interface ErrorTrackingContext {
  code: string;
  message: string;
  requestId: string;
  path?: string;
  method?: string;
  status?: number;
  userId?: string;
}

export type ErrorTrackingHook = (exception: unknown, context: ErrorTrackingContext) => void | Promise<void>;

let registeredHook: ErrorTrackingHook | null = null;

export function registerErrorTrackingHook(hook: ErrorTrackingHook | null) {
  registeredHook = hook;
}

export function isErrorTrackingEnabled() {
  return process.env.ERROR_TRACKING_ENABLED === 'true' || Boolean(process.env.ERROR_TRACKING_DSN);
}

export async function captureExceptionForTracking(exception: unknown, context: ErrorTrackingContext) {
  if (!isErrorTrackingEnabled() || !registeredHook) {
    return;
  }

  await registeredHook(exception, context);
}
