const BASE_URL = 'http://10.35.20.17:8080';

/**
 * Kullanıcı girişi — POST /api/Auth/login
 */
export async function login(userName, password) {
  const res = await fetch(`${BASE_URL}/api/Auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName, password }),
  });
  if (!res.ok) {
    let msg = `Auth hatası: ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) msg = body.message;
    } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

/**
 * Fabrika kodlarını getirir
 */
export async function getFabrikalar() {
  const res = await fetch(`${BASE_URL}/api/get/Fabrilkalar-Kodlar`);
  if (!res.ok) throw new Error(`Fabrikalar alınamadı: ${res.status}`);
  return res.json();
}

/**
 * Fabrikaya ait istasyonları getirir
 */
export async function getIstasyonlar(fabrikaNo, aktif = null) {
  const params = new URLSearchParams({ fabrikaNo });
  if (aktif !== null) params.append('aktif', aktif);
  const res = await fetch(`${BASE_URL}/api/get/Fabrikalar-Istasyonlar?${params}`);
  if (!res.ok) throw new Error(`İstasyonlar alınamadı: ${res.status}`);
  return res.json();
}

/**
 * Üretim emirlerini getirir
 */
export async function getUretimEmirleri(filters = {}) {
  const params = new URLSearchParams();
  if (filters.factoryCode !== undefined) params.append('factoryCode', filters.factoryCode);
  if (filters.istasyonKodu) params.append('istasyonKodu', filters.istasyonKodu);
  if (filters.urunKodu) params.append('urunKodu', filters.urunKodu);
  const res = await fetch(`${BASE_URL}/api/get/UretimEmirleri?${params}`);
  if (!res.ok) throw new Error(`Üretim emirleri alınamadı: ${res.status}`);
  return res.json();
}

/**
 * Günlük üretimleri getirir (sayfalı)
 */
export async function getGunlukUretimler(filters = {}) {
  const params = new URLSearchParams();
  if (filters.fabrikaNo !== undefined) params.append('fabrikaNo', filters.fabrikaNo);
  if (filters.istasyonKodu) params.append('istasyonKodu', filters.istasyonKodu);
  if (filters.urunKodu) params.append('urunKodu', filters.urunKodu);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.startTime) params.append('startTime', filters.startTime);
  if (filters.endTime) params.append('endTime', filters.endTime);
  if (filters.page) params.append('page', filters.page);
  if (filters.pageSize) params.append('pageSize', filters.pageSize);
  const res = await fetch(`${BASE_URL}/Uretimler/gunluk-uretimler?${params}`);
  if (!res.ok) throw new Error(`Günlük üretimler alınamadı: ${res.status}`);
  return res.json();
}

/**
 * Ürün kodlarını getirir
 */
export async function getUrunler(filters = {}) {
  const params = new URLSearchParams();
  if (filters.urunKodu) params.append('urunKodu', filters.urunKodu);
  if (filters.urunAdi) params.append('urunAdi', filters.urunAdi);
  const res = await fetch(`${BASE_URL}/api/get/Urunler-Kodlar?${params}`);
  if (!res.ok) throw new Error(`Ürünler alınamadı: ${res.status}`);
  return res.json();
}

/**
 * Tüketimleri getirir
 */
export async function getTuketimler(factoryNo, uretimFisno) {
  const params = new URLSearchParams();
  params.append('factoryNo', factoryNo);
  params.append('uretimFisno', uretimFisno);
  const res = await fetch(`${BASE_URL}/api/get/Tuketimler?${params}`);
  if (!res.ok) throw new Error(`Tüketimler alınamadı: ${res.status}`);
  return res.json();
}

/**
 * Üretim özeti getirir
 */
export async function getUretimOzeti(filters = {}) {
  const params = new URLSearchParams();
  params.append('factoryNo', filters.factoryNo);
  params.append('startDateTime', filters.startDateTime);
  params.append('endDateTime', filters.endDateTime);
  if (filters.hatKodu) params.append('hatKodu', filters.hatKodu);
  if (filters.urunKodu) params.append('urunKodu', filters.urunKodu);
  const res = await fetch(`${BASE_URL}/api/get/UretimOzeti?${params}`);
  if (!res.ok) throw new Error(`Üretim özeti alınamadı: ${res.status}`);
  return res.json();
}

/**
 * Tüketim özeti getirir
 */
export async function getTuketimOzeti(filters = {}) {
  const params = new URLSearchParams();
  params.append('factoryNo', filters.factoryNo);
  params.append('startDateTime', filters.startDateTime);
  params.append('endDateTime', filters.endDateTime);
  if (filters.hatKodu) params.append('hatKodu', filters.hatKodu);
  if (filters.urunKodu) params.append('urunKodu', filters.urunKodu);
  if (filters.stokKodu) params.append('stokKodu', filters.stokKodu);
  const res = await fetch(`${BASE_URL}/api/get/TuketimOzeti?${params}`);
  if (!res.ok) throw new Error(`Tüketim özeti alınamadı: ${res.status}`);
  return res.json();
}
