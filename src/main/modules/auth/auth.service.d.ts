import type { ApiResult, LoginPayload, UserSession } from '@shared/types/api';
export declare function login(payload: LoginPayload): ApiResult<UserSession>;
export declare function logout(): ApiResult<null>;
export declare function getSession(): ApiResult<UserSession | null>;
export declare function getCurrentUserId(): number | null;
