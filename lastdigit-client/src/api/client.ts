/**
 * Centralized API client for communicating with lastdigit-server.
 *
 * In production / APK builds, set VITE_API_URL to your live server URL.
 * e.g. https://api.lastdigit.com
 *
 * In development, the Vite dev-server proxy forwards /api → localhost:5000.
 */

// In Capacitor (APK), there's no dev proxy — we need the absolute URL.
// VITE_API_URL should be set to your production server in .env.production
export const API_BASE_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:5000'

export interface User {
    id: number
    name: string
    email: string
    role: 'user' | 'admin'
}

export interface DrawItem {
    id: number
    drawDate: string
    dateFormatted?: string
    session: 'morning' | 'day' | 'evening'
    singleDigit: string | null
    doubleDigit: string | null
    tripleDigit: string | null
    resultImage: string | null
    drawNumber?: string | null
}

export interface FormattedRow {
    date: string
    rawDate?: string
    morning: string
    day: string
    evening: string
}

export interface ResultSets {
    single: FormattedRow[]
    double: FormattedRow[]
    triple: FormattedRow[]
}

export interface LotteryResponse {
    success: boolean
    total?: number
    page?: number
    totalPages?: number
    results: ResultSets
    draws: DrawItem[]
}

export interface LatestLotteryResponse {
    success: boolean
    drawDate: string
    dateFormatted: string
    results: ResultSets
    sessions: DrawItem[]
}

// ── Auth helpers ─────────────────────────────────────────────────────────────
const TOKEN_KEY = 'lastdigit_token'

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token)
export const removeToken = (): void => localStorage.removeItem(TOKEN_KEY)

const authHeaders = (): Record<string, string> => {
    const token = getToken()
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }
    return headers
}

// ── Auth API ─────────────────────────────────────────────────────────────────
export async function loginUser(email: string, password: string): Promise<{ success: boolean; token?: string; user?: User; message?: string }> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        if (data.success && data.token) {
            setToken(data.token)
        }
        return data
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Login failed'
        return { success: false, message }
    }
}

export async function registerUser(name: string, email: string, password: string): Promise<{ success: boolean; token?: string; user?: User; message?: string }> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        })
        const data = await res.json()
        if (data.success && data.token) {
            setToken(data.token)
        }
        return data
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Registration failed'
        return { success: false, message }
    }
}

export async function getCurrentUser(): Promise<User | null> {
    const token = getToken()
    if (!token) return null
    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: authHeaders(),
        })
        if (!res.ok) {
            removeToken()
            return null
        }
        const data = await res.json()
        return data.user || null
    } catch {
        return null
    }
}

export function logoutUser(): void {
    removeToken()
}

// ── Lottery API ──────────────────────────────────────────────────────────────
export async function getSingaporeResults(): Promise<LotteryResponse> {
    const res = await fetch(`${API_BASE_URL}/api/singapore`, {
        headers: authHeaders(),
    })
    if (!res.ok) {
        throw new Error(`Failed to fetch Singapore results (HTTP ${res.status})`)
    }
    return res.json()
}

export async function getSingaporeLatest(): Promise<LatestLotteryResponse> {
    const res = await fetch(`${API_BASE_URL}/api/singapore/latest`, {
        headers: authHeaders(),
    })
    if (!res.ok) {
        throw new Error(`Failed to fetch latest Singapore results (HTTP ${res.status})`)
    }
    return res.json()
}

export async function getDearResults(): Promise<LotteryResponse> {
    const res = await fetch(`${API_BASE_URL}/api/dear`, {
        headers: authHeaders(),
    })
    if (!res.ok) {
        throw new Error(`Failed to fetch Dear results (HTTP ${res.status})`)
    }
    return res.json()
}

export async function getDearLatest(): Promise<LatestLotteryResponse> {
    const res = await fetch(`${API_BASE_URL}/api/dear/latest`, {
        headers: authHeaders(),
    })
    if (!res.ok) {
        throw new Error(`Failed to fetch latest Dear results (HTTP ${res.status})`)
    }
    return res.json()
}

export async function getLotteryByDate(
    lottery: 'singapore' | 'dear',
    date: string
): Promise<LotteryResponse> {
    const res = await fetch(`${API_BASE_URL}/api/${lottery}?date=${encodeURIComponent(date)}`, {
        headers: authHeaders(),
    })
    if (!res.ok) {
        throw new Error(`Failed to fetch ${lottery} results for ${date} (HTTP ${res.status})`)
    }
    return res.json()
}
