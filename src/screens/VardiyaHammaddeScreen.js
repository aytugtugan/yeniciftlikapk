import React, { useState, useCallback, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput, FlatList,
  KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Radius, Shadows } from '../theme';
import {
  getVardiyaHammaddeListV1, createVardiyaHammaddeV1, updateVardiyaHammaddeV1,
  getTuketimOzeti,
} from '../api/formsApi';
import { getUretimEmirleri } from '../api/apiService';
import { AppDataContext } from '../context/AppDataContext';
import Icon from '../components/SimpleIcon';
import {
  VARDIYA_OPTIONS, VARDIYA_DEFS, VARDIYA_ORDER, VARDIYA_HESAP,
  getVardiyaTimes, getCurrentVardiya,
} from '../utils/vardiya';

const EMERALD = '#059669';
const today = () => new Date().toISOString().split('T')[0];
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

  // Tarih ve vardiya (otomatik, değiştirilemez)
  const [tarih] = useState(today());
  const [vardiya] = useState(getCurrentVardiya());

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
    return { adi: '', partiSiparisNo: '', miktar: '', fireAdedi: '', fireAciklama: '' };
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
      const hesap = VARDIYA_HESAP[vardiya];
      const hatKodlari = hat.istasyonKodu ? [hat.istasyonKodu] : [];

      // 1) TuketimOzeti'nden otomatik hammadde satırları
      let autoRows = [];
      if (hesap) {
        try {
          const startDateTime = `${tarih}T${hesap.baslangic}:00`;
          const endDateTime = `${tarih}T${hesap.bitis}:59`;
          const responses = hatKodlari.length > 0
            ? await Promise.all(hatKodlari.map(hatKodu =>
                getTuketimOzeti({ factoryNo: 2, startDateTime, endDateTime, hatKodu }).catch(() => [])
              ))
            : [await getTuketimOzeti({ factoryNo: 2, startDateTime, endDateTime }).catch(() => [])];

          const list = responses.flatMap(x => Array.isArray(x) ? x : (x?.data ?? x?.items ?? []));
          const map = new Map();
          list.forEach(r => {
            const adi = r.stokAdi || r.malzemeAdi || r.urunAdi || r.name || r.stokKodu || 'Hammadde';
            const miktar = Number(r.toplamTuketimMiktari || r.miktar || r.kg || r.qty || 0) || 0;
            const cur = map.get(adi) || { adi, partiSiparisNo: '', miktar: 0, fireAdedi: '', fireAciklama: '' };
            cur.miktar += miktar;
            map.set(adi, cur);
          });
          autoRows = [...map.values()].map(r => ({
            id: null,
            adi: r.adi,
            partiSiparisNo: '',
            miktar: r.miktar > 0 ? String(Number(r.miktar.toFixed(3))) : '',
            fireAdedi: '',
            fireAciklama: '',
          }));
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
          partiSiparisNo: r.partiSiparisNo || r.partiNo || r.siparisNo || '',
          miktar: r.miktar != null ? String(r.miktar) : '',
          fireAdedi: r.fireAdedi != null ? String(r.fireAdedi) : '',
          fireAciklama: r.fireAciklama || '',
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
          partiSiparisNo: row.partiSiparisNo || null,
          miktar: row.miktar ? parseFloat(String(row.miktar).replace(',', '.')) : null,
          fireAdedi: row.fireAdedi ? parseInt(row.fireAdedi, 10) : null,
          fireAciklama: row.fireAciklama || null,
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

      {/* Tarih + Vardiya banner (read-only) */}
      <View style={styles.infoBanner}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>TARİH</Text>
          <Text style={styles.infoValue}>{formatTR(tarih)}</Text>
        </View>
        <View style={[styles.vardiyaBadge, { backgroundColor: vardiyaDef?.bgColor, borderColor: vardiyaDef?.color }]}>
          <Text style={[styles.vardiyaBadgeText, { color: vardiyaDef?.color }]}>
            Vardiya {vardiya}
          </Text>
          <Text style={[styles.vardiyaBadgeTime, { color: vardiyaDef?.color }]}>
            {vardiyaDef?.baslangic} – {vardiyaDef?.bitis}
          </Text>
        </View>
      </View>

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
            <Text style={formStyles.headerTitle}>
              {selectedHat?.label || 'Hat'} — Hammadde
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Sabit bilgi */}
          <View style={formStyles.fixedInfo}>
            <View style={formStyles.fixedItem}>
              <Text style={formStyles.fixedLabel}>TARİH</Text>
              <Text style={formStyles.fixedValue}>{formatTR(tarih)}</Text>
            </View>
            <View style={formStyles.fixedItem}>
              <Text style={formStyles.fixedLabel}>VARDİYA</Text>
              <Text style={formStyles.fixedValue}>{vardiya} ({vardiyaDef?.baslangic}–{vardiyaDef?.bitis})</Text>
            </View>
            <View style={formStyles.fixedItem}>
              <Text style={formStyles.fixedLabel}>HAT</Text>
              <Text style={formStyles.fixedValue}>{selectedHat?.label || '—'}</Text>
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
                      <Text style={formStyles.multiCardTitle}>Hammadde #{idx + 1}</Text>
                      <TouchableOpacity
                        style={formStyles.rowDeleteBtn}
                        onPress={() => setFormRows(p => p.length > 1 ? p.filter((_, i) => i !== idx) : p)}
                      >
                        <Icon name="delete-outline" size={20} color={Colors.danger} />
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
                        <Text style={formStyles.fieldLabel}>PARTİ NO</Text>
                        <TextInput
                          style={formStyles.input}
                          value={row.partiSiparisNo}
                          onChangeText={t => setFormRows(p => p.map((x, i) => i === idx ? { ...x, partiSiparisNo: t } : x))}
                          placeholderTextColor={Colors.textTertiary}
                          placeholder="Parti/sipariş no"
                        />
                      </View>
                    </View>
                    <View style={formStyles.fieldRow}>
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
                      <View style={formStyles.fieldHalf}>
                        <Text style={formStyles.fieldLabel}>FİRE ADEDİ</Text>
                        <TextInput
                          style={formStyles.input}
                          value={row.fireAdedi}
                          keyboardType="number-pad"
                          onChangeText={t => setFormRows(p => p.map((x, i) => i === idx ? { ...x, fireAdedi: t.replace(/[^0-9]/g, '') } : x))}
                          placeholderTextColor={Colors.textTertiary}
                          placeholder="0"
                        />
                      </View>
                    </View>
                    <View style={formStyles.fieldWrap}>
                      <Text style={formStyles.fieldLabel}>FİRE AÇIKLAMA</Text>
                      <TextInput
                        style={formStyles.input}
                        value={row.fireAciklama}
                        onChangeText={t => setFormRows(p => p.map((x, i) => i === idx ? { ...x, fireAciklama: t } : x))}
                        placeholderTextColor={Colors.textTertiary}
                        placeholder="Açıklama"
                      />
                    </View>
                  </View>
                ))}
                <TouchableOpacity
                  style={formStyles.addRowBtn}
                  onPress={() => setFormRows(p => [...p, createEmptyRow()])}
                >
                  <Text style={formStyles.addRowText}>+ Hammadde Ekle</Text>
                </TouchableOpacity>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.bgWhite, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  fixedInfo: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.bgWhite, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  fixedItem: {},
  fixedLabel: { fontSize: 10, fontWeight: '700', color: Colors.textTertiary, letterSpacing: 0.3 },
  fixedValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginTop: 2 },
  fieldWrap: { marginBottom: Spacing.lg },
  fieldRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  fieldHalf: { flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary, marginBottom: 5, letterSpacing: 0.3 },
  input: {
    backgroundColor: Colors.bgWhite, borderWidth: 1, borderColor: Colors.borderColor,
    borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: Colors.textPrimary,
  },
  multiCard: {
    backgroundColor: Colors.bgWhite, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.borderColor,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  multiCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm,
  },
  multiCardTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  rowDeleteBtn: { padding: 6 },
  addRowBtn: {
    alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8,
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
