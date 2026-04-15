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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Spacing, Radius, Shadows } from '../theme';
import SimpleIcon from '../components/SimpleIcon';
import {
  getGunlukRaporlarList,
  getGunlukRaporByTarihAralik,
  deleteGunlukRapor,
} from '../api/formsApi';
import { toLocalDateStr, todayStr } from '../utils/dateUtils';

const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const TR_DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const defaultStart = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return toLocalDateStr(d);
};
const today = () => todayStr();
const formatTR = (dateStr) => {
  if (!dateStr) return '';
  const d = dateStr.split('T')[0];
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${TR_MONTHS[parseInt(m) - 1]} ${y}`;
};
const formatTRFull = (dateStr) => {
  if (!dateStr) return '';
  const d = dateStr.split('T')[0];
  const [y, m, day] = d.split('-');
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(day));
  return `${parseInt(day)} ${TR_MONTHS[parseInt(m) - 1]} ${y}, ${TR_DAYS[date.getDay()]}`;
};
const fmt = (v) => {
  if (v === null || v === undefined || v === '' || v === 0) return '—';
  const n = Number(v);
  return isNaN(n) || n === 0 ? '—' : n.toLocaleString('tr-TR');
};

// ── Report Card ──────────────────────────────────────────────
function RaporCard({ item, onPress, onEdit, onDelete }) {
  const totalHammadde = (Number(item.domateslKg) || 0) + (Number(item.biberKg) || 0);
  const totalKutu = (Number(item.kutu112830IcPiyasaAdet) || 0) + (Number(item.kutu112830TuzluIhrAdet) || 0)
    + (Number(item.kutu512830IcPiyasaAdet) || 0) + (Number(item.kutu512830TuzluIhrAdet) || 0)
    + (Number(item.kutu1012830Adet) || 0);

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7}>
      {/* Card Header — Date */}
      <View style={s.cardHeader}>
        <View style={s.cardDateWrap}>
          <SimpleIcon name="event" size={16} color={Colors.brandPrimary} />
          <Text style={s.cardDate}>{formatTRFull(item.raporTarihi)}</Text>
        </View>
        {item.id && <Text style={s.cardIdBadge}>#{item.id}</Text>}
      </View>

      {/* Stats Grid */}
      <View style={s.statsGrid}>
        <View style={[s.statBox, { borderLeftColor: Colors.danger }]}>
          <Text style={s.statLabel}>Domates</Text>
          <Text style={[s.statValue, { color: Colors.danger }]}>{fmt(item.domateslKg)}</Text>
          <Text style={s.statUnit}>kg</Text>
        </View>
        <View style={[s.statBox, { borderLeftColor: Colors.orange }]}>
          <Text style={s.statLabel}>Biber</Text>
          <Text style={[s.statValue, { color: Colors.orange }]}>{fmt(item.biberKg)}</Text>
          <Text style={s.statUnit}>kg</Text>
        </View>
        <View style={[s.statBox, { borderLeftColor: Colors.warning }]}>
          <Text style={s.statLabel}>Elektrik</Text>
          <Text style={[s.statValue, { color: Colors.warning }]}>{fmt(item.elektrikTuketimKw)}</Text>
          <Text style={s.statUnit}>kWh</Text>
        </View>
        <View style={[s.statBox, { borderLeftColor: Colors.brandPrimary }]}>
          <Text style={s.statLabel}>Su</Text>
          <Text style={[s.statValue, { color: Colors.brandPrimary }]}>{fmt(item.suTuketimM3)}</Text>
          <Text style={s.statUnit}>m³</Text>
        </View>
      </View>

      {/* Summary Row */}
      <View style={s.summaryRow}>
        {totalHammadde > 0 && (
          <View style={[s.summaryChip, { backgroundColor: Colors.dangerLight }]}>
            <Text style={[s.summaryChipText, { color: Colors.danger }]}>Hammadde: {totalHammadde.toLocaleString('tr-TR')} kg</Text>
          </View>
        )}
        {totalKutu > 0 && (
          <View style={[s.summaryChip, { backgroundColor: Colors.brandPrimaryLight }]}>
            <Text style={[s.summaryChipText, { color: Colors.brandPrimary }]}>Kutu: {totalKutu.toLocaleString('tr-TR')}</Text>
          </View>
        )}
        {item.lngTuketimKg > 0 && (
          <View style={[s.summaryChip, { backgroundColor: Colors.warningLight }]}>
            <Text style={[s.summaryChipText, { color: Colors.warning }]}>LNG: {fmt(item.lngTuketimKg)} kg</Text>
          </View>
        )}
      </View>

      {/* Card Footer */}
      <View style={s.cardFooter}>
        <View style={s.cardFooterLeft}>
          {item.hazirlayan ? (
            <View style={s.preparedByWrap}>
              <SimpleIcon name="person" size={13} color={Colors.textSecondary} />
              <Text style={s.preparedByText}>{item.hazirlayan}</Text>
            </View>
          ) : null}
        </View>
        <View style={s.cardActions}>
          <TouchableOpacity
            style={s.actionBtnEdit}
            onPress={onEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <SimpleIcon name="edit" size={16} color={Colors.warning} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.actionBtnDel}
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <SimpleIcon name="delete-outline" size={16} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
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

  const [startDate, setStartDate] = useState(defaultStart());
  const [endDate, setEndDate] = useState(today());
  const [showDatePicker, setShowDatePicker] = useState(null);
  const [pendingDate, setPendingDate] = useState(new Date());

  const loadData = useCallback(async () => {
    try {
      setError(null);
      let data = await getGunlukRaporByTarihAralik(startDate, endDate);
      data = Array.isArray(data) ? data : [data].filter(Boolean);
      data.sort((a, b) => (b.raporTarihi || '').localeCompare(a.raporTarihi || ''));
      setRaporlar(data);
    } catch (err) {
      setError(err.message);
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

  const handleDelete = async (id, dateStr) => {
    Alert.alert('Sil', `${formatTR(dateStr)} tarihli raporu silmek istediğinize emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive', onPress: async () => {
          try {
            await deleteGunlukRapor(id);
            setRaporlar(prev => prev.filter(r => r.id !== id));
          } catch (e) {
            Alert.alert('Hata', e.message);
          }
        },
      },
    ]);
  };

  const handleRowPress = (item) => {
    navigation.navigate('GunlukRaporDetay', { rapor: item });
  };

  const handleAdd = () => {
    navigation.navigate('GunlukRaporForm', { rapor: null });
  };

  const openDatePicker = (which) => {
    setPendingDate(new Date(which === 'start' ? startDate : endDate));
    setShowDatePicker(which);
  };
  const handleDateChange = (event, date) => { if (date) setPendingDate(date); };
  const confirmDate = () => {
    const ds = toLocalDateStr(pendingDate);
    if (showDatePicker === 'start') setStartDate(ds);
    else setEndDate(ds);
    setShowDatePicker(null);
  };
  const cancelDate = () => setShowDatePicker(null);

  return (
    <SafeAreaView style={s.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 10, paddingVertical: 4 }} activeOpacity={0.7}>
          <SimpleIcon name="arrow-back-ios" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Günlük Raporlar</Text>
          <Text style={s.headerSubtitle}>{raporlar.length} kayıt</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={handleAdd} activeOpacity={0.8}>
          <SimpleIcon name="add" size={18} color="#fff" />
          <Text style={s.addBtnText}>Ekle</Text>
        </TouchableOpacity>
      </View>

      {/* Date Filter */}
      <View style={s.filterBar}>
        <TouchableOpacity style={s.filterDateBtn} onPress={() => openDatePicker('start')} activeOpacity={0.7}>
          <Text style={s.filterLabel}>Başlangıç</Text>
          <Text style={s.filterValue}>{formatTR(startDate)}</Text>
        </TouchableOpacity>
        <Text style={s.filterDash}>—</Text>
        <TouchableOpacity style={s.filterDateBtn} onPress={() => openDatePicker('end')} activeOpacity={0.7}>
          <Text style={s.filterLabel}>Bitiş</Text>
          <Text style={s.filterValue}>{formatTR(endDate)}</Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={pendingDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            if (event.type === 'dismissed' || !date) { setShowDatePicker(null); return; }
            const ds = toLocalDateStr(date);
            if (showDatePicker === 'start') setStartDate(ds);
            else setEndDate(ds);
            setShowDatePicker(null);
          }}
        />
      )}
      {showDatePicker && Platform.OS === 'ios' && (
        <Modal visible={true} transparent animationType="fade">
          <View style={s.pickerOverlay}>
            <View style={s.pickerSheet}>
              <Text style={s.pickerTitle}>{showDatePicker === 'start' ? 'Başlangıç Tarihi' : 'Bitiş Tarihi'}</Text>
              <DateTimePicker value={pendingDate} mode="date" display="spinner" themeVariant="light" locale="tr" onChange={handleDateChange} style={{ height: 180 }} />
              <View style={s.pickerActions}>
                <TouchableOpacity style={s.pickerCancel} onPress={cancelDate}><Text style={s.pickerCancelText}>İptal</Text></TouchableOpacity>
                <TouchableOpacity style={s.pickerConfirm} onPress={confirmDate}><Text style={s.pickerConfirmText}>Seç</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Content */}
      {loading ? (
        <View style={s.centerWrap}>
          <ActivityIndicator size="large" color={Colors.brandPrimary} />
          <Text style={s.loadingText}>Raporlar yükleniyor...</Text>
        </View>
      ) : error ? (
        <View style={s.centerWrap}>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={onRefresh}><Text style={s.retryBtnText}>Tekrar Dene</Text></TouchableOpacity>
        </View>
      ) : raporlar.length === 0 ? (
        <View style={s.centerWrap}>
          <SimpleIcon name="assignment" size={48} color={Colors.textTertiary} />
          <Text style={s.emptyTitle}>Kayıt Bulunamadı</Text>
          <Text style={s.emptySubtitle}>Seçili tarih aralığında rapor yok</Text>
          <TouchableOpacity style={s.addBtn} onPress={handleAdd} activeOpacity={0.8}>
            <Text style={s.addBtnText}>+ Yeni Rapor</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.cardList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brandPrimary} />}
          showsVerticalScrollIndicator={false}
        >
          {raporlar.map((item) => (
            <RaporCard
              key={item.id}
              item={item}
              onPress={() => handleRowPress(item)}
              onEdit={() => navigation.navigate('GunlukRaporForm', { rapor: item })}
              onDelete={() => handleDelete(item.id, item.raporTarihi)}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgApp },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm, paddingBottom: Spacing.md, backgroundColor: Colors.bgApp,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.brandPrimary, borderRadius: Radius.sm,
    paddingHorizontal: 14, paddingVertical: 8, ...Shadows.sm,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Filter
  filterBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, gap: 8 },
  filterDateBtn: {
    flex: 1, backgroundColor: Colors.bgWhite, borderRadius: Radius.sm,
    padding: Spacing.sm, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight,
  },
  filterLabel: { fontSize: 9, fontWeight: '600', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.3 },
  filterValue: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginTop: 1 },
  filterDash: { fontSize: 14, color: Colors.textTertiary, fontWeight: '600' },

  // Date picker
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  pickerSheet: { backgroundColor: Colors.bgWhite, borderRadius: Radius.lg, padding: Spacing.lg, width: '85%', maxWidth: 360 },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', paddingVertical: Spacing.sm },
  pickerActions: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  pickerCancel: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: Radius.sm, backgroundColor: Colors.bgSurface },
  pickerCancelText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
  pickerConfirm: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: Radius.sm, backgroundColor: Colors.brandPrimary },
  pickerConfirmText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Card List
  cardList: { paddingHorizontal: Spacing.lg, paddingBottom: 24, gap: 12 },

  // Card
  card: {
    backgroundColor: Colors.bgWhite, borderRadius: Radius.lg,
    padding: 0, overflow: 'hidden',
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  cardDateWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardDate: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  cardIdBadge: {
    fontSize: 11, fontWeight: '700', color: Colors.brandPrimary,
    backgroundColor: Colors.brandPrimaryLight, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.round, overflow: 'hidden',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4,
    gap: 8,
  },
  statBox: {
    width: '47%', backgroundColor: Colors.bgSurface, borderRadius: Radius.sm,
    borderLeftWidth: 3, paddingVertical: 10, paddingHorizontal: 12,
  },
  statLabel: { fontSize: 11, fontWeight: '500', color: Colors.textSecondary, marginBottom: 2 },
  statValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  statUnit: { fontSize: 10, fontWeight: '600', color: Colors.textTertiary, marginTop: 1 },

  // Summary Chips
  summaryRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, paddingVertical: 8, gap: 6,
  },
  summaryChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.round,
  },
  summaryChipText: { fontSize: 11, fontWeight: '700' },

  // Card Footer
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 0.5, borderTopColor: Colors.borderLight,
  },
  cardFooterLeft: { flex: 1 },
  preparedByWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  preparedByText: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtnEdit: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.warningLight, alignItems: 'center', justifyContent: 'center',
  },
  actionBtnDel: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.dangerLight, alignItems: 'center', justifyContent: 'center',
  },

  // States
  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: Colors.brandPrimary, fontWeight: '500' },
  errorText: { fontSize: 14, color: Colors.danger, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { backgroundColor: Colors.brandPrimary, borderRadius: Radius.md, paddingHorizontal: 24, paddingVertical: 10 },
  retryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary },
});
