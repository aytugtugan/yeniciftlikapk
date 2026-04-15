/**
 * ÖNCÜ KALİTE API servisi
 * Base URL: http://10.35.20.17:4000/api
 * Bu API'den üretim emri detayları, BOM, müşteri bilgileri ve stok verileri çekilir.
 */

const ONCU_BASE_URL = 'http://10.35.20.17:4000/api';

import { onTokenExpired } from '../utils/authEvents';

async function oncuRequest(endpoint, token) {
  const url = `${ONCU_BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { method: 'GET', headers });
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

// Fabrikalar
export async function getOncuFabrikalar(token) {
  return oncuRequest('/v1/Fabrikalar', token);
}

// İstasyonlar
export async function getOncuIstasyonlar(token, factoryCode) {
  const data = await oncuRequest(`/v1/Fabrikalar/${factoryCode}/istasyonlar`, token);
  if (!Array.isArray(data)) return [];
  return data.map(s => {
    const name = (s.stationName || s.StationName || s.Name || s.name || s.istasyonAdi || s.IstasyonAdi || s.Code || s.code || '').trim();
    const code = (s.code || s.Code || s.stationCode || s.StationCode || s.kod || s.Kod || '').trim();
    return {
      code,
      name,
      ...s,
    };
  });
}

// Tüm üretim emirleri
export async function getOncuEmirler(token) {
  const data = await oncuRequest('/v1/Uretim/emirler', token);
  return Array.isArray(data) ? data.map(normalizeOrder) : [];
}

// İstasyona göre üretim emirleri
export async function getOncuEmirlerByStation(token, stationName) {
  const data = await oncuRequest(`/v1/Uretim/emirler?StationName=${encodeURIComponent(stationName)}`, token);
  return Array.isArray(data) ? data.map(normalizeOrder) : [];
}

// Üretim emri header
export async function getOncuEmirHeader(token, ficheno) {
  return oncuRequest(`/v1/Uretim/emir/${ficheno}/header`, token);
}

// Üretim emri müşteri bilgisi
export async function getOncuEmirCustomer(token, ficheno) {
  return oncuRequest(`/v1/Uretim/emir/${ficheno}/customer`, token);
}

// Üretim emri BOM (hammadde listesi)
export async function getOncuEmirBom(token, ficheno) {
  const data = await oncuRequest(`/v1/Uretim/emir/${ficheno}/bom`, token);
  return Array.isArray(data) ? data : [];
}

// Stok envanter
export async function getOncuStokEnvanter(token, params = {}) {
  const qp = new URLSearchParams();
  if (params.urunKodu) qp.append('UrunKodu', params.urunKodu);
  if (params.pageSize) qp.append('PageSize', params.pageSize.toString());
  if (params.page) qp.append('Page', params.page.toString());
  if (params.fabrikaId != null) qp.append('FabrikaId', params.fabrikaId.toString());
  if (params.q) qp.append('Q', params.q);
  const qs = qp.toString();
  return oncuRequest(`/v1/Stoklar/envanter${qs ? '?' + qs : ''}`, token);
}

// Auth token al
export async function getOncuToken(username, password) {
  const url = `${ONCU_BASE_URL}/v1/Auth/token`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    throw new Error(`Auth hatası: ${res.status}`);
  }
  return res.json();
}

// ─── Kalite Proses Kontrol ────────────────────────────────
export async function getKaliteProsesKontrol(token, ficheno) {
  return oncuRequest(`/v1/Uretim/KaliteProsesKontrol/${ficheno}`, token);
}

// ─── Fiş Master (Kalite Form Kayıtları) ──────────────────
export async function getFisMaster(token, params = {}) {
  const qp = new URLSearchParams();
  if (params.fisNo) qp.append('fisNo', params.fisNo);
  if (params.kod) qp.append('kod', params.kod);
  if (params.urunAdi) qp.append('urunAdi', params.urunAdi);
  if (params.istasyonAdi) qp.append('istasyonAdi', params.istasyonAdi);
  if (params.fabrikaKodu) qp.append('fabrikaKodu', params.fabrikaKodu.toString());
  if (params.page) qp.append('page', params.page.toString());
  if (params.pageSize) qp.append('pageSize', params.pageSize.toString());
  const qs = qp.toString();
  return oncuRequest(`/v1/UretimKayitlar/fis-master${qs ? '?' + qs : ''}`, token);
}

// ─── Fiş Detay ───────────────────────────────────────────
export async function getFisDetay(token, fisNo) {
  return oncuRequest(`/v1/UretimKayitlar/fis-detay/${fisNo}`, token);
}

// ─── Fiş Hammaddeler ─────────────────────────────────────
export async function getFisHammaddeler(token, fisNo) {
  return oncuRequest(`/v1/UretimKayitlar/fis-hammaddeler/${fisNo}`, token);
}

// ─── Lot Kayıtlar ────────────────────────────────────────
export async function getLotKayitlar(token, params = {}) {
  const qp = new URLSearchParams();
  if (params.fisNo) qp.append('fisNo', params.fisNo);
  if (params.kaydedenKisiId) qp.append('kaydedenKisiId', params.kaydedenKisiId.toString());
  if (params.startDate) qp.append('startDate', params.startDate);
  if (params.endDate) qp.append('endDate', params.endDate);
  if (params.page) qp.append('page', params.page.toString());
  if (params.pageSize) qp.append('pageSize', params.pageSize.toString());
  const qs = qp.toString();
  return oncuRequest(`/v1/UretimKayitlar/lot-kayitlar${qs ? '?' + qs : ''}`, token);
}

// ─── Üretim Kayıt Oluştur (Kalite Kontrol POST) ─────────
export async function createUretimKayit(token, payload) {
  const url = `${ONCU_BASE_URL}/v1/UretimKayitlar`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (res.status === 401) {
    onTokenExpired();
    return { success: false, message: 'Oturum süresi doldu. Lütfen tekrar giriş yapın.' };
  }
  const text = await res.text();
  if (res.ok || res.status === 200 || res.status === 201) {
    return { success: true, message: 'Kayıt başarıyla oluşturuldu' };
  }
  let errorMsg = 'Kayıt oluşturulamadı';
  try {
    const errorObj = JSON.parse(text);
    errorMsg = errorObj.message || errorObj.title || errorObj.detail || text || errorMsg;
  } catch { errorMsg = text || errorMsg; }
  return { success: false, message: `Hata ${res.status}: ${errorMsg}` };
}

// ─── Inject API ──────────────────────────────────────────
export async function getInject(id, token) {
  const data = await oncuRequest(`/v1/Inject/${id.trim()}`, token);
  const full = data?.injectFull || data?.inject || data?.code || (typeof data === 'string' ? data : JSON.stringify(data));
  return { inject: full, injectFull: data?.injectFull };
}

// ─── Inject Factory ──────────────────────────────────────
export async function getInjectByFactory(token, factoryId) {
  return oncuRequest(`/v1/Inject/factory/${factoryId}`, token);
}

// ─── Inject Factory Line ─────────────────────────────────
export async function getInjectByFactoryLine(token, factoryId, line) {
  return oncuRequest(`/v1/Inject/factory/${factoryId}/line/${encodeURIComponent(line)}`, token);
}

// ─── Users API ───────────────────────────────────────────
export async function getUsers(token) {
  return oncuRequest('/v1/Users', token);
}

// ─── Kalite Detay Data (combined proses + hammadde parsing) ─
export async function getKaliteDetayData(token, ficheno, stationName) {
  const proses = await getKaliteProsesKontrol(token, ficheno);
  if (!proses) return null;

  // PascalCase fallback
  const pa = proses;
  if (!pa.etiketBarkod && pa.EtiketBarkod) pa.etiketBarkod = pa.EtiketBarkod;
  if (!pa.koliBarkod && pa.KoliBarkod) pa.koliBarkod = pa.KoliBarkod;
  if (!pa.ficheno && pa.Ficheno) pa.ficheno = pa.Ficheno;
  if (!pa.mamulAdi && pa.MamulAdi) pa.mamulAdi = pa.MamulAdi;
  if (!pa.uretimTarihi && pa.UretimTarihi) pa.uretimTarihi = pa.UretimTarihi;
  if (!pa.tett && pa.Tett) pa.tett = pa.Tett;
  if (!pa.pno && pa.Pno) pa.pno = pa.Pno;
  if (!pa.injectlemeKodu && pa.InjectlemeKodu) pa.injectlemeKodu = pa.InjectlemeKodu;
  if (!pa.hammaddeler && pa.Hammaddeler) pa.hammaddeler = pa.Hammaddeler;

  // Barkod fallback from fis-master
  if (!proses.etiketBarkod || !proses.koliBarkod) {
    try {
      const fisMasterResp = await getFisMaster(token, { fisNo: ficheno });
      const rows = fisMasterResp?.items || [];
      if (rows.length > 0) {
        if (!proses.etiketBarkod && rows[0].etiketBarkod) proses.etiketBarkod = rows[0].etiketBarkod;
        if (!proses.koliBarkod && rows[0].koliBarkod) proses.koliBarkod = rows[0].koliBarkod;
      }
    } catch (e) { /* ignore */ }
  }

  // Ürün kodu from emirler
  let urunKodu;
  if (stationName) {
    try {
      const emirler = await getOncuEmirlerByStation(token, stationName);
      const matching = emirler.find(e => e.ficheno === ficheno);
      urunKodu = matching?.code || (emirler.length > 0 ? emirler[0].code : undefined);
    } catch (e) { /* ignore */ }
  }

  const hammaddelerRaw = proses.hammaddeler || [];
  const norm = (txt) => txt.toUpperCase()
    .replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C');

  const etiketAdi = hammaddelerRaw.find(n => ['ETIKET', 'LABEL'].some(kw => norm(n).includes(kw)));
  const kapakAdi = hammaddelerRaw.find(n => ['KAPAK', 'CAP', 'COVER'].some(kw => norm(n).includes(kw)));
  const koliAdi = hammaddelerRaw.find(n => ['KOLI', 'CARTON', 'BOX'].some(kw => norm(n).includes(kw)));
  const ambalajAdi = hammaddelerRaw.find(n => ['KAVANOZ', 'SIS', 'AMBALAJ', 'KUTU', 'JAR', 'BOTTLE'].some(kw => norm(n).includes(kw)));

  let formattedDate;
  try {
    if (proses.uretimTarihi) {
      const d = new Date(proses.uretimTarihi);
      formattedDate = d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  } catch {}

  let formattedTett;
  try {
    if (proses.tett) {
      const d = new Date(proses.tett);
      if (!isNaN(d.getTime())) {
        formattedTett = d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } else {
        const parts = proses.tett.split(/[.\-\/]/);
        formattedTett = parts.length === 3
          ? `${parts[0].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${parts[2]}`
          : proses.tett;
      }
    }
  } catch { formattedTett = proses.tett; }

  return {
    detay: {
      ficheno: proses.ficheno,
      pno: proses.pno,
      tett: proses.tett,
      injectlemeKodu: proses.injectlemeKodu,
      urunAdi: proses.mamulAdi,
      kod: urunKodu,
    },
    uretimTarihiFormatted: formattedDate,
    pno: proses.pno,
    urunAdi: proses.mamulAdi,
    kod: urunKodu,
    tett: formattedTett,
    koliBarkod: proses.koliBarkod,
    injectlemeKodu: proses.injectlemeKodu,
    etiketBarkod: proses.etiketBarkod,
    etiketAdi,
    kapak: kapakAdi,
    ambalaj: ambalajAdi,
    koliAdi,
    prosesKaynakli: true,
  };
}

// Normalize production order (PascalCase/camelCase handling)
function normalizeOrder(raw) {
  const ficheno = raw.EmirNo || raw.emirNo || raw.Ficheno || raw.ficheno || raw.FicheNo || '';
  return {
    ficheno,
    uretimEmriNo: raw.UretimEmriNo || raw.uretimEmriNo || ficheno,
    mamulAdi: raw.MamulAdi || raw.mamulAdi || raw.UrunAdi || raw.urunAdi || '',
    planMiktar: raw.PlanMiktar ?? raw.planMiktar ?? 0,
    uretimMiktar: raw.UretimMiktar ?? raw.uretimMiktar ?? 0,
    kalanMiktar: raw.KalanMiktar ?? raw.kalanMiktar ?? 0,
    code: raw.Code || raw.code || raw.UrunKodu || raw.urunKodu || '',
  };
}

// ─── Satış API (5050) ────────────────────────────────────

const SATIS_BASE_URL = 'http://10.35.20.17:5050/api';
let _satisToken = null;

async function ensureSatisToken() {
  if (_satisToken) return _satisToken;
  const res = await fetch(`${SATIS_BASE_URL}/Auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName: 'a', password: '2026' }),
  });
  if (!res.ok) throw new Error('Satış API auth hatası');
  const data = await res.json();
  _satisToken = data.token;
  return _satisToken;
}

