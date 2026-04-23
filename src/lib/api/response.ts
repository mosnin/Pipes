export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = { ok: false; error: string };

export function success<T>(data: T): ApiSuccess<T> {
  return { ok: true, data };
}

export function failure(error: string): ApiFailure {
  return { ok: false, error };
}
