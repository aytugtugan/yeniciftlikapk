import React, { useState, useCallback, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput, FlatList,
  KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Spacing, Radius, Shadows } from '../theme';
import {
  getVardiyaHammaddeListV1, createVardiyaHammaddeV1, updateVardiyaHammaddeV1,
  getTuketimOzeti, getUretimOzeti,
} from '../api/formsApi';
import { getUretimEmirleri } from '../api/apiService';
import { AppDataContext } from '../context/AppDataContext';
import Icon from '../components/SimpleIcon';
import {
  VARDIYA_OPTIONS, VARDIYA_DEFS, VARDIYA_ORDER, VARDIYA_HESAP,
  getVardiyaTimes, getCurrentVardiya,
} from '../utils/vardiya';
import { toLocalDateStr, todayStr } from '../utils/dateUtils';

const EMERALD = '#059669';
const today = () => todayStr();

const isKolileme = (hatName) => {
  if (!hatName) return false;
  const lower = hatName.toLowerCase().replace(/[ıİ]/g, () => 'i');
  return lower.includes('kolileme') || lower.includes('koli\u0307leme') || lower.includes('kolıleme');
};

/**
 * Vardiyaya göre backend için doğru [startDateTime, endDateTime] aralığı üretir.
 *  - B vardiyası (16:00–00:00) gece yarısını aştığı için bitiş ertesi güne kaydırılır.
 *  - Bitiş, bir sonraki vardiyanın başlangıcıyla çakışmasın diye 1 sn geri alınır
 *    (ör. A için 15:59:59, B için 23:59:59, C için 07:59:59).
 */
function buildVardiyaRange(tarih, vardiya) {
  const hesap = VARDIYA_HESAP[vardiya];
  if (!hesap) return null;
  const pad = (n) => String(n).padStart(2, '0');

  const [bH, bM] = hesap.baslangic.split(':').map(Number);
  const [eH, eM] = hesap.bitis.split(':').map(Number);

  // Bitiş saati başlangıçtan küçük/eşitse vardiya gece yarısını aşıyor demektir.
  const crossesMidnight = (eH * 60 + eM) <= (bH * 60 + bM);

  // Bitiş anı: gerekirse ertesi gün, ardından 1 saniye geri.
  const endDateObj = new Date(`${tarih}T00:00:00`);
  if (crossesMidnight) endDateObj.setDate(endDateObj.getDate() + 1);
  endDateObj.setHours(eH, eM, 0, 0);
  endDateObj.setSeconds(endDateObj.getSeconds() - 1);

  const endYMD =
    `${endDateObj.getFullYear()}-${pad(endDateObj.getMonth() + 1)}-${pad(endDateObj.getDate())}`;
  const endHMS =
    `${pad(endDateObj.getHours())}:${pad(endDateObj.getMinutes())}:${pad(endDateObj.getSeconds())}`;

  return {
    startDateTime: `${tarih}T${hesap.baslangic}:00`,
    endDateTime: `${endYMD}T${endHMS}`,
  };
}

/**
 * Kolileme hattında TuketimOzeti'nden gelen şişik ADET miktarlarını
 * üretim ölçeğine normalize eder.
 */
function normalizeKolilemeTuketim(rows, uretilenAdet) {
  if (!uretilenAdet || uretilenAdet <= 0 || !rows.length) return rows;
  const maxMiktar = Math.max(...rows.map(r => { const m = parseFloat(r.miktar); return isNaN(m) ? 0 : m; }));
  if (maxMiktar <= 0 || maxMiktar <= uretilenAdet * 5) return rows;
  const scale = uretilenAdet / maxMiktar;
  return rows.map(r => {
    const m = parseFloat(r.miktar);
    if (isNaN(m) || m <= 0) return r;
    if (m > uretilenAdet * 5) {
      return { ...r, miktar: String(Number((m * scale).toFixed(3))) };
    }
    return r;
  });
}