async function satisRequest(endpoint) {
  const token = await ensureSatisToken();
  const url = `${SATIS_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  let res = await fetch(url, { method: 'GET', headers });
  if (res.status === 401) {
    _satisToken = null;
    const newToken = await ensureSatisToken();
    res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${newToken}` },
    });
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Satış API Hatası ${res.status}: ${text || res.statusText}`);
  }
  const text = await res.text();
  if (!text || text.trim() === '') return null;
  return JSON.parse(text);
}

// Siparişler
// Logo ERP status: 1=Açık(DevamEdiyor), 2=Beklemede, 3=Kapatıldı, 4=Tamamlandı(Sevk)
export async function getSiparisler(_token, params = {}) {
  const qp = new URLSearchParams();
  let statusVal = '1,4';
  if (params.status === '1') statusVal = '1';
  else if (params.status === '4') statusVal = '4';
  qp.append('status', statusVal);
  qp.append('fabrikaNo', '2'); // YCIFTLIK
  if (params.cariKodu) qp.append('cariKodu', params.cariKodu);
  if (params.siparisNo) qp.append('fisNo', params.siparisNo);
  if (params.startDate) qp.append('startDate', params.startDate);
  if (params.endDate) qp.append('endDate', params.endDate);
  if (params.page) qp.append('page', params.page.toString());
  if (params.pageSize) qp.append('pageSize', params.pageSize.toString());
  const data = await satisRequest(`/Satislar/siparisler?${qp.toString()}`);
  return {
    items: (data?.items || []).map(item => ({
      siparisNo: item.ficheno,
      cariKodu: item.cariKodu,
      cariAdi: item.cariAdi || item.musteriAdi || '',
      cariOzelKod: item.cariOzelKod,
      odemePlani: item.odemePlaniKodu,
      siparisTarihi: item.tarih,
      toplamSiparisMiktari: item.toplamNet,
      status: item.status,
      devamEdiyor: item.status === 1,
    })),
    totalRows: data?.total || 0,
  };
}

// Sipariş Detay
export async function getSiparisDetay(_token, params = {}) {
  const ficheno = params.siparisNo || '';
  const data = await satisRequest(`/Satislar/siparisler-detay?ficheno=${encodeURIComponent(ficheno)}`);
  return {
    header: data?.header || {},
    items: (data?.satirlar || []).map(item => ({
      stokKodu: item.urunKodu,
      stokAdi: item.urunAdi,
      siparisMiktari: item.miktar,
      birimFiyat: item.birimFiyat,
      satirTutar: item.satirTutar,
      birim: item.unitCode,
      netKg: item.satirNetKg,
      brutKg: item.satirBrutKg,
    })),
  };
}

// Sipariş Sevkiyatları (Tedarik API)
export async function getSiparisSevkiyatlar(_token, params = {}) {
  const ficheno = params.siparisNo || '';
  const data = await satisRequest(`/Tedarik/siparis-cikislar?ficheno=${encodeURIComponent(ficheno)}`);
  return {
    items: Array.isArray(data) ? data : (data?.items || []),
  };
}

// Cari Detay (tek cari kodu için) — /cariler endpointi /api prefix'i olmadan çalışır
export async function getCariDetay(_token, cariKodu) {
  const token = await ensureSatisToken();
  const url = `http://10.35.20.17:5050/cariler/cari-detaylar?cariKodu=${encodeURIComponent(cariKodu)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const text = await res.text();
  if (!text || text.trim() === '') return null;
  const data = JSON.parse(text);
  if (Array.isArray(data) && data.length > 0) return data[0];
  return data || null;
}

