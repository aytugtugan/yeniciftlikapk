/**
 * Vardiya (Shift) Definitions & Helpers
 *
 * Day calculation order: C → A → B
 *   C : 00:00 – 08:00  (hesap: 00:30 – 08:29)
 *   A : 08:00 – 16:00  (hesap: 08:30 – 16:29)
 *   B : 16:00 – 00:00  (hesap: 16:30 – 00:29)
 */

export const VARDIYA_DEFS = {
  A: { label: 'A', baslangic: '08:00', bitis: '16:00', color: '#2563EB', bgColor: '#DBEAFE' },
  B: { label: 'B', baslangic: '16:00', bitis: '00:00', color: '#D97706', bgColor: '#FEF3C7' },
  C: { label: 'C', baslangic: '00:00', bitis: '08:00', color: '#7C3AED', bgColor: '#EDE9FE' },
};

/**
 * +30 dk hesaplama kuralı (kayıt/hesaplama için)
 *   A : 08:30 – 16:29
 *   B : 16:30 – 00:29
 *   C : 00:30 – 08:29
 */
export const VARDIYA_HESAP = {
  A: { baslangic: '08:30', bitis: '16:29' },
  B: { baslangic: '16:30', bitis: '00:29' },
  C: { baslangic: '00:30', bitis: '08:29' },
};

/** Ordered as a production day: C → A → B */
export const VARDIYA_ORDER = ['C', 'A', 'B'];

export const VARDIYA_OPTIONS = VARDIYA_ORDER.map(v => ({
  key: v,
  ...VARDIYA_DEFS[v],
  displayLabel: `${v}  (${VARDIYA_DEFS[v].baslangic} – ${VARDIYA_DEFS[v].bitis})`,
}));

/**
 * Returns { baslangic, bitis } for a given vardiya key.
 */
export function getVardiyaTimes(vardiyaKey) {
  const def = VARDIYA_DEFS[vardiyaKey];
  if (!def) return null;
  return { baslangic: def.baslangic, bitis: def.bitis };
}

/**
 * Returns the saat (start time) string in HH:mm:ss format for a vardiya.
 */
export function getVardiyaSaat(vardiyaKey) {
  const def = VARDIYA_DEFS[vardiyaKey];
  if (!def) return null;
  return def.baslangic + ':00';
}

/**
 * Determine the current vardiya based on current time.
 * Uses +30 dk rule:
 *   C: 00:30 – 08:29
 *   A: 08:30 – 16:29
 *   B: 16:30 – 00:29
 */
export function getCurrentVardiya() {
  const now = new Date();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  if (totalMinutes < 30) return 'B';           // 00:00–00:29 → B (önceki)
  if (totalMinutes < 8 * 60 + 30) return 'C';  // 00:30–08:29 → C
  if (totalMinutes < 16 * 60 + 30) return 'A'; // 08:30–16:29 → A
  return 'B';                                   // 16:30–23:59 → B
}

/**
 * Returns { baslangic, bitis } for calculation purposes (+30dk rule)
 */
export function getVardiyaHesapTimes(vardiyaKey) {
  const def = VARDIYA_HESAP[vardiyaKey];
  if (!def) return null;
  return { baslangic: def.baslangic, bitis: def.bitis };
}
