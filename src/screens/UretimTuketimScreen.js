import React, { useState, useContext, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Modal, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import SimpleIcon from '../components/SimpleIcon';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';
import { DropdownSelector, Chip, EmptyState } from '../components/ui';
import { FilterIcon, ChevronDownIcon, ChevronUpIcon, FactoryIcon } from '../components/Icons';
import { AppDataContext } from '../context/AppDataContext';
import { getUretimOzeti, getTuketimOzeti } from '../api/apiService';

const fmt = (n) => {
  if (n == null || isNaN(n)) return '0';
  return Number(n).toLocaleString('tr-TR', { maximumFractionDigits: 3 });
};

const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const formatTR = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d)} ${TR_MONTHS[parseInt(m) - 1]} ${y}`;
};

export default function UretimTuketimScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { selectedFabrika, istasyonlar } = useContext(AppDataContext);

  const [uretimData, setUretimData] = useState([]);
  const [tuketimData, setTuketimData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [fetched, setFetched] = useState(false);

  // Filters (same pattern as GunlukUretimler)
  const todayStr = new Date().toISOString().split('T')[0];
  const [filters, setFilters] = useState({ hatKodu: '', startDate: todayStr, endDate: todayStr });
  const [showFilters, setShowFilters] = useState(false);
  const [showHatPicker, setShowHatPicker] = useState(false);

  // Date picker — pendingDate pattern
  const [showDatePicker, setShowDatePicker] = useState(null);
  const [pendingDate, setPendingDate] = useState(null);
  const [pendingDateField, setPendingDateField] = useState(null);

  const factoryNo = selectedFabrika?.fabrikaKodu ?? 2;

  // Hat dropdown options
  const hatOptions = useMemo(() => [
    { key: 'all', value: '', label: 'Tüm Hatlar' },
    ...(istasyonlar || []).map(ist => ({
      key: ist.istasyonKodu,
      value: ist.istasyonKodu,
      label: `${ist.istasyonAdi} (${ist.istasyonKodu})`,
    })),
  ], [istasyonlar]);

  const selectedHatLabel = filters.hatKodu
    ? (istasyonlar || []).find(i => i.istasyonKodu === filters.hatKodu)?.istasyonAdi || filters.hatKodu
    : '';

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const params = { factoryNo };
    if (filters.startDate) params.startDateTime = new Date(filters.startDate).toISOString();
    if (filters.endDate) params.endDateTime = new Date(filters.endDate).toISOString();
    if (filters.hatKodu) params.hatKodu = filters.hatKodu;

    try {
      const [uretim, tuketim] = await Promise.all([getUretimOzeti(params), getTuketimOzeti(params)]);
      setUretimData(Array.isArray(uretim) ? uretim : []);
      setTuketimData(Array.isArray(tuketim) ? tuketim : []);
      setFetched(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [factoryNo, filters]);

  const handleFilter = () => {
    fetchData();
    setShowFilters(false);
  };

  const handleReset = () => {
    setFilters({ hatKodu: '', startDate: todayStr, endDate: todayStr });
    setShowHatPicker(false);
    setUretimData([]); setTuketimData([]); setFetched(false); setError(null);
    setShowFilters(false);
  };

  // Date picker handlers — same as GunlukUretimler
  const openDatePicker = (field) => {
    setPendingDateField(field);
    setPendingDate(new Date());
    setShowDatePicker(field);
  };
  const handleDatePickerChange = (_, date) => { if (date) setPendingDate(date); };
  const handleDateConfirm = () => {
    if (pendingDate && pendingDateField) {
      setFilters(prev => ({ ...prev, [pendingDateField]: pendingDate.toISOString().split('T')[0] }));
    }
    setShowDatePicker(null);
    setPendingDate(null);
    setPendingDateField(null);
  };
  const handleDateCancel = () => {
    setShowDatePicker(null);
    setPendingDate(null);
    setPendingDateField(null);
  };

  // Stats
  const uStats = useMemo(() => {
    let total = 0;
    uretimData.forEach(i => { total += Number(i.toplamUretimMiktari) || 0; });
    return { count: uretimData.length, total };
  }, [uretimData]);

  const tStats = useMemo(() => {
    let total = 0;
    tuketimData.forEach(i => { total += Number(i.toplamTuketimMiktari) || 0; });
    return { count: tuketimData.length, total };
  }, [tuketimData]);

  const hasActiveFilters = filters.hatKodu || filters.startDate || filters.endDate;

  // ─── Table Row Components ──────────────────────────────
  const UretimRow = ({ item, index, isLast }) => (
    <View style={[st.row, isLast && st.rowLast]}>
      <View style={st.rowNum}><Text style={st.rowNumTxt}>{index + 1}</Text></View>
      <View style={st.rowBody}>
        <Text style={st.rowTitle} numberOfLines={2}>{item.urunAdi || '-'}</Text>
        <View style={st.rowMeta}>
          {item.urunKodu ? <Text style={st.tag}>{item.urunKodu}</Text> : null}
          {item.hatKodu ? <Text style={st.tag}>{item.hatKodu}{item.hatAdi ? ` · ${item.hatAdi}` : ''}</Text> : null}
          {item.birim ? <Text style={st.tag}>{item.birim}</Text> : null}
        </View>
        <View style={st.rowBottom}>
          <Text style={st.rowLabel}>Toplam Üretim</Text>
          <Text style={st.rowVal}>{fmt(item.toplamUretimMiktari)}</Text>
        </View>
      </View>
    </View>
  );

  const TuketimRow = ({ item, index, isLast }) => (
    <View style={[st.row, isLast && st.rowLast]}>
      <View style={st.rowNum}><Text style={st.rowNumTxt}>{index + 1}</Text></View>
      <View style={st.rowBody}>
        <Text style={st.rowTitle} numberOfLines={2}>{item.stokAdi || '-'}</Text>
        <View style={st.rowMeta}>
          {item.stokKodu ? <Text style={st.tag}>{item.stokKodu}</Text> : null}
          {item.hatKodu ? <Text style={st.tag}>{item.hatKodu}{item.hatAdi ? ` · ${item.hatAdi}` : ''}</Text> : null}
          {item.birim ? <Text style={st.tag}>{item.birim}</Text> : null}
        </View>
        {item.uretimUrunAdi ? (
          <View style={st.linkedBox}>
            <Text style={st.linkedLabel}>Üretim Ürünü</Text>
            <Text style={st.linkedVal} numberOfLines={1}>{item.uretimUrunAdi}{item.uretimUrunKodu ? ` (${item.uretimUrunKodu})` : ''}</Text>
          </View>
        ) : null}
        <View style={st.rowBottom}>
          <Text style={st.rowLabel}>Toplam Tüketim</Text>
          <Text style={[st.rowVal, { color: '#B91C1C' }]}>{fmt(item.toplamTuketimMiktari)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={st.container}>
      {/* ── Header (same as GunlukUretimler) ── */}
      <View style={[st.header, { paddingTop: insets.top }]}>
        <View style={st.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4, marginRight: 8 }}>
            <SimpleIcon name="arrow-back-ios" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[st.pageTitle, { flex: 1 }]}>Üretim ve Tüketimler</Text>
          <Chip label={selectedFabrika?.fabrikaAdi} size="sm" />
        </View>
      </View>

      {/* ── Filter Section (same as GunlukUretimler) ── */}
      <View style={st.filterSection}>
        <TouchableOpacity
          style={st.filterToggle}
          onPress={() => setShowFilters(!showFilters)}
          activeOpacity={0.7}
        >
          <View style={st.filterToggleLeft}>
            <FilterIcon size={16} color={Colors.textPrimary} />
            <Text style={st.filterToggleText}>Filtreler</Text>
            {hasActiveFilters ? <View style={st.filterActiveDot} /> : null}
          </View>
          {showFilters ? <ChevronUpIcon size={12} color={Colors.textTertiary} /> : <ChevronDownIcon size={12} color={Colors.textTertiary} />}
        </TouchableOpacity>

        {showFilters && (
          <View style={st.filterContent}>
            <DropdownSelector
              label="HAT"
              value={selectedHatLabel}
              placeholder="Tüm Hatlar"
              isOpen={showHatPicker}
              onToggle={() => setShowHatPicker(!showHatPicker)}
              options={hatOptions}
              selectedValue={filters.hatKodu}
              onSelect={(val) => { setFilters(prev => ({ ...prev, hatKodu: val })); setShowHatPicker(false); }}
            />

            {/* Date Range */}
            <View style={st.dateGrid}>
              <TouchableOpacity style={st.dateBtn} onPress={() => openDatePicker('startDate')}>
                <Text style={st.dateBtnLabel}>BAŞLANGIÇ</Text>
                <Text style={[st.dateBtnValue, !filters.startDate && st.dateBtnPlaceholder]}>
                  {filters.startDate ? formatTR(filters.startDate) : 'Tarih'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.dateBtn} onPress={() => openDatePicker('endDate')}>
                <Text style={st.dateBtnLabel}>BİTİŞ</Text>
                <Text style={[st.dateBtnValue, !filters.endDate && st.dateBtnPlaceholder]}>
                  {filters.endDate ? formatTR(filters.endDate) : 'Tarih'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Date Picker */}
            {showDatePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={pendingDate || new Date()}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  if (event.type === 'dismissed' || !date) {
                    setShowDatePicker(null);
                    setPendingDate(null);
                    setPendingDateField(null);
                    return;
                  }
                  setFilters(prev => ({ ...prev, [pendingDateField]: date.toISOString().split('T')[0] }));
                  setShowDatePicker(null);
                  setPendingDate(null);
                  setPendingDateField(null);
                }}
              />
            )}
            {showDatePicker && Platform.OS === 'ios' && (
            <Modal visible={true} transparent animationType="fade">
              <View style={st.pickerModalOverlay}>
                <View style={st.pickerModalSheet}>
                  <DateTimePicker
                    value={pendingDate || new Date()}
                    mode="date"
                    display="spinner"
                    themeVariant="light"
                    locale="tr"
                    onChange={handleDatePickerChange}
                  />
                  <View style={st.datePickerActions}>
                    <TouchableOpacity style={st.datePickerCancel} onPress={handleDateCancel}>
                      <Text style={st.datePickerCancelText}>İptal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={st.datePickerConfirm} onPress={handleDateConfirm}>
                      <Text style={st.datePickerConfirmText}>Seç</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
            )}

            <View style={st.filterBtnRow}>
              <TouchableOpacity style={st.filterBtn} onPress={handleFilter} activeOpacity={0.7}>
                <Text style={st.filterBtnText}>Ara</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.resetBtn} onPress={handleReset} activeOpacity={0.7}>
                <Text style={st.resetBtnText}>Sıfırla</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ── Content ── */}
      {loading && !refreshing ? (
        <View style={st.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.brandPrimary} />
          <Text style={st.loadingTxt}>Yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={st.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={Colors.brandPrimary} />}
        >
          {/* Hata */}
          {error ? (
            <View style={st.errorBox}>
              <Text style={st.errorTxt}>{error}</Text>
              <TouchableOpacity onPress={() => fetchData()}>
                <Text style={st.retryTxt}>Tekrar Dene</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* ── ÜRETİM ÖZETİ ── */}
          {fetched && !error && (
            <View style={st.section}>
              <View style={st.sectionHead}>
                <Text style={st.sectionTitle}>ÜRETİM ÖZETİ</Text>
                {uretimData.length > 0 && (
                  <Text style={st.sectionSummary}>{uStats.count} kayıt · Toplam: {fmt(uStats.total)}</Text>
                )}
              </View>
              <View style={st.tableCard}>
                {uretimData.length > 0 ? (
                  <>
                    <View style={st.tableHeader}>
                      <Text style={[st.thTxt, { width: 28 }]}>#</Text>
                      <Text style={[st.thTxt, { flex: 1 }]}>Bilgi</Text>
                      <Text style={[st.thTxt, { width: 90, textAlign: 'right' }]}>Miktar</Text>
                    </View>
                    {uretimData.map((item, i) => (
                      <UretimRow key={i} item={item} index={i} isLast={i === uretimData.length - 1} />
                    ))}
                  </>
                ) : (
                  <View style={st.emptyRow}>
                    <Text style={st.emptyTxt}>Üretim kaydı bulunamadı</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ── TÜKETİM ÖZETİ ── */}
          {fetched && !error && (
            <View style={st.section}>
              <View style={st.sectionHead}>
                <Text style={st.sectionTitle}>TÜKETİM ÖZETİ</Text>
                {tuketimData.length > 0 && (
                  <Text style={st.sectionSummary}>{tStats.count} kayıt · Toplam: {fmt(tStats.total)}</Text>
                )}
              </View>
              <View style={st.tableCard}>
                {tuketimData.length > 0 ? (
                  <>
                    <View style={st.tableHeader}>
                      <Text style={[st.thTxt, { width: 28 }]}>#</Text>
                      <Text style={[st.thTxt, { flex: 1 }]}>Bilgi</Text>
                      <Text style={[st.thTxt, { width: 90, textAlign: 'right' }]}>Miktar</Text>
                    </View>
                    {tuketimData.map((item, i) => (
                      <TuketimRow key={i} item={item} index={i} isLast={i === tuketimData.length - 1} />
                    ))}
                  </>
                ) : (
                  <View style={st.emptyRow}>
                    <Text style={st.emptyTxt}>Tüketim kaydı bulunamadı</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Başlangıç durumu */}
          {!fetched && !loading && !error && (
            <View style={st.initWrap}>
              <SimpleIcon name="assessment" size={32} color={Colors.textTertiary} />
              <Text style={st.initTitle}>Rapor Özetleri</Text>
              <Text style={st.initSub}>Filtrelerden tarih seçip "Ara" butonuna basın</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgApp },

  // Header — same as GunlukUretimler
  header: {
    backgroundColor: Colors.bgWhite,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  pageTitle: { ...Typography.title1 },

  // Filter — same as GunlukUretimler
  filterSection: {
    backgroundColor: Colors.bgWhite,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  filterToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  filterToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  filterActiveDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.brandPrimary,
  },
  filterContent: {
    marginTop: Spacing.sm,
  },
  dateGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  dateBtn: {
    flex: 1,
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  dateBtnLabel: {
    ...Typography.caption1,
    fontSize: 9,
    marginBottom: 3,
    color: Colors.textPrimary,
  },
  dateBtnValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  dateBtnPlaceholder: {
    color: Colors.textSecondary,
  },
  filterBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  filterBtn: {
    flex: 1,
    backgroundColor: Colors.brandPrimary,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  filterBtnText: { color: Colors.textWhite, fontWeight: '600', fontSize: 14 },
  resetBtn: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: { color: Colors.textSecondary, fontWeight: '500', fontSize: 14 },

  // Date Picker Modal — same as GunlukUretimler
  pickerModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  pickerModalSheet: { backgroundColor: Colors.bgWhite, borderRadius: Radius.lg, padding: Spacing.lg, width: '85%', maxWidth: 360 },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
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

  // Content
  scrollContent: { padding: Spacing.lg },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingTxt: { fontSize: 14, color: Colors.textSecondary },

  // Error
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FEF2F2', borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#FECACA',
  },
  errorTxt: { flex: 1, fontSize: 12, color: '#B91C1C' },
  retryTxt: { fontSize: 12, fontWeight: '600', color: Colors.brandPrimary },

  // Section
  section: { marginBottom: Spacing.lg },
  sectionHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    marginBottom: Spacing.xs, paddingHorizontal: 2,
  },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.5 },
  sectionSummary: { fontSize: 11, color: Colors.textTertiary },

  // Table card
  tableCard: {
    backgroundColor: Colors.bgWhite, borderRadius: Radius.md, overflow: 'hidden',
    ...Shadows.sm,
  },
  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgSurface, paddingVertical: 8, paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight,
  },
  thTxt: { fontSize: 10, fontWeight: '600', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.3 },

  // Row
  row: {
    flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight,
  },
  rowLast: { borderBottomWidth: 0 },
  rowNum: { width: 28, paddingTop: 2 },
  rowNumTxt: { fontSize: 12, fontWeight: '600', color: Colors.textTertiary },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, lineHeight: 18, marginBottom: 4 },
  rowMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 },
  tag: {
    fontSize: 10, fontWeight: '500', color: Colors.textSecondary,
    backgroundColor: Colors.bgSurface, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3,
    overflow: 'hidden',
  },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 11, color: Colors.textTertiary },
  rowVal: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },

  // Linked product (tüketim)
  linkedBox: {
    backgroundColor: Colors.bgSurface, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 5,
    marginBottom: 6,
  },
  linkedLabel: { fontSize: 9, fontWeight: '600', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.3 },
  linkedVal: { fontSize: 11, fontWeight: '500', color: Colors.textSecondary, marginTop: 1 },

  // Empty
  emptyRow: { paddingVertical: 24, alignItems: 'center' },
  emptyTxt: { fontSize: 13, color: Colors.textTertiary },

  // Init
  initWrap: { alignItems: 'center', paddingTop: 80, gap: 6 },
  initTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  initSub: { fontSize: 13, color: Colors.textSecondary },
});
