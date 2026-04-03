import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  StatusBar,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Spacing, Radius, Shadows, Typography } from '../theme';
import SimpleIcon from '../components/SimpleIcon';
import {
  getGunlukRaporlarList,
  getGunlukRaporByTarihAralik,
  deleteGunlukRapor,
} from '../api/formsApi';

const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const today = () => new Date().toISOString().split('T')[0];
const formatTR = (dateStr) => {
  if (!dateStr) return '';
  const d = dateStr.split('T')[0];
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${TR_MONTHS[parseInt(m) - 1]} ${y}`;
};
const fmt = (v) => v != null && v !== 0 ? Number(v).toLocaleString('tr-TR') : '—';

// ── Rapor Card ───────────────────────────────────────────────
function RaporCard({ item, onPress, onDelete }) {
  const ham = (Number(item.domateslKg) || 0) + (Number(item.biberKg) || 0);
  const kutu = (Number(item.kutu112830IcPiyasaAdet) || 0) + (Number(item.kutu112830TuzluIhrAdet) || 0)
    + (Number(item.kutu512830IcPiyasaAdet) || 0) + (Number(item.kutu512830TuzluIhrAdet) || 0)
    + (Number(item.kutu1012830Adet) || 0);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => onPress(item)}>
      <View style={styles.cardHeader}>
        <View style={styles.idBadge}>
          <Text style={styles.idText}>#{item.id}</Text>
        </View>
        <Text style={styles.cardDate}>{formatTR(item.raporTarihi)}</Text>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => {
            Alert.alert('Sil', `${formatTR(item.raporTarihi)} tarihli raporu silmek istediğinize emin misiniz?`, [
              { text: 'İptal', style: 'cancel' },
              { text: 'Sil', style: 'destructive', onPress: () => onDelete(item.id) },
            ]);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View><SimpleIcon name="close" size={16} color={Colors.danger} /></View>
        </TouchableOpacity>
      </View>

      {/* Quick stats */}
      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          <Text style={styles.statLabel}>Hammadde</Text>
          <Text style={styles.statValue}>{ham ? `${fmt(ham)} kg` : '—'}</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.statLabel}>Kutu</Text>
          <Text style={styles.statValue}>{kutu ? fmt(kutu) : '—'}</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.statLabel}>Elektrik</Text>
          <Text style={styles.statValue}>{item.elektrikTuketimKw ? `${fmt(item.elektrikTuketimKw)} kWh` : '—'}</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.statLabel}>Brix</Text>
          <Text style={styles.statValue}>{item.kutuOrtBrix ? `${item.kutuOrtBrix}` : '—'}</Text>
        </View>
      </View>

      {/* Footer meta */}
      {(item.hazirlayan || item.kontrolEden) ? (
        <View style={styles.cardFooter}>
          {item.hazirlayan ? <Text style={styles.footerText}>Haz: {item.hazirlayan}</Text> : null}
          {item.kontrolEden ? <Text style={styles.footerText}>Knt: {item.kontrolEden}</Text> : null}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

// ── Main Screen ──────────────────────────────────────────────
export default function GunlukRaporListScreen() {
  const navigation = useNavigation();
  const [raporlar, setRaporlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Date filter
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [showDatePicker, setShowDatePicker] = useState(null); // 'start' | 'end' | null
  const [pendingDate, setPendingDate] = useState(new Date());

  const loadData = useCallback(async () => {
    try {
      setError(null);
      let data;
      if (startDate === endDate) {
        // Single date or all
        data = await getGunlukRaporByTarihAralik(startDate, endDate);
        data = Array.isArray(data) ? data : [data].filter(Boolean);
      } else {
        data = await getGunlukRaporByTarihAralik(startDate, endDate);
        data = Array.isArray(data) ? data : [];
      }
      data.sort((a, b) => (b.raporTarihi || '').localeCompare(a.raporTarihi || ''));
      setRaporlar(data);
    } catch (err) {
      setError(err.message);
      // Fallback: try loading all
      try {
        const all = await getGunlukRaporlarList();
        const filtered = Array.isArray(all) ? all.filter(r => {
          const d = (r.raporTarihi || '').split('T')[0];
          return d >= startDate && d <= endDate;
        }) : [];
        filtered.sort((a, b) => (b.raporTarihi || '').localeCompare(a.raporTarihi || ''));
        setRaporlar(filtered);
        setError(null);
      } catch (_) {}
    }
  }, [startDate, endDate]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData().finally(() => setRefreshing(false));
  }, [loadData]);

  const handleDelete = async (id) => {
    try {
      await deleteGunlukRapor(id);
      setRaporlar(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      Alert.alert('Hata', e.message);
    }
  };

  const handleCardPress = (item) => {
    navigation.navigate('GunlukRaporDetay', { rapor: item });
  };

  const handleAdd = () => {
    navigation.navigate('GunlukRaporForm', { rapor: null });
  };

  // Date picker
  const openDatePicker = (which) => {
    setPendingDate(new Date(which === 'start' ? startDate : endDate));
    setShowDatePicker(which);
  };
  const handleDateChange = (event, date) => {
    if (date) setPendingDate(date);
  };
  const confirmDate = () => {
    const ds = pendingDate.toISOString().split('T')[0];
    if (showDatePicker === 'start') setStartDate(ds);
    else setEndDate(ds);
    setShowDatePicker(null);
  };
  const cancelDate = () => setShowDatePicker(null);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 10, paddingVertical: 4 }} activeOpacity={0.7}>
          <SimpleIcon name="arrow-back-ios" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Günlük Raporlar</Text>
          <Text style={styles.headerSubtitle}>Üretim günlük kayıtları</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>+ Ekle</Text>
        </TouchableOpacity>
      </View>

      {/* Date Filter */}
      <View style={styles.filterBar}>
        <TouchableOpacity style={styles.filterDateBtn} onPress={() => openDatePicker('start')} activeOpacity={0.7}>
          <Text style={styles.filterLabel}>Başlangıç</Text>
          <Text style={styles.filterValue}>{formatTR(startDate)}</Text>
        </TouchableOpacity>
        <Text style={styles.filterDash}>—</Text>
        <TouchableOpacity style={styles.filterDateBtn} onPress={() => openDatePicker('end')} activeOpacity={0.7}>
          <Text style={styles.filterLabel}>Bitiş</Text>
          <Text style={styles.filterValue}>{formatTR(endDate)}</Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={pendingDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            if (event.type === 'dismissed' || !date) {
              setShowDatePicker(null);
              return;
            }
            const ds = date.toISOString().split('T')[0];
            if (showDatePicker === 'start') setStartDate(ds);
            else setEndDate(ds);
            setShowDatePicker(null);
          }}
        />
      )}
      {showDatePicker && Platform.OS === 'ios' && (
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.pickerPopupOverlay}>
          <View style={styles.pickerPopupSheet}>
            <Text style={styles.datePickerTitle}>{showDatePicker === 'start' ? 'Başlangıç Tarihi' : 'Bitiş Tarihi'}</Text>
            <DateTimePicker
              value={pendingDate}
              mode="date"
              display="spinner"
              themeVariant="light"
              locale="tr"
              onChange={handleDateChange}
              style={{ height: 180 }}
            />
            <View style={styles.datePickerActions}>
              <TouchableOpacity style={styles.datePickerCancel} onPress={cancelDate}>
                <Text style={styles.datePickerCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.datePickerConfirm} onPress={confirmDate}>
                <Text style={styles.datePickerConfirmText}>Seç</Text>
              </TouchableOpacity>
            </View>
          </View>
          </View>
        </Modal>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={Colors.brandPrimary} />
          <Text style={styles.loadingText}>Raporlar yükleniyor...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerWrap}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
            <Text style={styles.retryBtnText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brandPrimary} />}
          showsVerticalScrollIndicator={false}
        >
          {raporlar.length === 0 ? (
            <View style={styles.emptyWrap}>
              <SimpleIcon name="assignment" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>Kayıt Bulunamadı</Text>
              <Text style={styles.emptySubtitle}>Seçili tarih aralığında rapor yok</Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={handleAdd} activeOpacity={0.8}>
                <Text style={styles.emptyAddBtnText}>+ Yeni Rapor Ekle</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.resultCount}>{raporlar.length} kayıt bulundu</Text>
              {raporlar.map(r => (
                <RaporCard key={r.id} item={r} onPress={handleCardPress} onDelete={handleDelete} />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgApp },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.bgApp,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  addBtn: {
    backgroundColor: Colors.brandPrimary,
    borderRadius: Radius.md,
    paddingHorizontal: 18,
    paddingVertical: 10,
    ...Shadows.sm,
  },
  addBtnText: { color: Colors.textWhite, fontWeight: '700', fontSize: 14 },

  // Filter
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: 8,
  },
  filterDateBtn: {
    flex: 1,
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterLabel: { fontSize: 10, fontWeight: '600', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.3 },
  filterValue: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  filterDash: { fontSize: 16, color: Colors.textTertiary, fontWeight: '600' },

  // Date picker popup
  pickerPopupOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 999,
  },
  pickerPopupSheet: {
    backgroundColor: Colors.bgWhite, borderRadius: Radius.lg,
    padding: Spacing.lg, width: '85%', maxWidth: 360,
  },
  datePickerTitle: {
    fontSize: 16, fontWeight: '700', color: Colors.textPrimary,
    textAlign: 'center', paddingVertical: Spacing.sm,
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  datePickerCancel: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgSurface,
  },
  datePickerCancelText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
  datePickerConfirm: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: Radius.sm,
    backgroundColor: Colors.brandPrimary,
  },
  datePickerConfirmText: { color: Colors.textWhite, fontWeight: '600', fontSize: 14 },

  // List
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 80 },
  resultCount: { fontSize: 12, fontWeight: '600', color: Colors.textTertiary, marginBottom: Spacing.sm },

  // Card
  card: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  idBadge: {
    backgroundColor: Colors.brandPrimaryLight,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  idText: { fontSize: 12, fontWeight: '700', color: Colors.brandPrimary },
  cardDate: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: { color: Colors.danger, fontWeight: '700', fontSize: 14 },

  // Stats
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statChip: {
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 70,
  },
  statLabel: { fontSize: 10, fontWeight: '600', color: Colors.textTertiary, textTransform: 'uppercase' },
  statValue: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginTop: 1 },

  // Footer
  cardFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
  },
  footerText: { fontSize: 11, color: Colors.textSecondary },

  // Loading / Error / Empty
  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: Colors.brandPrimary, fontWeight: '500' },
  errorText: { fontSize: 14, color: Colors.danger, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: {
    backgroundColor: Colors.brandPrimary,
    borderRadius: Radius.md,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryBtnText: { color: Colors.textWhite, fontWeight: '600', fontSize: 14 },

  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary },
  emptyAddBtn: {
    backgroundColor: Colors.brandPrimary,
    borderRadius: Radius.md,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: Spacing.md,
  },
  emptyAddBtnText: { color: Colors.textWhite, fontWeight: '700', fontSize: 14 },
});
