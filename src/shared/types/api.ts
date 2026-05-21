export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export interface UserSession {
  id: number
  username: string
  displayName: string | null
}

export interface LoginPayload {
  username: string
  password: string
}

export type ThemeMode = 'light' | 'dark'

export type { AppSettingsFull as AppSettings } from './settings'
