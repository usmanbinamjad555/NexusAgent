export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorDetail;
  timestamp: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export interface ServiceHealth {
  status: "up" | "down" | "unknown";
  latencyMs?: number;
  message?: string;
}

export interface HealthResponse {
  status: HealthStatus;
  version: string;
  uptimeSeconds: number;
  timestamp: string;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
  };
  db?: string;
  redis?: string;
}
