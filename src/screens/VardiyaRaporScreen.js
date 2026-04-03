import React, { useState, useCallback, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Radius, Shadows } from '../theme';
import {
  getVardiyaRaporListV1, createVardiyaRaporV1,
  updateVardiyaRaporV1, deleteVardiyaRaporV1,
  getVardiyaHammaddeListV1,
  getStokHareketVardiyaOzet,
  getStokHareketDomatesAlimFiciBesleme,
  getStokHareketDomatesFiciTuketim,
  getGunlukUretimler, getUretimOzeti,
} from '../api/formsApi';
import { getUretimEmirleri } from '../api/apiService';
import { getKaliteProsesKontrol } from '../api/oncuApi';
import { AppDataContext } from '../context/AppDataContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from '../components/SimpleIcon';
import {
  VARDIYA_DEFS, VARDIYA_HESAP,
  getVardiyaHesapTimes, getCurrentVardiya,
} from '../utils/vardiya';

const INDIGO = '#6366F1';
const today = () => new Date().toISOString().split('T')[0];
const formatTR = (d) => {
  if (!d) return '';
  const s = d.split('T')[0];
  const [y, m, dd] = s.split('-');
  return `${dd}.${m}.${y}`;
};
const numOr = (...vals) => {
  for (const v of vals) {
    if (v != null && v !== '') { const n = Number(v); if (!isNaN(n)) return n; }
  }
  return 0;
};

const isKolileme = (hatName) => {
  if (!hatName) return false;
  const lower = hatName.toLowerCase().replace(/[ıİ]/g, () => 'i');
  return lower.includes('kolileme') || lower.includes('koli̇leme') || lower.includes('kolıleme');
};

