/**
 * Fire kayıt modeli ve mapper fonksiyonları
 */

/**
 * Backend'den gelen ham fire kaydını normalize eder
 */
export function mapFireKayit(raw) {
  if (!raw) return null;
  return {
    id: raw.id ?? raw.Id ?? 0,
    urunKodu: raw.urunKodu ?? raw.UrunKodu ?? '',
    urunAdi: raw.urunAdi ?? raw.UrunAdi ?? '',
    fireNedeni: raw.fireNedeni ?? raw.FireNedeni ?? '',
    fireAdeti: safeNumber(raw.fireAdeti ?? raw.FireAdeti),
    girenKullanici: raw.girenKullanici ?? raw.GirenKullanici ?? '',
    kayitTarihi: raw.kayitTarihiSaat ?? raw.KayitTarihiSaat ?? raw.kayitTarihi ?? raw.KayitTarihi ?? raw.createdAt ?? null,
    factoryNo: safeNumber(raw.factoryNo ?? raw.FactoryNo),
    logoStatus: raw.logoStatus ?? raw.LogoStatus ?? '',
    logoErrorMessage: raw.logoErrorMessage ?? raw.LogoErrorMessage ?? '',
    logoSlipNumber: raw.logoSlipNumber ?? raw.LogoSlipNumber ?? '',
  };
}

/**
 * Backend listesini normalize eder
 */
export function mapFireKayitList(data) {
  if (!data) return [];
  const arr = Array.isArray(data) ? data : (data.items ?? data.Items ?? []);
  return arr.map(mapFireKayit).filter(Boolean);
}

/**
 * Stok envanter item'ını ürün seçimi için normalize eder
 */
export function mapUrunItem(raw) {
  if (!raw) return null;
  return {
    urunKodu: raw.urunKodu ?? raw.UrunKodu ?? '',
    urunAdi: raw.urunAdi ?? raw.UrunAdi ?? '',
  };
}

/**
 * Güvenli sayı dönüşümü
 */
export function safeNumber(val) {
  if (val == null) return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

/**
 * Tarih formatla (locale)
 */
export function formatFireDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}
