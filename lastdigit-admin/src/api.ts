const BASE_URL = import.meta.env.VITE_API_URL;
const ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY;

export type LotteryType = 'singapore' | 'dear';
export type Session = 'morning' | 'day' | 'evening';

export interface UploadResultPayload {
  drawDate: string;
  session: Session;
  singleDigit?: string;
  doubleDigit?: string;
  tripleDigit?: string;
  drawNumber?: string;
  resultImage?: File | null;
}

export interface ExistingDraw {
  id: number;
  drawDate: string;
  session: Session;
  singleDigit: string | null;
  doubleDigit: string | null;
  tripleDigit: string | null;
  resultImage: string | null;
  drawNumber?: string | null;
  isPublished?: boolean;
}

export interface ApiResponse {
  success: boolean;
  action?: 'created' | 'updated';
  message: string;
  result?: Record<string, unknown>;
}

export async function uploadLotteryResult(
  type: LotteryType,
  payload: UploadResultPayload
): Promise<ApiResponse> {
  const formData = new FormData();
  formData.append('drawDate', payload.drawDate);
  formData.append('session', payload.session);
  if (payload.singleDigit !== undefined) formData.append('singleDigit', payload.singleDigit);
  if (payload.doubleDigit !== undefined) formData.append('doubleDigit', payload.doubleDigit);
  if (payload.tripleDigit !== undefined) formData.append('tripleDigit', payload.tripleDigit);
  if (payload.drawNumber !== undefined) formData.append('drawNumber', payload.drawNumber);
  if (payload.resultImage) formData.append('resultImage', payload.resultImage);

  const res = await fetch(`${BASE_URL}/${type}`, {
    method: 'POST',
    headers: {
      'x-admin-key': ADMIN_KEY,
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Upload failed');
  return data;
}

export async function getExistingDraw(
  type: LotteryType,
  date: string,
  session: Session,
  signal?: AbortSignal
): Promise<ExistingDraw | null> {
  if (!date) return null;
  try {
    const res = await fetch(`${BASE_URL}/${type}?date=${encodeURIComponent(date)}&session=${encodeURIComponent(session)}`, {
      headers: {
        'x-admin-key': ADMIN_KEY,
      },
      signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && Array.isArray(data.draws) && data.draws.length > 0) {
      // Find the exact match for session AND date
      const match = data.draws.find(
        (d: ExistingDraw) => d.session === session && (!d.drawDate || d.drawDate === date)
      );
      return match || null;
    }
    return null;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return null;
    }
    return null;
  }
}