const timeToMinutes = (t) => {
  if (!t) return null;
  const parts = String(t).split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

// ── Rapor kartı (liste görünümü) ─────────────────────────────
function RaporCard({ rapor, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.raporCard}>
      <TouchableOpacity activeOpacity={0.7} onPress={() => setExpanded(!expanded)}>
        <View style={styles.raporHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.raporTitle}>
              {rapor.calismaHat || 'Hat ?'} — #{rapor.id}
              {rapor.vardiya ? ` (${rapor.vardiya})` : ''}
            </Text>
            <Text style={styles.raporDate}>
              {formatTR(rapor.tarih)}
              {rapor.vardiya && VARDIYA_DEFS[rapor.vardiya] ? ` ${VARDIYA_DEFS[rapor.vardiya].baslangic} - ${VARDIYA_DEFS[rapor.vardiya].bitis}` : (rapor.calismaSaatiBas ? ` ${rapor.calismaSaatiBas} - ${rapor.calismaSaatiBit}` : '')}
            </Text>
          </View>
          <View style={styles.raporActions}>
            <TouchableOpacity onPress={() => onEdit(rapor)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="edit" size={18} color={INDIGO} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Alert.alert('Sil', 'Bu raporu silmek istediğinize emin misiniz?', [
                { text: 'İptal', style: 'cancel' },
                { text: 'Sil', style: 'destructive', onPress: () => onDelete(rapor) },
              ])}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="close" size={18} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Chip'ler */}
        <View style={styles.statsRow}>
          {rapor.girenHammaddeMiktari != null && (
            <View style={styles.statChip}><Text style={styles.statLabel}>Hammadde</Text><Text style={styles.statVal}>{rapor.girenHammaddeMiktari}</Text></View>
          )}
          {rapor.toplamUretimMiktari != null && (
            <View style={styles.statChip}><Text style={styles.statLabel}>Üretim</Text><Text style={styles.statVal}>{rapor.toplamUretimMiktari}</Text></View>
          )}
          {rapor.sonBrix != null && (
            <View style={styles.statChip}><Text style={styles.statLabel}>Brix</Text><Text style={styles.statVal}>{rapor.sonBrix}</Text></View>
          )}
          {rapor.kamyonSayisi != null && (
            <View style={styles.statChip}><Text style={styles.statLabel}>Kamyon</Text><Text style={styles.statVal}>{rapor.kamyonSayisi}</Text></View>
          )}
        </View>

        {!expanded && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8 }}>
            <Text style={styles.expandHint}>Detayları görmek için dokunun</Text>
            <Icon name="expand-more" size={14} color={Colors.textTertiary} />
          </View>
        )}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandedContent}>
          <Text style={styles.sectionLabel}>Genel</Text>
          <View style={styles.detailGrid}>
            <View style={styles.detailCell}><Text style={styles.detailLabel}>Çalışma Hat</Text><Text style={styles.detailValue}>{rapor.calismaHat || '-'}</Text></View>
            <View style={styles.detailCell}><Text style={styles.detailLabel}>Parti No</Text><Text style={styles.detailValue}>{rapor.calisillanPartiNo || '-'}</Text></View>
          </View>
          {rapor.tett ? (
            <View style={styles.detailGrid}><View style={styles.detailCell}><Text style={styles.detailLabel}>TETT</Text><Text style={styles.detailValue}>{rapor.tett}</Text></View></View>
          ) : null}
          {rapor.injectlemeKodu ? (
            <View style={styles.detailGrid}><View style={styles.detailCell}><Text style={styles.detailLabel}>Inject</Text><Text style={[styles.detailValue, { fontSize: 11 }]}>{rapor.injectlemeKodu}</Text></View></View>
          ) : null}
          <View style={styles.detailGrid}>
            <View style={styles.detailCell}><Text style={styles.detailLabel}>Tarih</Text><Text style={styles.detailValue}>{formatTR(rapor.tarih)}</Text></View>
            <View style={styles.detailCell}><Text style={styles.detailLabel}>Başlangıç</Text><Text style={styles.detailValue}>{rapor.vardiya && VARDIYA_DEFS[rapor.vardiya] ? VARDIYA_DEFS[rapor.vardiya].baslangic : (rapor.calismaSaatiBas || '-')}</Text></View>
            <View style={styles.detailCell}><Text style={styles.detailLabel}>Bitiş</Text><Text style={styles.detailValue}>{rapor.vardiya && VARDIYA_DEFS[rapor.vardiya] ? VARDIYA_DEFS[rapor.vardiya].bitis : (rapor.calismaSaatiBit || '-')}</Text></View>
          </View>
          <View style={styles.detailDivider} />

          <Text style={styles.sectionLabel}>Üretim</Text>
          <View style={styles.detailGrid}>
            <View style={styles.detailCell}><Text style={styles.detailLabel}>Tük. Domates Hammadde</Text><Text style={styles.detailValue}>{rapor.girenHammaddeMiktari ?? '-'}</Text></View>
            <View style={styles.detailCell}><Text style={styles.detailLabel}>Kamyon Sayısı</Text><Text style={styles.detailValue}>{rapor.kamyonSayisi ?? '-'}</Text></View>
          </View>
          <View style={styles.detailGrid}>
            <View style={styles.detailCell}><Text style={styles.detailLabel}>Tük. Aseptik Fıçı</Text><Text style={styles.detailValue}>{rapor.ficiKg ?? rapor.yariMamulFiciKg ?? '-'}</Text></View>
            <View style={styles.detailCell}><Text style={styles.detailLabel}>Toplam Üretim</Text><Text style={[styles.detailValue, { color: '#059669', fontWeight: '800' }]}>{rapor.toplamUretimMiktari ?? '-'}</Text></View>
          </View>
          {rapor.arizaBildirimi ? (
            <View style={styles.detailGrid}><View style={styles.detailCell}><Text style={styles.detailLabel}>Arıza Bildirimi</Text><Text style={styles.detailValue}>{rapor.arizaBildirimi}</Text></View></View>
          ) : null}

          {/* Paketlemeler */}
          {(rapor.paketlemeler || []).length > 0 && (<>
            <View style={styles.detailDivider} />
            <Text style={styles.sectionLabel}>Günlük Üretim</Text>
            {rapor.paketlemeler.map((p, i) => (
              <View key={i} style={{ marginBottom: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.textPrimary }}>{p.calisillanUrunAdi || '-'}</Text>
                <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
                  {p.miktarAdet ? `${p.miktarAdet} adet` : ''}{p.gramaj ? ` × ${p.gramaj}g` : ''}{p.toplamKg ? ` = ${p.toplamKg} kg` : ''}
                </Text>
              </View>
            ))}
          </>)}

          {/* Kalite (kolileme hariç) */}
          {!isKolileme(rapor.calismaHat) && (<>
            <View style={styles.detailDivider} />
            <Text style={styles.sectionLabel}>Kalite Değerleri</Text>
            <View style={styles.qualityTable}>
              <View style={styles.qualityCol}>
                <Text style={styles.qualityHeader}>Son</Text>
                <View style={styles.qualityItem}><Text style={styles.qualityItemLabel}>Brix</Text><Text style={styles.qualityItemVal}>{rapor.sonBrix ?? '-'}</Text></View>
                <View style={styles.qualityItem}><Text style={styles.qualityItemLabel}>Bostwick</Text><Text style={styles.qualityItemVal}>{rapor.sonBost ?? '-'}</Text></View>
                <View style={styles.qualityItem}><Text style={styles.qualityItemLabel}>Renk</Text><Text style={styles.qualityItemVal}>{rapor.sonRenk ?? '-'}</Text></View>
              </View>
              <View style={styles.qualityVDivider} />
              <View style={styles.qualityCol}>
                <Text style={styles.qualityHeader}>Üretim</Text>
                <View style={styles.qualityItem}><Text style={styles.qualityItemLabel}>Brix</Text><Text style={styles.qualityItemVal}>{rapor.uretimBrix ?? '-'}</Text></View>
                <View style={styles.qualityItem}><Text style={styles.qualityItemLabel}>Bostwick</Text><Text style={styles.qualityItemVal}>{rapor.uretimBost ?? '-'}</Text></View>
                <View style={styles.qualityItem}><Text style={styles.qualityItemLabel}>Renk</Text><Text style={styles.qualityItemVal}>{rapor.uretimRenk ?? '-'}</Text></View>
              </View>
            </View>
          </>)}

          {rapor.notlar ? (<><View style={styles.detailDivider} /><Text style={styles.sectionLabel}>Notlar</Text><Text style={styles.notlarText}>{rapor.notlar}</Text></>) : null}

          <TouchableOpacity style={{ marginTop: 12 }} onPress={() => setExpanded(false)} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Text style={styles.expandHint}>Daralt</Text>
              <Icon name="expand-less" size={14} color={Colors.textTertiary} />
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Hat kart ─────────────────────────────────────────────────
function HatCard({ hat, completed, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(hat)}
      style={[hatCardStyles.card, completed && hatCardStyles.cardCompleted]}
    >
      <View style={hatCardStyles.cardHeader}>
        <View style={[hatCardStyles.iconWrap, { backgroundColor: completed ? '#EEF2FF' : '#F3F4F6' }]}>
          <Text style={[hatCardStyles.iconText, { color: completed ? INDIGO : Colors.textSecondary }]}>
            {hat.label?.[0] || 'H'}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={hatCardStyles.cardTitle}>{hat.label}</Text>
          <Text style={hatCardStyles.cardSub}>{hat.istasyonKodu}</Text>
        </View>
        {completed && (
          <View style={hatCardStyles.checkWrap}>
            <Icon name="check-circle" size={22} color={INDIGO} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ═════════════════════════════════════════════════════════════
// ── ANA EKRAN ────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════
export default function VardiyaRaporScreen() {
  const navigation = useNavigation();
  const { oncuToken } = useContext(AppDataContext);

  // Mode: 'list' veya 'newFlow'
  const [mode, setMode] = useState('list');

  // ── Liste ──
  const [raporlar, setRaporlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filterDate, setFilterDate] = useState(today());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingDate, setPendingDate] = useState(new Date());

  // ── Yeni akış ──
  const [hatOptions, setHatOptions] = useState([]);
  const [completedHats, setCompletedHats] = useState(new Set());
  const [activeEmirler, setActiveEmirler] = useState([]);
  const [selectedVardiya] = useState(getCurrentVardiya());
  const [flowDate] = useState(today());

  // ── Form modal ──
  const [modalVisible, setModalVisible] = useState(false);
  const [modalEditId, setModalEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);

  // Form data — flat
  const [form, setForm] = useState({});
  // Paketleme satırları
  const [paketler, setPaketler] = useState([emptyPaket()]);

  function emptyPaket() {
    return { calisillanUrunAdi: '', urunTipi: '', miktarAdet: '', gramaj: '', toplamKg: '' };
  }

  const setF = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const numInput = (key, val) => setF(key, val.replace(/[^0-9.,-]/g, ''));
  const intInput = (key, val) => setF(key, val.replace(/[^0-9]/g, ''));

  // ── Veri yükle (liste) ─────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const list = await getVardiyaRaporListV1({ tarih: filterDate });
      const items = Array.isArray(list) ? list : [];
      items.sort((a, b) => (b.id || 0) - (a.id || 0));
      setRaporlar(items);
    } catch (err) {
      setError(err.message);
    }
  }, [filterDate]);

  useFocusEffect(
    useCallback(() => {
      if (mode === 'list') {
        setLoading(true);
        loadData().finally(() => setLoading(false));
      }
    }, [loadData, mode]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData().finally(() => setRefreshing(false));
  }, [loadData]);

  // ── Yeni akış: hat listesini yükle ─────────────────────────
  const startNewFlow = useCallback(async () => {
    setMode('newFlow');
    setCompletedHats(new Set());
    setLoading(true);
    try {
      const emirler = await getUretimEmirleri({ factoryCode: 2 });
      const arr = Array.isArray(emirler) ? emirler : [];
      setActiveEmirler(arr);
      const hatMap = {};
      arr.forEach(e => {
        if (e.istasyonKodu && !hatMap[e.istasyonKodu]) {
          hatMap[e.istasyonKodu] = {
            label: e.istasyonAdi || e.istasyonKodu,
            value: e.istasyonAdi || e.istasyonKodu,
            istasyonKodu: e.istasyonKodu,
          };
        }
      });
      setHatOptions(Object.values(hatMap));

      // Mevcut raporları kontrol et → tamamlanan hatlar
      try {
        const existing = await getVardiyaRaporListV1({ tarih: flowDate });
        const ex = Array.isArray(existing) ? existing : [];
        const done = new Set();
        ex.forEach(r => {
          if (r.vardiya === selectedVardiya && r.calismaHat) done.add(r.calismaHat);
        });
        setCompletedHats(done);
      } catch (_) {}
    } catch (err) {
      console.warn('startNewFlow error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [flowDate, selectedVardiya]);

  // ── Otomatik doldurma: StokHareket ────────────────────────
  const autoFillFromStokHareket = useCallback(async (hat, tarih, vardiya) => {
    try {
      const params = { tarih, vardiya, calismaHat: hat };
      let ozet = null;
      try { ozet = await getStokHareketVardiyaOzet(params); } catch (_) {}

      if (ozet && typeof ozet === 'object' && !Array.isArray(ozet)) {
        setForm(p => ({
          ...p,
          girenHammaddeMiktari: ozet.tuketilenDomatesHammadde != null ? String(ozet.tuketilenDomatesHammadde) : (ozet.girenHammaddeMiktari != null ? String(ozet.girenHammaddeMiktari) : p.girenHammaddeMiktari),
          kamyonSayisi: ozet.kamyonSayisi != null ? String(ozet.kamyonSayisi) : p.kamyonSayisi,
          tuketilenAseptikFici: (ozet.tuketilenAseptikFici ?? ozet.tuketilenAseptikFiciMiktari ?? ozet.aseptikFiciMiktari) != null
            ? String(ozet.tuketilenAseptikFici ?? ozet.tuketilenAseptikFiciMiktari ?? ozet.aseptikFiciMiktari)
            : p.tuketilenAseptikFici,
          ficiKg: ozet.ficiKg != null ? String(ozet.ficiKg) : p.ficiKg,
        }));
      } else {
        // Fallback: DomatesAlimFiciBesleme + DomatesFiciTuketim
        const [alimRes, tuketimRes] = await Promise.all([
          getStokHareketDomatesAlimFiciBesleme(params).catch(() => null),
          getStokHareketDomatesFiciTuketim(params).catch(() => null),
        ]);
        const alimArr = Array.isArray(alimRes) ? alimRes : [];
        const tuketimArr = Array.isArray(tuketimRes) ? tuketimRes : [];

        let domatesToplam = 0;
        tuketimArr.forEach(r => { domatesToplam += numOr(r.miktar, r.tuketimMiktari, r.toplam); });

        let ficiTuketim = 0;
        tuketimArr.forEach(r => { ficiTuketim += numOr(r.ficiMiktar, r.ficiKg, r.aseptikFici); });

        let ficiBesleme = 0;
        alimArr.forEach(r => { ficiBesleme += numOr(r.ficiMiktar, r.ficiBesleme, r.besleme); });

        const kamyonSayisi = alimArr.length > 0 ? alimArr.length + 1 : 0;

        setForm(p => ({
          ...p,
          girenHammaddeMiktari: domatesToplam ? String(parseFloat(domatesToplam.toFixed(2))) : p.girenHammaddeMiktari,
          kamyonSayisi: kamyonSayisi ? String(kamyonSayisi) : p.kamyonSayisi,
          tuketilenAseptikFici: ficiTuketim ? String(parseFloat(ficiTuketim.toFixed(2))) : p.tuketilenAseptikFici || '',
          ficiKg: ficiBesleme ? String(parseFloat(ficiBesleme.toFixed(2))) : p.ficiKg || '',
        }));
      }
    } catch (err) {
      console.warn('autoFillFromStokHareket error:', err.message);
    }
  }, []);

  // ── Otomatik doldurma: Inject + TETT ──────────────────────
  const autoFillInjectTett = useCallback(async (hat) => {
    if (!oncuToken) return;
    const hatEmirFisNo = activeEmirler
      .filter(e =>
        (e.istasyonAdi || '').toLowerCase().includes(hat.toLowerCase()) ||
        (e.istasyonKodu || '').toLowerCase().includes(hat.toLowerCase()),
      )
      .map(e => e.fisNo)
      .filter(Boolean);
    if (hatEmirFisNo.length === 0) return;
    try {
      const kpcData = await getKaliteProsesKontrol(oncuToken, hatEmirFisNo[0]);
      if (kpcData) {
        setForm(p => ({
          ...p,
          injectlemeKodu: kpcData.injectlemeKodu || kpcData.InjectlemeKodu || p.injectlemeKodu || '',
          tett: kpcData.tett || kpcData.TETT || kpcData.Tett || p.tett || '',
          calisillanPartiNo: kpcData.pno || kpcData.Pno || p.calisillanPartiNo || '',
        }));
      }
    } catch (_) {}
  }, [oncuToken, activeEmirler]);

  // ── Otomatik doldurma: Paketlemeler + Toplam Üretim ────────
  const autoFillPaketlemeler = useCallback(async (hatName, hatKodu, tarih, vardiya) => {
    const hesap = VARDIYA_HESAP[vardiya];
    if (!hesap) return;

    try {
      // 1) Günlük üretim verisinden paketleme satırları
      const startDate = `${tarih}T${hesap.baslangic}:00`;
      const endDate = `${tarih}T${hesap.bitis}:59`;
      let gunlukList = [];
      try {
        const raw = await getGunlukUretimler({
          fabrikaNo: 2,
          startDate: `${tarih}T00:00:00`,
          endDate: `${tarih}T23:59:59`,
          startTime: hesap.baslangic,
          endTime: hesap.bitis,
        });
        const items = Array.isArray(raw) ? raw : (raw?.data ?? raw?.items ?? []);
        gunlukList = items;
      } catch (_) {}

      if (gunlukList.length === 0) {
        try {
          const raw = await getGunlukUretimler({
            fabrikaNo: 2,
            startDate: `${tarih}T00:00:00`,
            endDate: `${tarih}T23:59:59`,
          });
          gunlukList = Array.isArray(raw) ? raw : (raw?.data ?? raw?.items ?? []);
        } catch (_) {}
      }

      // Hat bazında filtrele
      const hatLower = (hatName || '').toLowerCase();
      const hatKoduLower = (hatKodu || '').toLowerCase();
      const byHat = gunlukList.filter(r => {
        const rHat = (r.istasyonAdi || r.calismaHat || r.hatAdi || '').toLowerCase();
        const rKod = (r.istasyonKodu || r.hatKodu || '').toLowerCase();
        return rHat.includes(hatLower) || hatLower.includes(rHat) ||
               (hatKoduLower && (rKod === hatKoduLower || rKod.includes(hatKoduLower)));
      });

      // Saat aralığına filtrele
      const basMin = timeToMinutes(hesap.baslangic);
      const bitMin = timeToMinutes(hesap.bitis);
      const filtered = byHat.filter(r => {
        const saat = r.saatDakika || r.saat || '';
        if (!saat) return true;
        const m = timeToMinutes(saat);
        if (m === null) return true;
        if (basMin <= bitMin) return m >= basMin && m <= bitMin;
        return m >= basMin || m <= bitMin; // gece vardiyası
      });

      // Ürün bazında grupla
      const paketMap = new Map();
      (filtered.length > 0 ? filtered : byHat).forEach(r => {
        const urun = r.urunAdi || r.stokAdi || r.urun || r.productName || 'Ürün';
        const adet = Number(r.adet || r.kutuAdet || r.miktarAdet || 0) || 0;
        const kg = Number(r.miktar || r.miktarKg || r.kg || r.uretilenMiktar || 0) || 0;
        const gramajRaw = r.gramaj || r.agirlik || r.netAgirlik || null;
        const cur = paketMap.get(urun) || { calisillanUrunAdi: urun, urunTipi: '', miktarAdet: 0, toplamKg: 0, gramaj: null };
        cur.miktarAdet += adet;
        cur.toplamKg += kg;
        if (gramajRaw != null) cur.gramaj = Number(gramajRaw);
        paketMap.set(urun, cur);
      });

      const autoPaketler = [...paketMap.values()].map(p => {
        const gramaj = p.gramaj ?? (p.miktarAdet > 0 && p.toplamKg > 0 ? (p.toplamKg * 1000) / p.miktarAdet : null);
        return {
          calisillanUrunAdi: p.calisillanUrunAdi,
          urunTipi: p.urunTipi || '',
          miktarAdet: p.miktarAdet > 0 ? String(Math.round(p.miktarAdet)) : '',
          gramaj: gramaj != null ? String(Number(gramaj.toFixed(3))) : '',
          toplamKg: p.toplamKg > 0 ? String(Number(p.toplamKg.toFixed(3))) : '',
        };
      }).filter(x => x.calisillanUrunAdi);

      if (autoPaketler.length > 0) {
        setPaketler(autoPaketler);
      }

      // 2) Üretim özet: toplamUretimMiktari
      try {
        const ozetParams = {
          factoryNo: 2,
          startDateTime: startDate,
          endDateTime: endDate,
        };
        if (hatKodu) ozetParams.hatKodu = hatKodu;
        const ozetRaw = await getUretimOzeti(ozetParams);
        const ozetArr = Array.isArray(ozetRaw) ? ozetRaw : (ozetRaw?.data ?? ozetRaw?.items ?? []);
        const toplam = ozetArr.reduce((sum, r) => sum + (Number(r.toplamUretimMiktari || r.miktar || r.uretilenMiktar || 0) || 0), 0);
        if (toplam > 0) {
          setForm(p => ({ ...p, toplamUretimMiktari: String(Number(toplam.toFixed(3))) }));
        }
      } catch (_) {}
    } catch (err) {
      console.warn('autoFillPaketlemeler error:', err.message);
    }
  }, []);

  // ── Hat kart > form aç (yeni akış) ─────────────────────────
  const openHatForm = useCallback(async (hat) => {
    setModalEditId(null);
    // +30 dk hesap saatleri (API'ye bu gider)
    const hesapTimes = getVardiyaHesapTimes(selectedVardiya);
    const f = {
      calismaHat: hat.label,
      tarih: flowDate,
      vardiya: selectedVardiya,
      calismaSaatiBas: hesapTimes?.baslangic || '',
      calismaSaatiBit: hesapTimes?.bitis || '',
      calisillanPartiNo: '',
      tett: '',
      injectlemeKodu: '',
      girenHammaddeMiktari: '',
      tuketilenAseptikFici: '',
      ficiKg: '',
      kamyonSayisi: '',
      toplamUretimMiktari: '',
      arizaBildirimi: '',
      sonBrix: '', sonBost: '', sonRenk: '',
      uretimBrix: '', uretimBost: '', uretimRenk: '',
      notlar: '',
    };
    setForm(f);
    setPaketler([emptyPaket()]);
    setModalVisible(true);

    // Auto-fill async
    setAutoFilling(true);
    try {
      await Promise.all([
        autoFillFromStokHareket(hat.label, flowDate, selectedVardiya),
        autoFillInjectTett(hat.label),
        autoFillPaketlemeler(hat.label, hat.istasyonKodu, flowDate, selectedVardiya),
      ]);
    } finally {
      setAutoFilling(false);
    }
  }, [selectedVardiya, flowDate, autoFillFromStokHareket, autoFillInjectTett, autoFillPaketlemeler]);

  // ── Edit (listeden) ────────────────────────────────────────
  const openEditRapor = useCallback((rapor) => {
    setModalEditId(rapor.id);
    const f = {
      calismaHat: rapor.calismaHat || '',
      tarih: (rapor.tarih || '').split('T')[0],
      vardiya: rapor.vardiya || '',
      calismaSaatiBas: rapor.calismaSaatiBas || '',
      calismaSaatiBit: rapor.calismaSaatiBit || '',
      calisillanPartiNo: rapor.calisillanPartiNo || '',
      tett: rapor.tett || '',
      injectlemeKodu: rapor.injectlemeKodu || '',
      girenHammaddeMiktari: rapor.girenHammaddeMiktari != null ? String(rapor.girenHammaddeMiktari) : '',
      tuketilenAseptikFici: rapor.tuketilenAseptikFici != null ? String(rapor.tuketilenAseptikFici) : (rapor.ficiKg != null ? String(rapor.ficiKg) : ''),
      ficiKg: rapor.ficiKg != null ? String(rapor.ficiKg) : (rapor.yariMamulFiciKg != null ? String(rapor.yariMamulFiciKg) : ''),
      kamyonSayisi: rapor.kamyonSayisi != null ? String(rapor.kamyonSayisi) : '',
      toplamUretimMiktari: rapor.toplamUretimMiktari != null ? String(rapor.toplamUretimMiktari) : '',
      arizaBildirimi: rapor.arizaBildirimi || '',
      sonBrix: rapor.sonBrix != null ? String(rapor.sonBrix) : '',
      sonBost: rapor.sonBost != null ? String(rapor.sonBost) : '',
      sonRenk: rapor.sonRenk != null ? String(rapor.sonRenk) : '',
      uretimBrix: rapor.uretimBrix != null ? String(rapor.uretimBrix) : '',
      uretimBost: rapor.uretimBost != null ? String(rapor.uretimBost) : '',
      uretimRenk: rapor.uretimRenk != null ? String(rapor.uretimRenk) : '',
      notlar: rapor.notlar || '',
    };
    setForm(f);
    const pakItems = (rapor.paketlemeler || []).map(p => ({
      calisillanUrunAdi: p.calisillanUrunAdi || '',
      urunTipi: p.urunTipi || '',
      miktarAdet: p.miktarAdet != null ? String(p.miktarAdet) : '',
      gramaj: p.gramaj != null ? String(p.gramaj) : '',
      toplamKg: p.toplamKg != null ? String(p.toplamKg) : '',
    }));
    setPaketler(pakItems.length ? pakItems : [emptyPaket()]);
    setModalVisible(true);
  }, []);

  // ── Hammadde kontrolü ──────────────────────────────────────
  const checkHammaddeBeforeSubmit = async () => {
    const hat = form.calismaHat;
    const tarih = form.tarih || flowDate;
    const vardiya = form.vardiya || selectedVardiya;
    if (!hat || !tarih || !vardiya) return true;

    try {
      const hammaddeList = await getVardiyaHammaddeListV1({ tarih, vardiya, hat }).catch(() => []);
      const list = Array.isArray(hammaddeList) ? hammaddeList : [];
      if (list.length === 0) {
        return new Promise((resolve) => {
          Alert.alert(
            'Hammadde Kaydı Bulunamadı',
            `${hat} hattı için ${vardiya} vardiyasında hammadde kaydı bulunamadı.\n\nÖnce Vardiya Hammadde ekranından kayıt giriniz.`,
            [
              { text: 'İptal', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Yine de Gönder', style: 'destructive', onPress: () => resolve(true) },
            ],
          );
        });
      }
      return true;
    } catch (_) {
      return true;
    }
  };

  // ── Kaydet ─────────────────────────────────────────────────
  const handleSave = async () => {
    const canSubmit = await checkHammaddeBeforeSubmit();
    if (!canSubmit) return;

    setSaving(true);
    try {
      const toNum = (v) => { if (!v && v !== 0) return null; const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; };
      const toInt = (v) => { if (!v && v !== 0) return null; const n = parseInt(String(v), 10); return isNaN(n) ? null : n; };

      const payload = {
        calismaHat: form.calismaHat || null,
        tarih: form.tarih || null,
        vardiya: form.vardiya || null,
        calismaSaatiBas: form.calismaSaatiBas || null,
        calismaSaatiBit: form.calismaSaatiBit || null,
        calisillanPartiNo: form.calisillanPartiNo || null,
        tett: form.tett || null,
        injectlemeKodu: form.injectlemeKodu || null,
        girenHammaddeMiktari: toNum(form.girenHammaddeMiktari),
        tuketilenAseptikFici: toNum(form.tuketilenAseptikFici),
        ficiKg: toNum(form.ficiKg),
        kamyonSayisi: toInt(form.kamyonSayisi),
        toplamUretimMiktari: toNum(form.toplamUretimMiktari),
        arizaBildirimi: form.arizaBildirimi || null,
        notlar: form.notlar || null,
      };

      // Kolileme hattında değerler gönderilmez
      if (!isKolileme(form.calismaHat)) {
        payload.sonBrix = toNum(form.sonBrix);
        payload.sonBost = toNum(form.sonBost);
        payload.sonRenk = toNum(form.sonRenk);
        payload.uretimBrix = toNum(form.uretimBrix);
        payload.uretimBost = toNum(form.uretimBost);
        payload.uretimRenk = toNum(form.uretimRenk);
      }

      // Paketlemeler nested
      payload.paketlemeler = paketler.filter(p => p.calisillanUrunAdi || p.toplamKg).map(p => ({
        calisillanUrunAdi: p.calisillanUrunAdi || null,
        urunTipi: p.urunTipi || null,
        miktarAdet: toInt(p.miktarAdet),
        gramaj: toNum(p.gramaj),
        toplamKg: toNum(p.toplamKg),
      }));

      // hatDurumlar — tekil hat, otomatik
      payload.hatDurumlar = [{ hatAdi: form.calismaHat || null, hatDurumu: 'Çalışıyor' }];

      if (modalEditId) {
        await updateVardiyaRaporV1(modalEditId, payload);
      } else {
        await createVardiyaRaporV1(payload);
      }

      setModalVisible(false);
      if (mode === 'newFlow' && form.calismaHat) {
        setCompletedHats(prev => new Set(prev).add(form.calismaHat));
      }
      if (mode === 'list') await loadData();
    } catch (err) {
      console.warn('Save error:', err);
      Alert.alert('Hata', String(err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  // ── Sil ────────────────────────────────────────────────────
  const handleDelete = async (rapor) => {
    try {
      await deleteVardiyaRaporV1(rapor.id);
      await loadData();
    } catch (err) {
      Alert.alert('Hata', err.message);
    }
  };

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  const vardiyaDef = VARDIYA_DEFS[selectedVardiya];
  const showKolileme = isKolileme(form.calismaHat);

  // ── Liste modu ─────────────────────────────────────────────
  const renderList = () => (
    <>
      <View style={styles.filterBar}>
        <TouchableOpacity style={styles.filterDateBtn} onPress={() => { setPendingDate(new Date(filterDate + 'T00:00:00')); setShowDatePicker(true); }} activeOpacity={0.7}>
          <Text style={styles.filterDateLabel}>TARİH</Text>
          <Text style={styles.filterDateText}>{formatTR(filterDate)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterTodayBtn} onPress={() => setFilterDate(today())} activeOpacity={0.7}>
          <Text style={[styles.filterTodayText, { color: INDIGO }]}>Bugün</Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={pendingDate} mode="date" display="default"
          onChange={(event, date) => {
            if (event.type === 'dismissed' || !date) { setShowDatePicker(false); return; }
            setFilterDate(date.toISOString().split('T')[0]);
            setShowDatePicker(false);
          }}
        />
      )}
      {showDatePicker && Platform.OS === 'ios' && (
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerSheet}>
              <Text style={styles.pickerTitle}>Tarih Seç</Text>
              <DateTimePicker value={pendingDate} mode="date" display="spinner" themeVariant="light" locale="tr" onChange={(e, d) => { if (d) setPendingDate(d); }} style={{ height: 180 }} />
              <View style={styles.pickerActions}>
                <TouchableOpacity style={styles.pickerCancel} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.pickerCancelText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.pickerConfirm, { backgroundColor: INDIGO }]} onPress={() => {
                  setFilterDate(pendingDate.toISOString().split('T')[0]);
                  setShowDatePicker(false);
                }}>
                  <Text style={styles.pickerConfirmText}>Seç</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={INDIGO} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}><Text style={styles.retryBtnText}>Tekrar Dene</Text></TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={INDIGO} />}
        >
          {raporlar.length === 0 && (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Henüz rapor yok</Text>
              <Text style={styles.emptySubtext}>Yeni rapor eklemek için "+ Yeni" butonuna basın</Text>
            </View>
          )}
          {raporlar.map(r => (
            <RaporCard key={r.id} rapor={r} onEdit={openEditRapor} onDelete={handleDelete} />
          ))}
        </ScrollView>
      )}
    </>
  );

  // ── Yeni akış modu ─────────────────────────────────────────
  const renderNewFlow = () => (
    <>
      <View style={styles.flowBanner}>
        <View>
          <Text style={styles.infoLabel}>TARİH</Text>
          <Text style={styles.infoValue}>{formatTR(flowDate)}</Text>
        </View>
        <View style={[styles.vardiyaPill, { backgroundColor: vardiyaDef?.bgColor, borderColor: vardiyaDef?.color }]}>
          <Text style={[styles.vardiyaPillText, { color: vardiyaDef?.color }]}>
            Vardiya {selectedVardiya} ({vardiyaDef?.baslangic}–{vardiyaDef?.bitis})
          </Text>
        </View>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={INDIGO} /></View>
      ) : (
        <FlatList
          data={hatOptions}
          keyExtractor={(item) => item.istasyonKodu}
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 80 }}
          ListHeaderComponent={
            <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.md }}>
              {completedHats.size}/{hatOptions.length} hat tamamlandı
            </Text>
          }
          ListEmptyComponent={<View style={styles.emptyWrap}><Text style={styles.emptyText}>Aktif hat bulunamadı</Text></View>}
          renderItem={({ item }) => (
            <HatCard hat={item} completed={completedHats.has(item.label)} onPress={openHatForm} />
          )}
        />
      )}
    </>
  );

  // ── FORM MODAL ─────────────────────────────────────────────
  const renderFormModal = () => (
    <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bgApp }}>
        {/* Header */}
        <View style={fStyles.header}>
          <Text style={fStyles.headerTitle}>
            {modalEditId ? 'Rapor Düzenle' : `${form.calismaHat || 'Yeni'} — Rapor`}
          </Text>
          <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="close" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Vardiya banner */}
        {form.vardiya && (() => {
          const def = VARDIYA_DEFS[form.vardiya];
          if (!def) return null;
          return (
            <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, backgroundColor: Colors.bgWhite }}>
              <View style={[fStyles.vardiyaBanner, { borderColor: def.color, backgroundColor: def.bgColor }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[fStyles.vardiyaBadge, { backgroundColor: def.color }]}>
                    <Text style={fStyles.vardiyaBadgeText}>{form.vardiya}</Text>
                  </View>
                  <View>
                    <Text style={[fStyles.vardiyaBannerTitle, { color: def.color }]}>Vardiya {form.vardiya}</Text>
                    <Text style={[fStyles.vardiyaBannerTime, { color: def.color }]}>{def.baslangic} – {def.bitis}</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })()}

        {autoFilling && (
          <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EEF2FF' }}>
            <ActivityIndicator size="small" color={INDIGO} />
            <Text style={{ fontSize: 13, color: INDIGO, fontWeight: '600' }}>Veriler yükleniyor...</Text>
          </View>
        )}

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: Spacing.lg }} keyboardShouldPersistTaps="handled">

            {/* ═══ GENEL ═══ */}
            <SectionHeader label="GENEL" color={INDIGO} />

            <Row>
              <Field label="ÇALIŞMA HAT" half>
                <View style={[fStyles.input, fStyles.readOnly]}>
                  <Text style={fStyles.readOnlyText}>{form.calismaHat || '—'}</Text>
                </View>
              </Field>
              <Field label="TARİH" half>
                <View style={[fStyles.input, fStyles.readOnly]}>
                  <Text style={fStyles.readOnlyText}>{form.tarih ? formatTR(form.tarih) : '—'}</Text>
                </View>
              </Field>
            </Row>
            <Row>
              <Field label="BAŞLANGIÇ SAATİ" half>
                <View style={[fStyles.input, fStyles.readOnly]}>
                  <Text style={fStyles.readOnlyText}>{form.vardiya ? VARDIYA_DEFS[form.vardiya]?.baslangic : (form.calismaSaatiBas || '--:--')}</Text>
                </View>
              </Field>
              <Field label="BİTİŞ SAATİ" half>
                <View style={[fStyles.input, fStyles.readOnly]}>
                  <Text style={fStyles.readOnlyText}>{form.vardiya ? VARDIYA_DEFS[form.vardiya]?.bitis : (form.calismaSaatiBit || '--:--')}</Text>
                </View>
              </Field>
            </Row>
            <Row>
              <Field label="ÇALIŞILAN PARTİ NO" half>
                <TextInput style={fStyles.input} value={form.calisillanPartiNo || ''} onChangeText={t => setF('calisillanPartiNo', t)} placeholder="Parti no" placeholderTextColor={Colors.textTertiary} />
              </Field>
              <Field label="TETT" half>
                <TextInput style={fStyles.input} value={form.tett || ''} onChangeText={t => setF('tett', t)} placeholder="TETT" placeholderTextColor={Colors.textTertiary} />
              </Field>
            </Row>

            {form.injectlemeKodu ? (
              <Field label="INJECT KODU">
                <View style={[fStyles.input, fStyles.readOnly, { flexDirection: 'row', justifyContent: 'space-between' }]}>
                  <Text style={[fStyles.readOnlyText, { flex: 1, fontSize: 13 }]}>{form.injectlemeKodu}</Text>
                  <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: INDIGO }}>OTOMATİK</Text>
                  </View>
                </View>
              </Field>
            ) : null}

            <Row>
              <Field label="TÜK. DOMATES HAMMADDE (KG)" half>
                <TextInput style={fStyles.input} value={form.girenHammaddeMiktari || ''} onChangeText={t => numInput('girenHammaddeMiktari', t)} keyboardType="decimal-pad" placeholderTextColor={Colors.textTertiary} />
              </Field>
              <Field label="TÜK. ASEPTİK FIÇI" half>
                <TextInput style={fStyles.input} value={form.tuketilenAseptikFici || ''} onChangeText={t => numInput('tuketilenAseptikFici', t)} keyboardType="decimal-pad" placeholderTextColor={Colors.textTertiary} />
              </Field>
            </Row>
            <Row>
              <Field label="FIÇI KG" half>
                <TextInput style={fStyles.input} value={form.ficiKg || ''} onChangeText={t => numInput('ficiKg', t)} keyboardType="decimal-pad" placeholderTextColor={Colors.textTertiary} />
              </Field>
              <Field label="KAMYON SAYISI" half>
                <TextInput style={fStyles.input} value={form.kamyonSayisi || ''} onChangeText={t => intInput('kamyonSayisi', t)} keyboardType="number-pad" placeholderTextColor={Colors.textTertiary} />
              </Field>
            </Row>
            <Row>
              <Field label="TOPLAM ÜRETİM MİKTARI" half>
                <TextInput style={fStyles.input} value={form.toplamUretimMiktari || ''} onChangeText={t => numInput('toplamUretimMiktari', t)} keyboardType="decimal-pad" placeholderTextColor={Colors.textTertiary} />
              </Field>
              <Field label="ARIZA BİLDİRİMİ" half>
                <TextInput style={fStyles.input} value={form.arizaBildirimi || ''} onChangeText={t => setF('arizaBildirimi', t)} placeholder="Arıza yoksa boş" placeholderTextColor={Colors.textTertiary} />
              </Field>
            </Row>

            {/* ═══ GÜNLÜK ÜRETİM ═══ */}
            <SectionHeader label="GÜNLÜK ÜRETİM" color="#D97706" />

            {paketler.map((pak, idx) => (
              <View key={idx} style={fStyles.multiCard}>
                <View style={fStyles.multiCardHead}>
                  <Text style={fStyles.multiCardTitle}>Paket #{idx + 1}</Text>
                  <TouchableOpacity onPress={() => setPaketler(p => p.length > 1 ? p.filter((_, i) => i !== idx) : p)}>
                    <Icon name="delete-outline" size={20} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
                <Row>
                  <Field label="ÜRÜN ADI" half>
                    <TextInput style={fStyles.input} value={pak.calisillanUrunAdi} onChangeText={t => setPaketler(p => p.map((x, i) => i === idx ? { ...x, calisillanUrunAdi: t } : x))} placeholderTextColor={Colors.textTertiary} />
                  </Field>
                  <Field label="TİP" half>
                    <TextInput style={fStyles.input} value={pak.urunTipi} onChangeText={t => setPaketler(p => p.map((x, i) => i === idx ? { ...x, urunTipi: t } : x))} placeholderTextColor={Colors.textTertiary} />
                  </Field>
                </Row>
                <Row>
                  <Field label="ADET" half>
                    <TextInput style={fStyles.input} value={pak.miktarAdet} keyboardType="number-pad" onChangeText={t => {
                      const v = t.replace(/[^0-9]/g, '');
                      setPaketler(p => p.map((x, i) => {
                        if (i !== idx) return x;
                        const g = parseFloat(String(x.gramaj).replace(',', '.')) || 0;
                        return { ...x, miktarAdet: v, toplamKg: v && g ? ((parseInt(v, 10) * g) / 1000).toFixed(2) : x.toplamKg };
                      }));
                    }} placeholderTextColor={Colors.textTertiary} />
                  </Field>
                  <Field label="GRAMAJ" half>
                    <TextInput style={fStyles.input} value={pak.gramaj} keyboardType="decimal-pad" onChangeText={t => {
                      const v = t.replace(/[^0-9.,]/g, '');
                      setPaketler(p => p.map((x, i) => {
                        if (i !== idx) return x;
                        const m = parseInt(x.miktarAdet, 10) || 0;
                        const g = parseFloat(v.replace(',', '.')) || 0;
                        return { ...x, gramaj: v, toplamKg: m && g ? ((m * g) / 1000).toFixed(2) : x.toplamKg };
                      }));
                    }} placeholderTextColor={Colors.textTertiary} />
                  </Field>
                  <Field label="TOP. KG" half>
                    <TextInput style={[fStyles.input, fStyles.readOnly]} value={pak.toplamKg} keyboardType="decimal-pad" onChangeText={t => setPaketler(p => p.map((x, i) => i === idx ? { ...x, toplamKg: t.replace(/[^0-9.,]/g, '') } : x))} placeholderTextColor={Colors.textTertiary} />
                  </Field>
                </Row>
              </View>
            ))}
            <TouchableOpacity style={fStyles.addRowBtn} onPress={() => setPaketler(p => [...p, emptyPaket()])}>
              <Text style={fStyles.addRowText}>+ Paket Ekle</Text>
            </TouchableOpacity>

            {/* ═══ DEĞERLER (kolileme hariç) ═══ */}
            {!showKolileme && (<>
              <SectionHeader label="DEĞERLER" color="#7C3AED" />

              <Text style={fStyles.subLabel}>SON ÜRÜN DEĞERLERİ</Text>
              <Row>
                <Field label="SON BRİX" half>
                  <TextInput style={fStyles.input} value={form.sonBrix || ''} keyboardType="decimal-pad" onChangeText={t => numInput('sonBrix', t)} placeholderTextColor={Colors.textTertiary} />
                </Field>
                <Field label="SON BOSTWİCK" half>
                  <TextInput style={fStyles.input} value={form.sonBost || ''} keyboardType="decimal-pad" onChangeText={t => numInput('sonBost', t)} placeholderTextColor={Colors.textTertiary} />
                </Field>
              </Row>
              <Field label="SON RENK">
                <TextInput style={[fStyles.input, { width: '48%' }]} value={form.sonRenk || ''} keyboardType="decimal-pad" onChangeText={t => numInput('sonRenk', t)} placeholderTextColor={Colors.textTertiary} />
              </Field>

              <Text style={[fStyles.subLabel, { marginTop: Spacing.lg }]}>ÜRETİM DEĞERLERİ</Text>
              <Row>
                <Field label="ÜRETİM BRİX" half>
                  <TextInput style={fStyles.input} value={form.uretimBrix || ''} keyboardType="decimal-pad" onChangeText={t => numInput('uretimBrix', t)} placeholderTextColor={Colors.textTertiary} />
                </Field>
                <Field label="ÜRETİM BOSTWİCK" half>
                  <TextInput style={fStyles.input} value={form.uretimBost || ''} keyboardType="decimal-pad" onChangeText={t => numInput('uretimBost', t)} placeholderTextColor={Colors.textTertiary} />
                </Field>
              </Row>
              <Field label="ÜRETİM RENK">
                <TextInput style={[fStyles.input, { width: '48%' }]} value={form.uretimRenk || ''} keyboardType="decimal-pad" onChangeText={t => numInput('uretimRenk', t)} placeholderTextColor={Colors.textTertiary} />
              </Field>

              <Field label="NOTLAR">
                <TextInput style={[fStyles.input, { minHeight: 80, textAlignVertical: 'top' }]} value={form.notlar || ''} onChangeText={t => setF('notlar', t)} multiline placeholderTextColor={Colors.textTertiary} />
              </Field>
            </>)}

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer */}
        <View style={fStyles.footer}>
          <TouchableOpacity style={fStyles.cancelBtn} onPress={() => setModalVisible(false)}>
            <Text style={fStyles.cancelText}>İptal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[fStyles.saveBtn, { backgroundColor: INDIGO }]} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : (
              <Text style={fStyles.saveText}>{mode === 'newFlow' ? 'Bu Hattı Gönder' : 'Kaydet'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  // ── ANA RETURN ─────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => {
          if (mode === 'newFlow') { setMode('list'); return; }
          navigation.goBack();
        }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="chevron-left" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={[styles.headerIcon, { backgroundColor: '#EEF2FF' }]}>
          <Text style={{ fontSize: 18, color: INDIGO, fontWeight: '700' }}>V</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Vardiya Raporu</Text>
          <Text style={styles.headerSubtitle}>
            {mode === 'newFlow' ? 'Hat seçerek rapor girin' : (loading ? 'Yükleniyor...' : `${raporlar.length} rapor`)}
          </Text>
        </View>
        {mode === 'list' && (
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: INDIGO }]} onPress={startNewFlow} activeOpacity={0.8}>
            <Text style={styles.addBtnText}>+ Yeni</Text>
          </TouchableOpacity>
        )}
      </View>

      {mode === 'list' ? renderList() : renderNewFlow()}
      {renderFormModal()}
    </SafeAreaView>
  );
}

