/**
 * Fire Kayıtları API servisi
 * Base URL: http://10.35.20.17:8080
 * Mobil uygulama sadece backend endpoint çağırır – Logo ERP'ye direkt erişim yok.
 */

const API_BASE = 'http://10.35.20.17:8080';

import { onTokenExpired } from '../utils/authEvents';

async function fireRequest(endpoint, token, method = 'GET', body = null) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);

  if (res.status === 401) {
    onTokenExpired();
    throw new Error('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
  }

  if (!res.ok) {
    let errorMsg = '';
    try {
      const text = await res.text();
      // Try to parse JSON error body
      try {
        const json = JSON.parse(text);
        errorMsg = json.message || json.title || json.detail || text;
      } catch {
        errorMsg = text;
      }
    } catch {
      errorMsg = res.statusText;
    }
    throw new Error(errorMsg || `API Hatası ${res.status}`);
  }

  const text = await res.text();
  if (!text || text.trim() === '') return null;
  return JSON.parse(text);
}

/**
 * Fire kayıtlarını listeler
 * GET /api/v1/FireKayitlari?factoryNo=2
 */
export async function getFireKayitlari(token, factoryNo = 2) {
  return fireRequest(`/api/v1/FireKayitlari?factoryNo=${encodeURIComponent(factoryNo)}`, token, 'GET');
}

/**
 * Yeni fire kaydı oluşturur
 * POST /api/v1/FireKayitlari
 */
export async function createFireKayit(token, data) {
  return fireRequest('/api/v1/FireKayitlari', token, 'POST', {
    urunKodu: data.urunKodu,
    urunAdi: data.urunAdi,
    fireNedeni: data.fireNedeni,
    fireAdeti: Number(data.fireAdeti) || 0,
    girenKullanici: data.girenKullanici,
    factoryNo: data.factoryNo ?? 2,
  });
}
