const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY || 'lastdigit_admin_secret_2024';

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

export interface ApiResponse {
  success: boolean;
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
  if (payload.singleDigit) formData.append('singleDigit', payload.singleDigit);
  if (payload.doubleDigit) formData.append('doubleDigit', payload.doubleDigit);
  if (payload.tripleDigit) formData.append('tripleDigit', payload.tripleDigit);
  if (payload.drawNumber) formData.append('drawNumber', payload.drawNumber);
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

