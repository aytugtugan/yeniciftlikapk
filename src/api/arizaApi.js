/**
 * Arıza Kayıtları API servisi
 * Base URL: http://10.35.20.17:8080
 */

const API_BASE = 'http://10.35.20.17:8080';

import { onTokenExpired } from '../utils/authEvents';

async function arizaRequest(endpoint, token, method = 'GET', body = null) {
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
    const text = await res.text().catch(() => '');
    throw new Error(`API Hatası ${res.status}: ${text || res.statusText}`);
  }

  const text = await res.text();
  if (!text || text.trim() === '') return null;
  return JSON.parse(text);
}

/**
 * Yeni bir arıza kaydı açar
 */
export async function createArizaKayit(token, data) {
  return arizaRequest(
    '/api/v1/ArizaKayitlari',
    token,
    'POST',
    {
      makineKodu: data.makineKodu,
      arizaNedeni: data.arizaNedeni,
      factoryNo: data.factoryNo || 2,
      acanKullanici: data.acanKullanici,
    }
  );
}

/**
 * Arıza kayıtlarını listeler
 */
export async function getArizaKayitlari(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.factoryNo) params.append('factoryNo', filters.factoryNo.toString());
  if (filters.durum) params.append('durum', filters.durum);
  if (filters.makineKodu) params.append('makineKodu', filters.makineKodu);
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());

  const query = params.toString();
  const endpoint = `/api/v1/ArizaKayitlari${query ? '?' + query : ''}`;
  return arizaRequest(endpoint, token, 'GET');
}

/**
 * Belirli bir arıza kaydının detaylarını getirir
 */
export async function getArizaKayitById(token, id) {
  return arizaRequest(`/api/v1/ArizaKayitlari/${id}`, token, 'GET');
}

/**
 * Bir arıza kaydını çözer
 */
export async function resolveArizaKayit(token, id, arizaCozumu, cozenKullanici) {
  return arizaRequest(
    `/api/v1/ArizaKayitlari/${id}/coz`,
    token,
    'PUT',
    { arizaCozumu, cozenKullanici }
  );
}