// Cari Özetler (Müşteri Profilleri)
export async function getCariOzetler(token, params = {}) {
  const qp = new URLSearchParams();
  if (params.musteriKodu) qp.append('musteriKodu', params.musteriKodu);
  if (params.musteriAdi) qp.append('musteriAdi', params.musteriAdi);
  if (params.page) qp.append('page', params.page.toString());
  if (params.pageSize) qp.append('pageSize', params.pageSize.toString());
  const qs = qp.toString();
  return oncuRequest(`/v1/Satislar/cari-ozetler${qs ? '?' + qs : ''}`, token);
}

// ─── Sevkiyat API ────────────────────────────────────────

// Sevkiyat Listesi (4000 API - /v1/satislar/sevkiyatlar)
export async function getSevkiyatlar(token, params = {}) {
  const qp = new URLSearchParams();
  if (params.startDate) qp.append('Start', params.startDate);
  if (params.endDate) qp.append('End', params.endDate);
  if (params.musteriKodu) qp.append('MusteriKodu', params.musteriKodu);
  if (params.musteriAdi) qp.append('MusteriAdi', params.musteriAdi);
  if (params.siparisNo) qp.append('SiparisNo', params.siparisNo);
  if (params.irsaliyeNo) qp.append('IrsaliyeNo', params.irsaliyeNo);
  if (params.page) qp.append('Page', params.page.toString());
  if (params.pageSize) qp.append('PageSize', params.pageSize.toString());
  qp.append('SortBy', 'sevktarihi');
  qp.append('SortDir', 'desc');
  const qs = qp.toString();
  const data = await oncuRequest(`/v1/satislar/sevkiyatlar${qs ? '?' + qs : ''}`, token);
  return {
    items: (data?.items || []).map(item => ({
      siparisNo: item.siparisNo,
      irsaliyeNo: item.irsaliyeNo,
      sevkTarihi: item.sevkTarihi,
      tarih: item.sevkTarihi,
      musteriAdi: item.musteriAdi,
      toplamMiktar: item.toplamSevkMiktari,
      toplamSevkMiktari: item.toplamSevkMiktari,
    })),
    totalRows: data?.totalRows ?? data?.total ?? 0,
  };
}

// Sevkiyat Detay - header bilgileri (5050 API - /Tedarik/cikislar-detay)
export async function getSevkiyatDetay(_token, irsaliyeNo, satisTipi = 'IC') {
  const qp = new URLSearchParams();
  qp.append('irsaliyeno', irsaliyeNo);
  qp.append('satisTipi', satisTipi);
  const data = await satisRequest(`/Tedarik/cikislar-detay?${qp.toString()}`);
  return Array.isArray(data) ? data : (data ? [data] : []);
}

// Sevkiyat Kalemleri - sipariş bazlı çıkış kalemleri (5050 API - /Tedarik/siparis-cikislar)
export async function getSevkiyatKalemler(_token, siparisNo) {
  if (!siparisNo) return [];
  const data = await satisRequest(`/Tedarik/siparis-cikislar?ficheno=${encodeURIComponent(siparisNo)}`);
  return Array.isArray(data) ? data : [];
}