// ── Layout helpers ───────────────────────────────────────────
function SectionHeader({ label, color }) {
  return (
    <View style={[fStyles.sectionRow, { marginTop: Spacing.xl }]}>
      <View style={[fStyles.sectionDot, { backgroundColor: color }]} />
      <Text style={[fStyles.sectionLabel, { color }]}>{label}</Text>
    </View>
  );
}
function Row({ children }) {
  return <View style={fStyles.row}>{children}</View>;
}
function Field({ label, half, children }) {
  return (
    <View style={half ? fStyles.fieldHalf : fStyles.fieldWrap}>
      <Text style={fStyles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

// ── Hat card styles ──────────────────────────────────────────
const hatCardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgWhite, borderRadius: Radius.md,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm,
    borderWidth: 1.5, borderColor: Colors.borderLight,
  },
  cardCompleted: { borderColor: INDIGO },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 20, fontWeight: '800' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  cardSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  checkWrap: { marginLeft: Spacing.sm },
});

// ── Form styles ──────────────────────────────────────────────
const fStyles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.bgWhite, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  vardiyaBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: Radius.sm, borderWidth: 1.5,
  },
  vardiyaBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  vardiyaBadgeText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  vardiyaBannerTitle: { fontSize: 15, fontWeight: '700' },
  vardiyaBannerTime: { fontSize: 12, fontWeight: '600' },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: Spacing.md, paddingBottom: Spacing.sm,
    borderBottomWidth: 1.5, borderBottomColor: Colors.borderLight,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  subLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  row: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  fieldWrap: { marginBottom: Spacing.lg },
  fieldHalf: { flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary, marginBottom: 5, letterSpacing: 0.3 },
  input: {
    backgroundColor: Colors.bgWhite, borderWidth: 1, borderColor: Colors.borderColor,
    borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: Colors.textPrimary,
  },
  readOnly: { backgroundColor: '#F3F4F6' },
  readOnlyText: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
  multiCard: {
    backgroundColor: Colors.bgWhite, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.borderColor,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  multiCardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  multiCardTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  addRowBtn: {
    alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.sm, borderWidth: 1.5, borderColor: INDIGO, backgroundColor: '#EEF2FF',
  },
  addRowText: { fontSize: 13, fontWeight: '700', color: INDIGO },
  footer: {
    flexDirection: 'row', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.bgWhite, borderTopWidth: 0.5, borderTopColor: Colors.borderLight,
  },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.sm, backgroundColor: Colors.bgSurface },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ── Main styles ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgApp },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.bgWhite, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.bgSurface, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm,
  },
  headerIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  headerSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  addBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.sm },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  filterBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgWhite, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight, gap: Spacing.sm,
  },
  filterDateBtn: { flex: 1, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, backgroundColor: Colors.bgSurface, borderRadius: Radius.sm },
  filterDateLabel: { fontSize: 10, color: Colors.textTertiary, fontWeight: '600' },
  filterDateText: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600', marginTop: 2 },
  filterTodayBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.sm, backgroundColor: Colors.bgSurface },
  filterTodayText: { fontSize: 13, fontWeight: '600' },
  pickerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  pickerSheet: { backgroundColor: Colors.bgWhite, borderRadius: Radius.lg, padding: Spacing.lg, width: '85%', maxWidth: 360 },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', paddingVertical: Spacing.sm },
  pickerActions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, marginTop: Spacing.md, gap: Spacing.md },
  pickerCancel: { flex: 1, paddingVertical: 12, borderRadius: Radius.sm, backgroundColor: Colors.bgSurface, alignItems: 'center', borderWidth: 1, borderColor: Colors.borderColor },
  pickerCancelText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  pickerConfirm: { flex: 1, paddingVertical: 12, borderRadius: Radius.sm, alignItems: 'center' },
  pickerConfirmText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  list: { padding: Spacing.lg, paddingBottom: 80 },
  raporCard: { backgroundColor: Colors.bgWhite, borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm },
  raporHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  raporTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  raporDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  raporActions: { flexDirection: 'row', gap: 12 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  statChip: { backgroundColor: Colors.bgSurface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.xs },
  statLabel: { fontSize: 10, color: Colors.textTertiary, fontWeight: '600' },
  statVal: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  expandHint: { fontSize: 12, color: Colors.textTertiary, textAlign: 'center' },
  expandedContent: { marginTop: Spacing.lg },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: INDIGO, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  detailGrid: { flexDirection: 'row', gap: Spacing.md, marginBottom: 10 },
  detailCell: { flex: 1 },
  detailLabel: { fontSize: 10, fontWeight: '600', color: Colors.textTertiary, marginBottom: 2 },
  detailValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  detailDivider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: Spacing.md },
  notlarText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  qualityTable: { flexDirection: 'row', backgroundColor: Colors.bgSurface, borderRadius: Radius.sm, overflow: 'hidden' },
  qualityCol: { flex: 1, padding: Spacing.sm },
  qualityHeader: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  qualityVDivider: { width: 1, backgroundColor: Colors.borderLight },
  qualityItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  qualityItemLabel: { fontSize: 12, color: Colors.textTertiary },
  qualityItemVal: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, color: Colors.textTertiary, marginTop: 6, textAlign: 'center' },
  errorText: { fontSize: 14, color: Colors.danger, textAlign: 'center', marginBottom: Spacing.md },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.sm, backgroundColor: Colors.bgSurface },
  retryBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  flowBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.bgWhite, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  infoLabel: { fontSize: 10, fontWeight: '700', color: Colors.textTertiary },
  infoValue: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  vardiyaPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm, borderWidth: 1.5 },
  vardiyaPillText: { fontSize: 13, fontWeight: '700' },
});
