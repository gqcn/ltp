export class ApiError extends Error {
  code: number;
  errorCode?: string;

  constructor(message: string, code: number, errorCode?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.errorCode = errorCode;
  }
}

type Envelope<T> = {
  code: number;
  message: string;
  data: T;
  errorCode?: string;
};

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await res.json()) as Envelope<T>;
  if (payload.code !== 0) {
    throw new ApiError(payload.message || "请求失败", payload.code, payload.errorCode);
  }
  return payload.data;
}

export function isUnauthorized(error: unknown) {
  return error instanceof ApiError && (error.errorCode === "AUTH_UNAUTHORIZED" || error.code === 51);
}
