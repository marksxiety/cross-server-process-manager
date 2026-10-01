
export interface ApiResponse<T = unknown> {
    success: boolean;
    message: string;
    code?: string | undefined;
    info: T | null;
    status: number;
}

export interface ApiError {
    code: string;
    message: string;
    status: number;
}