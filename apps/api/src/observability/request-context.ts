import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContextValue {
  requestId: string;
  userId?: string;
}

const requestContextStorage = new AsyncLocalStorage<RequestContextValue>();

export function runWithRequestContext<T>(value: RequestContextValue, callback: () => T) {
  return requestContextStorage.run(value, callback);
}

export function getRequestContext() {
  return requestContextStorage.getStore();
}

export function getRequestId() {
  return requestContextStorage.getStore()?.requestId ?? 'trace-mock-001';
}

export function setRequestUserId(userId?: string) {
  const context = requestContextStorage.getStore();
  if (!context || !userId) {
    return;
  }

  context.userId = userId;
}