const formatTR = (d) => {
  if (!d) return '';
  const s = d.split('T')[0];
  const [y, m, dd] = s.split('-');
  return `${dd}.${m}.${y}`;
};

// ── Hat kartı ────────────────────────────────────────────────
function HatCard({ hat, saved, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(hat)}
      style={[cardStyles.card, saved && cardStyles.cardSaved]}
    >
      <View style={cardStyles.cardHeader}>
        <View style={[cardStyles.iconWrap, { backgroundColor: saved ? '#ECFDF5' : '#F3F4F6' }]}>
          <Text style={[cardStyles.iconText, { color: saved ? EMERALD : Colors.textSecondary }]}>
            {hat.label?.[0] || 'H'}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={cardStyles.cardTitle}>{hat.label}</Text>
          <Text style={cardStyles.cardSub}>{hat.istasyonKodu}</Text>
        </View>
        {saved && (
          <View style={cardStyles.checkWrap}>
            <Icon name="check-circle" size={22} color={EMERALD} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Ana ekran ────────────────────────────────────────────────
export default function VardiyaHammaddeScreen() {
  const navigation = useNavigation();
  const { oncuToken } = useContext(AppDataContext);

  // Tarih ve vardiya
  const [tarih, setTarih] = useState(today());
  const [vardiya, setVardiya] = useState(getCurrentVardiya());
  const [pastDateMode, setPastDateMode] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingDate, setPendingDate] = useState(new Date());
  const [showVardiyaPicker, setShowVardiyaPicker] = useState(false);

  // Hat listesi
  const [hatOptions, setHatOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Kaydedilmiş hatlar seti
  const [savedHats, setSavedHats] = useState(new Set());

  // Form modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedHat, setSelectedHat] = useState(null);
  const [rows, setRows] = useState([]); // mevcut kayıtlar
  const [formRows, setFormRows] = useState([createEmptyRow()]);
  const [saving, setSaving] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  function createEmptyRow() {
    return { adi: '', miktar: '' };
  }

  // ── Yükle ──────────────────────────────────────────────────
  const loadHats = useCallback(async () => {
    try {
      const emirler = await getUretimEmirleri({ factoryCode: 2 });
      const arr = Array.isArray(emirler) ? emirler : [];
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
      const hatList = Object.values(hatMap);
      setHatOptions(hatList);

      // Kayıtlı hatları bul (her hat için ayrı sorgu gerekli, hat zorunlu alan)
      const sHats = new Set();
      await Promise.all(hatList.map(async h => {
        try {
          const existing = await getVardiyaHammaddeListV1({ tarih, vardiya, hat: h.label });
          const list = Array.isArray(existing) ? existing : [];
          if (list.some(r => r.adi || r.hammaddeAdi || r.stokAdi)) {
            sHats.add(h.label);
          }
        } catch (_) {}
      }));
      setSavedHats(sHats);
    } catch (err) {
      console.warn('VardiyaHammadde loadHats error:', err.message);
    }
  }, [tarih, vardiya]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadHats().finally(() => setLoading(false));
    }, [loadHats]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadHats().finally(() => setRefreshing(false));
  }, [loadHats]);

  // ── Hat seçimi → formu aç ─────────────────────────────────
  const openHatForm = useCallback(async (hat) => {
    setSelectedHat(hat);
    setFormLoading(true);
    setModalVisible(true);
    try {
      const range = buildVardiyaRange(tarih, vardiya);
      const hatKodlari = hat.istasyonKodu ? [hat.istasyonKodu] : [];

      // 1) TuketimOzeti'nden otomatik hammadde satırları
      let autoRows = [];
      if (range) {
        const { startDateTime, endDateTime } = range;
        try {
          const responses = hatKodlari.length > 0
            ? await Promise.all(hatKodlari.map(hatKodu =>
                getTuketimOzeti({ factoryNo: 2, startDateTime, endDateTime, hatKodu }).catch(() => [])
              ))
            : [await getTuketimOzeti({ factoryNo: 2, startDateTime, endDateTime }).catch(() => [])];

          const list = responses.flatMap(x => Array.isArray(x) ? x : (x?.data ?? x?.items ?? []));
          // Gruplama anahtarı olarak stokKodu'yu önce kullan — aynı isimli farklı
          // stok kodları yanlışlıkla birleşmesin. Görünen ad (adi) ayrı tutulur.
          const map = new Map();
          list.forEach(r => {
            const adi = r.stokAdi || r.malzemeAdi || r.urunAdi || r.name || r.stokKodu || 'Hammadde';
            const key = r.stokKodu || adi;
            const miktar = Number(r.toplamTuketimMiktari || r.miktar || r.kg || r.qty || 0) || 0;
            const cur = map.get(key) || { adi, miktar: 0 };
            cur.miktar += miktar;
            map.set(key, cur);
          });
          autoRows = [...map.values()].map(r => ({
            id: null,
            adi: r.adi,
            miktar: r.miktar > 0 ? String(Number(r.miktar.toFixed(3))) : '',
          }));

          // Kolileme: şişik tüketim miktarlarını üretim ölçeğine normalize et
          if (isKolileme(hat.label) && autoRows.length > 0) {
            try {
              const ozetParams = { factoryNo: 2, startDateTime, endDateTime };
              if (hatKodlari.length > 0) ozetParams.hatKodu = hatKodlari[0];
              const ozetRaw = await getUretimOzeti(ozetParams);
              const ozetArr = Array.isArray(ozetRaw) ? ozetRaw : (ozetRaw?.data ?? ozetRaw?.items ?? []);
              const uretilenAdet = ozetArr.reduce(
                (sum, r) => sum + (Number(r.toplamUretimMiktari || r.miktar || r.uretilenMiktar || 0) || 0), 0
              );
              if (uretilenAdet > 0) {
                autoRows = normalizeKolilemeTuketim(autoRows, uretilenAdet);
              }
            } catch (nErr) {
              console.warn('Kolileme normalize error:', nErr.message);
            }
          }
        } catch (err) {
          console.warn('TuketimOzeti error:', err.message);
        }
      }

      // 2) Daha önce kaydedilmiş satırları al
      const savedRaw = await getVardiyaHammaddeListV1({ tarih, vardiya, hat: hat.label }).catch(() => []);
      const savedList = Array.isArray(savedRaw) ? savedRaw : [];
      const savedRows = savedList
        .map(r => ({
          id: r.id ?? null,
          adi: r.adi || r.hammaddeAdi || r.stokAdi || '',
          miktar: r.miktar != null ? String(r.miktar) : '',
        }))
        .filter(r => r.adi);
      setRows(savedList);

      // 3) Merge: oto + kayıtlı
      if (savedRows.length > 0 && autoRows.length > 0) {
        const normalize = v => String(v || '').trim().toLowerCase();
        const savedMap = new Map(savedRows.map(r => [normalize(r.adi), r]));
        const merged = autoRows.map(r => {
          const s = savedMap.get(normalize(r.adi));
          return s ? { ...r, ...s, miktar: r.miktar } : r; // oto miktar, kayıtlı diğer alanlar
        });
        const autoSet = new Set(autoRows.map(r => normalize(r.adi)));
        const onlySaved = savedRows.filter(r => !autoSet.has(normalize(r.adi)));
        setFormRows([...merged, ...onlySaved]);
      } else if (savedRows.length > 0) {
        setFormRows(savedRows);
      } else if (autoRows.length > 0) {
        setFormRows(autoRows);
      } else {
        setFormRows([createEmptyRow()]);
      }
    } catch (err) {
      console.warn('openHatForm error:', err.message);
      setFormRows([createEmptyRow()]);
    } finally {
      setFormLoading(false);
    }
  }, [tarih, vardiya]);

  // ── Kaydet ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedHat) return;
    setSaving(true);
    try {
      for (const row of formRows) {
        if (!row.adi && !row.miktar) continue;
        const payload = {
          tarih,
          vardiya,
          hat: selectedHat.label,
          calismaHat: selectedHat.label,
          adi: row.adi || null,
          miktar: row.miktar ? parseFloat(String(row.miktar).replace(',', '.')) : null,
        };
        if (row.id) {
          await updateVardiyaHammaddeV1(row.id, payload);
        } else {
          await createVardiyaHammaddeV1(payload);
        }
      }
      // Başarılı
      setSavedHats(prev => new Set(prev).add(selectedHat.label));
      setModalVisible(false);
      Alert.alert('Başarılı', `${selectedHat.label} hammadde kaydı tamamlandı.`);
    } catch (err) {
      Alert.alert('Hata', err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────
  const vardiyaDef = VARDIYA_DEFS[vardiya];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="chevron-left" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={[styles.headerIcon, { backgroundColor: '#F0FDF4' }]}>
          <Text style={{ fontSize: 18, color: EMERALD, fontWeight: '700' }}>H</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Vardiya Hammadde</Text>
          <Text style={styles.headerSubtitle}>Hammadde kayıtları</Text>
        </View>
      </View>

      {/* Past date toggle */}
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: 8, gap: 8, backgroundColor: Colors.bgWhite }}
        onPress={() => {
          const next = !pastDateMode;
          setPastDateMode(next);
          if (!next) {
            setTarih(today());
            setVardiya(getCurrentVardiya());
          }
        }}
        activeOpacity={0.7}
      >
        <View style={{ width: 40, height: 22, borderRadius: 11, backgroundColor: pastDateMode ? EMERALD : '#D1D5DB', justifyContent: 'center', paddingHorizontal: 2 }}>
          <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', alignSelf: pastDateMode ? 'flex-end' : 'flex-start' }} />
        </View>
        <Text style={{ fontSize: 13, fontWeight: '600', color: pastDateMode ? EMERALD : Colors.textSecondary }}>
          Geçmişe Yönelik Kayıt
        </Text>
      </TouchableOpacity>

      {/* Tarih + Vardiya banner */}
      <View style={styles.infoBanner}>
        <TouchableOpacity
          style={styles.infoItem}
          activeOpacity={pastDateMode ? 0.7 : 1}
          onPress={() => { if (pastDateMode) { setPendingDate(new Date(tarih + 'T00:00:00')); setShowDatePicker(true); } }}
        >
          <Text style={styles.infoLabel}>TARİH {pastDateMode ? '✎' : ''}</Text>
          <Text style={styles.infoValue}>{formatTR(tarih)}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.vardiyaBadge, { backgroundColor: vardiyaDef?.bgColor, borderColor: vardiyaDef?.color }]}
          activeOpacity={pastDateMode ? 0.7 : 1}
          onPress={() => { if (pastDateMode) setShowVardiyaPicker(true); }}
        >
          <Text style={[styles.vardiyaBadgeText, { color: vardiyaDef?.color }]}>
            Vardiya {vardiya} {pastDateMode ? '✎' : ''}
          </Text>
          <Text style={[styles.vardiyaBadgeTime, { color: vardiyaDef?.color }]}>
            {vardiyaDef?.baslangic} – {vardiyaDef?.bitis}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date Picker */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={pendingDate} mode="date" display="default"
          onChange={(event, date) => {
            if (event.type === 'dismissed' || !date) { setShowDatePicker(false); return; }
            setTarih(toLocalDateStr(date));
            setShowDatePicker(false);
          }}
        />
      )}
      {showDatePicker && Platform.OS === 'ios' && (
        <Modal visible={true} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, width: 320 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 12 }}>Tarih Seçin</Text>
              <DateTimePicker value={pendingDate} mode="date" display="spinner" themeVariant="light" locale="tr" onChange={(e, d) => { if (d) setPendingDate(d); }} style={{ height: 180 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)} style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
                  <Text style={{ color: Colors.textSecondary, fontWeight: '600' }}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setTarih(toLocalDateStr(pendingDate)); setShowDatePicker(false); }} style={{ backgroundColor: EMERALD, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Seç</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Vardiya Picker */}
      {showVardiyaPicker && (
        <Modal visible={true} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, width: 320 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 12 }}>Vardiya Seçin</Text>
              {VARDIYA_ORDER.map(v => {
                const def = VARDIYA_DEFS[v];
                const sel = vardiya === v;
                return (
                  <TouchableOpacity key={v} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, marginVertical: 4, backgroundColor: sel ? (def?.bgColor || '#F3F4F6') : '#fff', borderWidth: 1, borderColor: sel ? (def?.color || '#ccc') : '#E5E7EB' }} onPress={() => { setVardiya(v); setShowVardiyaPicker(false); }} activeOpacity={0.7}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: def?.color || '#6B7280', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{v}</Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: def?.color || '#1F2937' }}>Vardiya {v}</Text>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>{def?.baslangic} – {def?.bitis}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity onPress={() => setShowVardiyaPicker(false)} style={{ alignSelf: 'center', marginTop: 12, paddingHorizontal: 16, paddingVertical: 8 }}>
                <Text style={{ color: Colors.textSecondary, fontWeight: '600' }}>İptal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Hat kartları listesi */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={EMERALD} />
        </View>
      ) : (
        <FlatList
          data={hatOptions}
          keyExtractor={(item) => item.istasyonKodu}
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={EMERALD} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Aktif hat bulunamadı</Text>
            </View>
          }
          renderItem={({ item }) => (
            <HatCard
              hat={item}
              saved={savedHats.has(item.label)}
              onPress={openHatForm}
            />
          )}
        />
      )}

      {/* Form Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bgApp }}>
            {/* Modal header */}
            <View style={formStyles.header}>
              <View style={[formStyles.headerIconWrap, { backgroundColor: '#F0FDF4' }]}>
                <Icon name="inventory-2" size={18} color={EMERALD} />
              </View>
              <Text style={formStyles.headerTitle}>
                {selectedHat?.label || 'Hat'} — Hammadde
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={formStyles.headerCloseBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Sabit bilgi */}
            <View style={formStyles.fixedInfo}>
              <View style={formStyles.fixedChip}>
                <Icon name="event" size={13} color={Colors.textTertiary} />
                <Text style={formStyles.fixedChipText}>{formatTR(tarih)}</Text>
              </View>
              <View style={[formStyles.fixedChip, { backgroundColor: vardiyaDef?.bgColor, borderColor: vardiyaDef?.color }]}>
                <Text style={[formStyles.fixedChipText, { color: vardiyaDef?.color, fontWeight: '700' }]}>
                  {vardiya} ({vardiyaDef?.baslangic}–{vardiyaDef?.bitis})
                </Text>
              </View>
              <View style={formStyles.fixedChip}>
                <Icon name="precision-manufacturing" size={13} color={Colors.textTertiary} />
                <Text style={formStyles.fixedChipText}>{selectedHat?.label || '—'}</Text>
              </View>
            </View>

            {formLoading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={EMERALD} />
                <Text style={{ marginTop: 8, color: Colors.textSecondary }}>Yükleniyor...</Text>
              </View>
            ) : (
              <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={{ padding: Spacing.lg }} keyboardShouldPersistTaps="handled">
                  {formRows.map((row, idx) => (
                    <View key={idx} style={formStyles.multiCard}>
                      <View style={formStyles.multiCardHeader}>
                        <View style={formStyles.multiCardBadge}>
                          <Text style={formStyles.multiCardBadgeText}>{idx + 1}</Text>
                        </View>
                        <Text style={formStyles.multiCardTitle}>{row.adi || `Hammadde #${idx + 1}`}</Text>
                        <TouchableOpacity
                          style={formStyles.rowDeleteBtn}
                          onPress={() => setFormRows(p => p.length > 1 ? p.filter((_, i) => i !== idx) : p)}
                        >
                          <Icon name="delete-outline" size={18} color={Colors.danger} />
                        </TouchableOpacity>
                      </View>
                      <View style={formStyles.fieldRow}>
                        <View style={formStyles.fieldHalf}>
                          <Text style={formStyles.fieldLabel}>ADI</Text>
                          <TextInput
                            style={formStyles.input}
                            value={row.adi}
                            onChangeText={t => setFormRows(p => p.map((x, i) => i === idx ? { ...x, adi: t } : x))}
                            placeholderTextColor={Colors.textTertiary}
                            placeholder="Hammadde adı"
                          />
                        </View>
                        <View style={formStyles.fieldHalf}>
                          <Text style={formStyles.fieldLabel}>MİKTAR</Text>
                          <TextInput
                            style={formStyles.input}
                            value={row.miktar}
                            keyboardType="decimal-pad"
                            onChangeText={t => setFormRows(p => p.map((x, i) => i === idx ? { ...x, miktar: t.replace(/[^0-9.,]/g, '') } : x))}
                            placeholderTextColor={Colors.textTertiary}
                            placeholder="0"
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                  <View style={{ height: 40 }} />
                </ScrollView>
              </KeyboardAvoidingView>
            )}

            {/* Footer */}
            <View style={formStyles.footer}>
              <TouchableOpacity style={formStyles.footerCancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={formStyles.footerCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[formStyles.footerSaveBtn, { backgroundColor: EMERALD }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={formStyles.footerSaveText}>Kaydet</Text>
                )}
              </TouchableOpacity>
            </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Card styles ──────────────────────────────────────────────
const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgWhite, borderRadius: Radius.md,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm,
    borderWidth: 1.5, borderColor: Colors.borderLight,
  },
  cardSaved: { borderColor: EMERALD },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 20, fontWeight: '800' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  cardSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  checkWrap: { marginLeft: Spacing.sm },
});

