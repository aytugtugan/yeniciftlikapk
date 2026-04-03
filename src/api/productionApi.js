const BASE = 'http://10.35.20.17:8080/api/productionreport';

export async function getReport(dateStr) {
  const res = await fetch(`${BASE}/${dateStr}`);
  if (!res.ok) throw new Error(`Rapor alınamadı: ${res.status}`);
  return res.json();
}

export async function saveReport(data) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    let msg = 'Kayıt sırasında hata oluştu';
    try {
      const err = await res.json();
      msg = err?.title || err?.message || msg;
    } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

export async function getReportRange(from, to) {
  const params = new URLSearchParams({ from, to });
  const res = await fetch(`${BASE}?${params}`);
  if (!res.ok) throw new Error(`Raporlar alınamadı: ${res.status}`);
  return res.json();
}

export async function deleteReport(dateStr) {
  const res = await fetch(`${BASE}/${dateStr}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Silme işlemi başarısız: ${res.status}`);
}
