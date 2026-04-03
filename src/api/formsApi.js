const BASE_URL = 'http://10.35.20.17:8080';

// ── Generic helpers ──────────────────────────────────────────
async function get(path, params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.append(k, v);
  });
  const url = `${BASE_URL}${path}${qs.toString() ? '?' + qs : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${path} hata: ${res.status}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = 'Kayıt sırasında hata oluştu';
    try {
      const e = await res.json();
      if (e?.error) {
        msg = e.error;
      } else if (e?.errors) {
        const details = Object.entries(e.errors)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join('\n');
        msg = details || e?.title || msg;
      } else {
        msg = e?.title || e?.detail || msg;
      }
    } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

async function put(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = 'Güncelleme sırasında hata oluştu';
    try { const e = await res.json(); msg = e?.title || e?.detail || msg; } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

async function del(path) {
  // Try primary path first, then fallback without trailing slash variations
  const res = await fetch(`${BASE_URL}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Silme başarısız: ${res.status}`);
}

// ── VardiyaRapor (v1) ────────────────────────────────────────
export const getVardiyaRaporListV1 = (params) => get('/api/v1/VardiyaRapor', params);
export const getVardiyaRaporByIdV1 = (id) => get(`/api/v1/VardiyaRapor/${id}`);
export const createVardiyaRaporV1 = (data) => post('/api/v1/VardiyaRapor', data);
export const updateVardiyaRaporV1 = (id, data) => put(`/api/v1/VardiyaRapor/${id}`, data);
export const deleteVardiyaRaporV1 = (id) => del(`/api/v1/VardiyaRapor/${id}`);

// ── VardiyaHammadde (v1) ─────────────────────────────────────
export const getVardiyaHammaddeListV1 = (params) => get('/api/v1/VardiyaHammadde', params);
export const createVardiyaHammaddeV1 = (data) => post('/api/v1/VardiyaHammadde', data);
export const updateVardiyaHammaddeV1 = (id, data) => put(`/api/v1/VardiyaHammadde/${id}`, data);

// ── StokHareket (v1 - Otomatik Doldurma) ────────────────────
export const getStokHareketVardiyaOzet = (params) => get('/api/v1/StokHareket/VardiyaRaporOzet', params);
export const getStokHareketDomatesAlimFiciBesleme = (params) => get('/api/v1/StokHareket/DomatesAlimFiciBesleme', params);
export const getStokHareketDomatesFiciTuketim = (params) => get('/api/v1/StokHareket/DomatesFiciTuketim', params);

// ── Günlük Üretimler (paketleme otomatik doldurma) ───────────
export const getGunlukUretimler = (params) => get('/Uretimler/gunluk-uretimler', params);

// ── Üretim Özet (toplam üretim miktarı) ─────────────────────
export const getUretimOzeti = (params) => get('/api/get/UretimOzeti', params);

// ── Tüketim Özet (hammadde otomatik doldurma) ────────────────
export const getTuketimOzeti = (params) => get('/api/get/TuketimOzeti', params);

// ── BullBrix ─────────────────────────────────────────────────
export const getBullBrixList = (params) => get('/api/BullBrix', params);
export const getBullBrixById = (id) => get(`/api/BullBrix/${id}`);
export const createBullBrix = (data) => post('/api/BullBrix', data);
export const updateBullBrix = (id, data) => put(`/api/BullBrix/${id}`, data);
export const deleteBullBrix = (id) => del(`/api/BullBrix/${id}`);

// ── DepoSevkHazirlik ────────────────────────────────────────
export const getDepoSevkList = (params) => get('/api/DepoSevkHazirlik', params);
export const getDepoSevkById = (id) => get(`/api/DepoSevkHazirlik/${id}`);
export const createDepoSevk = (data) => post('/api/DepoSevkHazirlik', data);
export const updateDepoSevk = (id, data) => put(`/api/DepoSevkHazirlik/${id}`, data);
export const deleteDepoSevk = (id) => del(`/api/DepoSevkHazirlik/${id}`);

// ── DolumBrix ────────────────────────────────────────────────
export const getDolumBrixList = (params) => get('/api/DolumBrix', params);
export const getDolumBrixById = (id) => get(`/api/DolumBrix/${id}`);
export const createDolumBrix = (data) => post('/api/DolumBrix', data);
export const updateDolumBrix = (id, data) => put(`/api/DolumBrix/${id}`, data);
export const deleteDolumBrix = (id) => del(`/api/DolumBrix/${id}`);

// ── DolumBull ────────────────────────────────────────────────
export const getDolumBullList = () => get('/api/DolumBull');
export const getDolumBullById = (id) => get(`/api/DolumBull/${id}`);
export const createDolumBull = (data) => post('/api/DolumBull', data);
export const deleteDolumBull = (id) => del(`/api/DolumBull/${id}`);

// ── MamulKpcKontrol ──────────────────────────────────────────
export const getMamulKpcList = (params) => get('/api/MamulKpcKontrol', params);
export const getMamulKpcById = (id) => get(`/api/MamulKpcKontrol/${id}`);
export const createMamulKpc = (data) => post('/api/MamulKpcKontrol', data);
export const updateMamulKpc = (id, data) => put(`/api/MamulKpcKontrol/${id}`, data);
export const deleteMamulKpc = (id) => del(`/api/MamulKpcKontrol/${id}`);

// ── UretimKontrolNumune ──────────────────────────────────────
export const getUretimKontrolList = (params) => get('/api/UretimKontrolNumune', params);
export const getUretimKontrolById = (id) => get(`/api/UretimKontrolNumune/${id}`);
export const createUretimKontrol = (data) => post('/api/UretimKontrolNumune', data);
export const updateUretimKontrol = (id, data) => put(`/api/UretimKontrolNumune/${id}`, data);
export const deleteUretimKontrol = (id) => del(`/api/UretimKontrolNumune/${id}`);

// ── GunlukRaporlar ───────────────────────────────────────────
export const getGunlukRaporlarList = () => get('/api/GunlukRaporlar');
export const getGunlukRaporlarById = (id) => get(`/api/GunlukRaporlar/${id}`);
export const createGunlukRapor = (data) => post('/api/GunlukRaporlar', data);
export const updateGunlukRapor = (id, data) => put(`/api/GunlukRaporlar/${id}`, data);
export const deleteGunlukRapor = (id) => del(`/api/GunlukRaporlar/${id}`);
export const getGunlukRaporByTarih = (tarih) => get('/api/GunlukRaporlar/by-tarih', { tarih });
export const getGunlukRaporByTarihAralik = (tarihBas, tarihBit) => get('/api/GunlukRaporlar/by-tarih-aralik', { tarihBas, tarihBit });

// ── VardiyaUretimRaporu ──────────────────────────────────────
export const getVardiyaRaporList = (params) => get('/api/VardiyaUretimRaporu', params);
export const getVardiyaRaporById = (id) => get(`/api/VardiyaUretimRaporu/${id}`);
export const createVardiyaRapor = (data) => post('/api/VardiyaUretimRaporu', data);
export const updateVardiyaRapor = (id, data) => put(`/api/VardiyaUretimRaporu/${id}`, data);
export const deleteVardiyaRapor = (id) => del(`/api/VardiyaUretimRaporu/${id}`);

// ── VardiyaHatDurum ──────────────────────────────────────────
export const getVardiyaHatDurumList = (params) => get('/api/VardiyaHatDurum', params);
export const getVardiyaHatDurumById = (id) => get(`/api/VardiyaHatDurum/${id}`);
export const createVardiyaHatDurum = (data) => post('/api/VardiyaHatDurum', data);
export const updateVardiyaHatDurum = (id, data) => put(`/api/VardiyaHatDurum/${id}`, data);
export const deleteVardiyaHatDurum = (id) => del(`/api/VardiyaHatDurum/${id}`);

// ── VardiyaPaketleme ─────────────────────────────────────────
export const getVardiyaPaketlemeList = (params) => get('/api/VardiyaPaketleme', params);
export const getVardiyaPaketlemeById = (id) => get(`/api/VardiyaPaketleme/${id}`);
export const createVardiyaPaketleme = (data) => post('/api/VardiyaPaketleme', data);
export const updateVardiyaPaketleme = (id, data) => put(`/api/VardiyaPaketleme/${id}`, data);
export const deleteVardiyaPaketleme = (id) => del(`/api/VardiyaPaketleme/${id}`);

// ── VardiyaHammaddeDetay ─────────────────────────────────────
export const getVardiyaHammaddeList = (params) => get('/api/VardiyaHammaddeDetay', params);
export const getVardiyaHammaddeById = (id) => get(`/api/VardiyaHammaddeDetay/${id}`);
export const createVardiyaHammadde = (data) => post('/api/VardiyaHammaddeDetay', data);
export const updateVardiyaHammadde = (id, data) => put(`/api/VardiyaHammaddeDetay/${id}`, data);
export const deleteVardiyaHammadde = (id) => del(`/api/VardiyaHammaddeDetay/${id}`);

// ── Form definitions (metadata for UI) ──────────────────────
export const FORM_DEFINITIONS = [
  {
    key: 'bullBrix',
    title: 'Bull Brix Kontrol',
    description: 'Bull brix değerleri ve sıcaklık kontrolleri',
    icon: 'flask',
    color: '#7C3AED',
    bgColor: '#F3E8FF',
    listFn: getBullBrixList,
    createFn: createBullBrix,
    updateFn: updateBullBrix,
    deleteFn: deleteBullBrix,
    filterParams: ['tarih', 'vardiya'],
    fields: [
      { key: 'bullNo', label: 'Bull No', type: 'text', required: true, maxLength: 50 },
      { key: 'sicaklik', label: 'Sıcaklık', type: 'number', max: 500 },
      { key: 'bullBrixDegeri', label: 'Bull Brix Değeri', type: 'number', max: 100 },
      { key: 'bullKKontrolBrix', label: 'K.Kontrol Brix', type: 'number', max: 100 },
      { key: 'renk', label: 'Renk', type: 'text', maxLength: 50 },
      { key: 'vardiya', label: 'Vardiya', type: 'vardiya', required: true },
      { key: 'saat', label: 'Saat', type: 'time' },
      { key: 'tarih', label: 'Tarih', type: 'date' },
    ],
  },
  {
    key: 'depoSevk',
    title: 'Depo Sevk Hazırlık',
    description: 'Depo sevkiyat hazırlık ve palet kontrolleri',
    icon: 'box',
    color: '#F97316',
    bgColor: '#FFF7ED',
    listFn: getDepoSevkList,
    createFn: createDepoSevk,
    updateFn: updateDepoSevk,
    deleteFn: deleteDepoSevk,
    filterParams: ['sogutmaCikisTarihi', 'uretimTarihi', 'vardiya'],
    fields: [
      { key: 'sogutmaCikisTarihi', label: 'Soğutma Çıkış Tarihi', type: 'date' },
      { key: 'uretimTarihi', label: 'Üretim Tarihi', type: 'date' },
      { key: 'kontrolEden', label: 'Kontrol Eden', type: 'text', maxLength: 100 },
      { key: 'vardiya', label: 'Vardiya', type: 'vardiya', required: true },
      { key: 'no', label: 'No', type: 'text', maxLength: 50 },
      { key: 'urunCinsi', label: 'Ürün Cinsi', type: 'text', maxLength: 100 },
      { key: 'miktarKoli', label: 'Miktar (Koli)', type: 'integer', max: 10000 },
      { key: 'gunNo', label: 'Gün No', type: 'text', maxLength: 50 },
      { key: 'paletNo', label: 'Palet No', type: 'text', maxLength: 50 },
      { key: 'paletBitisSaati', label: 'Palet Bitiş Saati', type: 'time' },
      { key: 'onayParaf', label: 'Onay / Paraf', type: 'text', maxLength: 100 },
    ],
  },
  {
    key: 'dolumBrix',
    title: 'Dolum Brix Kontrol',
    description: 'Dolum brix değerleri ve renk kontrolleri',
    icon: 'droplet',
    color: '#0095F6',
    bgColor: '#E8F4FD',
    listFn: getDolumBrixList,
    createFn: createDolumBrix,
    updateFn: updateDolumBrix,
    deleteFn: deleteDolumBrix,
    filterParams: ['tarih', 'vardiya'],
    fields: [
      { key: 'dolumBrixDegeri', label: 'Dolum Brix Değeri', type: 'number', max: 100 },
      { key: 'kKontrolBrix', label: 'K.Kontrol Brix', type: 'number', max: 100 },
      { key: 'renk', label: 'Renk', type: 'text', maxLength: 50 },
      { key: 'vardiya', label: 'Vardiya', type: 'vardiya', required: true },
      { key: 'saat', label: 'Saat', type: 'time' },
      { key: 'tarih', label: 'Tarih', type: 'date' },
    ],
  },
  {
    key: 'dolumBull',
    title: 'Dolum-Bull Eşleştirme',
    description: 'Dolum ve bull kayıtlarını eşleştirme',
    icon: 'link',
    color: '#14B8A6',
    bgColor: '#F0FDFA',
    listFn: getDolumBullList,
    createFn: createDolumBull,
    deleteFn: deleteDolumBull,
    filterParams: [],
    fields: [
      { key: 'dolumId', label: 'Dolum ID', type: 'integer', required: true },
      { key: 'bullId', label: 'Bull ID', type: 'integer', required: true },
    ],
  },
  {
    key: 'mamulKpc',
    title: 'Son Ürün Kontrol',
    description: 'Son ürün kalite kontrol analiz sonuçları',
    icon: 'clipboard',
    color: '#EC4899',
    bgColor: '#FDF2F8',
    listFn: getMamulKpcList,
    createFn: createMamulKpc,
    updateFn: updateMamulKpc,
    deleteFn: deleteMamulKpc,
    filterParams: ['tarih', 'vardiya', 'uretimCinsi'],
    sections: [
      { title: 'Temel Bilgiler', fieldKeys: ['pno', 'vardiya', 'uretimCinsi', 'tarih', 'saat', 'agirlik', 'sicaklik'] },
      { title: 'Kalite Parametreleri', fieldKeys: ['tat', 'koku', 'gorunus', 'siyahBenekK', 'siyahBenekO', 'siyahBenekB', 'brix', 'ph', 'asit', 'bostwick', 'tuz'] },
      { title: 'Renk & Diğer', fieldKeys: ['renkL', 'renkA', 'renkB', 'colorAb'] },
      { title: 'Sonuç', fieldKeys: ['uygunlukDurum'] },
    ],
    fields: [
      { key: 'pno', label: 'P.No', type: 'text', maxLength: 50 },
      { key: 'vardiya', label: 'Vardiya', type: 'vardiya', required: true },
      { key: 'uretimCinsi', label: 'Üretim Cinsi', type: 'text', maxLength: 100 },
      { key: 'tarih', label: 'Tarih', type: 'date' },
      { key: 'saat', label: 'Saat', type: 'time' },
      { key: 'agirlik', label: 'Ağırlık', type: 'number', max: 999999.99 },
      { key: 'sicaklik', label: 'Sıcaklık', type: 'number', max: 200 },
      { key: 'tat', label: 'Tat', type: 'text', maxLength: 100 },
      { key: 'koku', label: 'Koku', type: 'text', maxLength: 100 },
      { key: 'gorunus', label: 'Görünüş', type: 'text', maxLength: 100 },
      { key: 'siyahBenekK', label: 'Siyah Benek K', type: 'text', maxLength: 50 },
      { key: 'siyahBenekO', label: 'Siyah Benek O', type: 'text', maxLength: 50 },
      { key: 'siyahBenekB', label: 'Siyah Benek B', type: 'text', maxLength: 50 },
      { key: 'brix', label: 'Brix', type: 'number', max: 100 },
      { key: 'ph', label: 'pH', type: 'number', max: 14 },
      { key: 'asit', label: 'Asit', type: 'number', max: 100 },
      { key: 'bostwick', label: 'Bostwick', type: 'number', max: 10000 },
      { key: 'tuz', label: 'Tuz', type: 'number', max: 100 },
      { key: 'renkL', label: 'Renk L', type: 'number', max: 100 },
      { key: 'renkA', label: 'Renk A', type: 'number', min: -128, max: 127 },
      { key: 'renkB', label: 'Renk B', type: 'number', min: -128, max: 127 },
      { key: 'colorAb', label: 'Color AB', type: 'number', max: 10000 },
      { key: 'uygunlukDurum', label: 'Uygunluk Durumu', type: 'uygunluk', maxLength: 50 },
    ],
  },
  {
    key: 'uretimKontrol',
    title: 'Üretim Kontrol Numune',
    description: 'Üretim hattı numune kontrol analiz sonuçları',
    icon: 'beaker',
    color: '#059669',
    bgColor: '#ECFDF5',
    listFn: getUretimKontrolList,
    createFn: createUretimKontrol,
    updateFn: updateUretimKontrol,
    deleteFn: deleteUretimKontrol,
    filterParams: ['tarih', 'vardiya', 'uretimCinsi'],
    sections: [
      { title: 'Temel Bilgiler', fieldKeys: ['vardiya', 'uretimCinsi', 'tarih', 'saat', 'sicaklik', 'siraSicaklik', 'siraBrix'] },
      { title: 'Kalite Parametreleri', fieldKeys: ['ph', 'gorunum', 'siyahBenekK', 'siyahBenekO', 'siyahBenekB', 'brixMinEvap', 'brixMinLab', 'bost', 'tuz'] },
      { title: 'Renk & Diğer', fieldKeys: ['renkL', 'renkA', 'renkB', 'renkAb', 'clorPpm'] },
      { title: 'Sonuç', fieldKeys: ['analiziYapan', 'uygunlukDurumu'] },
    ],
    fields: [
      { key: 'vardiya', label: 'Vardiya', type: 'vardiya', required: true },
      { key: 'uretimCinsi', label: 'Üretim Cinsi', type: 'text', maxLength: 100, placeholder: 'örn: 111 TNK Tuzu' },
      { key: 'tarih', label: 'Tarih', type: 'date' },
      { key: 'saat', label: 'Saat', type: 'time' },
      { key: 'sicaklik', label: 'Sıcaklık (°C)', type: 'number', max: 500 },
      { key: 'siraSicaklik', label: 'Sıra Sıcaklık', type: 'number', max: 500 },
      { key: 'siraBrix', label: 'Sıra Brix', type: 'number', max: 200 },
      { key: 'ph', label: 'pH (3.9-4.6)', type: 'number', max: 14 },
      { key: 'gorunum', label: 'Görünüm', type: 'text', maxLength: 100 },
      { key: 'siyahBenekK', label: 'Siyah Benek K', type: 'text', maxLength: 50 },
      { key: 'siyahBenekO', label: 'Siyah Benek O', type: 'text', maxLength: 50 },
      { key: 'siyahBenekB', label: 'Siyah Benek B', type: 'text', maxLength: 50 },
      { key: 'brixMinEvap', label: 'Brix Min (Evap)', type: 'number', max: 200 },
      { key: 'brixMinLab', label: 'Brix Min (Lab)', type: 'number', max: 200 },
      { key: 'bost', label: 'Bostwick', type: 'number', max: 10000 },
      { key: 'tuz', label: 'Tuz', type: 'number', max: 100 },
      { key: 'renkL', label: 'Renk L', type: 'number', max: 100 },
      { key: 'renkA', label: 'Renk A', type: 'number', min: -128, max: 127 },
      { key: 'renkB', label: 'Renk B', type: 'number', min: -128, max: 127 },
      { key: 'renkAb', label: 'Renk AB', type: 'number', max: 10000 },
      { key: 'clorPpm', label: 'Klor PPM', type: 'number', max: 100000 },
      { key: 'analiziYapan', label: 'Analizi Yapan', type: 'text', maxLength: 100, placeholder: 'Ad Soyad' },
      { key: 'uygunlukDurumu', label: 'Uygunluk Durumu', type: 'uygunluk', maxLength: 50 },
    ],
  },
  {
    key: 'vardiyaRapor',
    title: 'Vardiya Raporu',
    description: 'Vardiya bazlı üretim raporu — hat seçerek doldur',
    icon: 'report',
    color: '#6366F1',
    bgColor: '#EEF2FF',
    listFn: getVardiyaRaporList,
    createFn: createVardiyaRapor,
    updateFn: updateVardiyaRapor,
    deleteFn: deleteVardiyaRapor,
    filterParams: ['tarih', 'calismaHat'],
    fields: [
      { key: 'vardiya', label: 'Vardiya', type: 'vardiya' },
      { key: 'calismaHat', label: 'Çalışma Hat', type: 'text', maxLength: 50 },
      { key: 'tarih', label: 'Tarih', type: 'date' },
      { key: 'calismaSaatiBas', label: 'Çalışma Başlangıç', type: 'time' },
      { key: 'calismaSaatiBit', label: 'Çalışma Bitiş', type: 'time' },
      { key: 'calisillanPartiNo', label: 'Çalışılan Parti No', type: 'text', maxLength: 50 },
      { key: 'girenHammaddeMiktari', label: 'Giren Hammadde Miktarı', type: 'number', max: 999999.99 },
      { key: 'kamyonSayisi', label: 'Kamyon Sayısı', type: 'integer', max: 10000 },
      { key: 'toplamUretimMiktari', label: 'Toplam Üretim Miktarı', type: 'number', max: 999999.99 },
      { key: 'arizaBildirimi', label: 'Arıza Bildirimi', type: 'text', maxLength: 100 },
      { key: 'sonBrix', label: 'Son Brix', type: 'number', max: 100 },
      { key: 'sonBost', label: 'Son Bostwick', type: 'number', max: 1000 },
      { key: 'sonRenk', label: 'Son Renk', type: 'number', max: 100 },
      { key: 'uretimBrix', label: 'Üretim Brix', type: 'number', max: 100 },
      { key: 'uretimBost', label: 'Üretim Bostwick', type: 'number', max: 1000 },
      { key: 'uretimRenk', label: 'Üretim Renk', type: 'number', max: 100 },
      { key: 'notlar', label: 'Notlar', type: 'text', maxLength: 4000 },
    ],
  },
  {
    key: 'vardiyaHatDurum',
    title: 'Vardiya Hat Durum',
    description: 'Vardiya bazlı hat durum bilgileri',
    icon: 'gauge',
    color: '#0891B2',
    bgColor: '#ECFEFF',
    listFn: getVardiyaHatDurumList,
    createFn: createVardiyaHatDurum,
    updateFn: updateVardiyaHatDurum,
    deleteFn: deleteVardiyaHatDurum,
    filterParams: ['raporId'],
    fields: [
      { key: 'raporId', label: 'Rapor ID', type: 'integer', required: true },
      { key: 'hatAdi', label: 'Hat Adı', type: 'text', maxLength: 100 },
      { key: 'hatDurumu', label: 'Hat Durumu', type: 'text', maxLength: 100 },
    ],
  },
  {
    key: 'vardiyaPaketleme',
    title: 'Vardiya Paketleme',
    description: 'Vardiya bazlı paketleme ve ürün miktarları',
    icon: 'package',
    color: '#D97706',
    bgColor: '#FFFBEB',
    listFn: getVardiyaPaketlemeList,
    createFn: createVardiyaPaketleme,
    updateFn: updateVardiyaPaketleme,
    deleteFn: deleteVardiyaPaketleme,
    filterParams: ['raporId'],
    fields: [
      { key: 'raporId', label: 'Rapor ID', type: 'integer', required: true },
      { key: 'calisillanUrunAdi', label: 'Çalışılan Ürün Adı', type: 'text', maxLength: 100 },
      { key: 'urunTipi', label: 'Ürün Tipi', type: 'text', maxLength: 20 },
      { key: 'miktarAdet', label: 'Miktar (Adet)', type: 'integer', max: 1000000 },
      { key: 'gramaj', label: 'Gramaj', type: 'number', max: 99999.9999 },
      { key: 'toplamKg', label: 'Toplam (Kg)', type: 'number', max: 999999.99 },
    ],
  },
  {
    key: 'vardiyaHammadde',
    title: 'Vardiya Hammadde Detay',
    description: 'Vardiya bazlı hammadde detayları ve fire bilgileri',
    icon: 'leaf',
    color: '#16A34A',
    bgColor: '#F0FDF4',
    listFn: getVardiyaHammaddeList,
    createFn: createVardiyaHammadde,
    updateFn: updateVardiyaHammadde,
    deleteFn: deleteVardiyaHammadde,
    filterParams: ['raporId'],
    fields: [
      { key: 'raporId', label: 'Rapor ID', type: 'integer', required: true },
      { key: 'adi', label: 'Adı', type: 'text', maxLength: 100 },
      { key: 'partiSiparisNo', label: 'Parti/Sipariş No', type: 'text', maxLength: 50 },
      { key: 'miktar', label: 'Miktar', type: 'integer', max: 1000000 },
      { key: 'fireAdedi', label: 'Fire Adedi', type: 'integer', max: 1000000 },
      { key: 'fireAciklama', label: 'Fire Açıklama', type: 'text', maxLength: 4000 },
    ],
  },
];
