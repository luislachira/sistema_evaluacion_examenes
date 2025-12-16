// Tipos para manejo de errores de API
export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

export interface AxiosErrorResponse {
  response?: {
    data?: ApiError | { message?: string; mensaje?: string };
    status?: number;
  };
  message?: string;
}