// ── Form styles ──────────────────────────────────────────────
const formStyles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    backgroundColor: Colors.bgWhite, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  headerIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  headerCloseBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.bgSurface, alignItems: 'center', justifyContent: 'center',
  },
  fixedInfo: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: Spacing.lg, paddingVertical: 10,
    backgroundColor: Colors.bgWhite, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  fixedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: Colors.bgSurface, borderWidth: 1, borderColor: Colors.borderLight,
  },
  fixedChipText: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary },
  fieldWrap: { marginBottom: Spacing.lg },
  fieldRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  fieldHalf: { flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary, marginBottom: 5, letterSpacing: 0.3 },
  input: {
    backgroundColor: Colors.bgWhite, borderWidth: 1, borderColor: Colors.borderColor,
    borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: Colors.textPrimary,
  },
  multiCard: {
    backgroundColor: Colors.bgWhite, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  multiCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm,
  },
  multiCardBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center',
  },
  multiCardBadgeText: { fontSize: 12, fontWeight: '800', color: EMERALD },
  multiCardTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, flex: 1 },
  rowDeleteBtn: { padding: 4 },
  addRowBtn: {
    flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.sm, borderWidth: 1.5, borderColor: EMERALD, backgroundColor: '#ECFDF5',
  },
  addRowText: { fontSize: 13, fontWeight: '700', color: EMERALD },
  footer: {
    flexDirection: 'row', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.bgWhite, borderTopWidth: 0.5, borderTopColor: Colors.borderLight,
  },
  footerCancelBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.sm, backgroundColor: Colors.bgSurface,
  },
  footerCancelText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  footerSaveBtn: {
    flex: 1, paddingVertical: 12, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center',
  },
  footerSaveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
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
  headerIcon: {
    width: 40, height: 40, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm,
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  headerSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  infoBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.bgWhite, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  infoItem: {},
  infoLabel: { fontSize: 10, fontWeight: '700', color: Colors.textTertiary },
  infoValue: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  vardiyaBadge: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm, borderWidth: 1.5,
  },
  vardiyaBadgeText: { fontSize: 14, fontWeight: '700' },
  vardiyaBadgeTime: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
});
