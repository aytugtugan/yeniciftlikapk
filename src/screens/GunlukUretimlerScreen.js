import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  RefreshControl,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';
import { ScreenHeader, Chip, EmptyState, SectionCard, DropdownSelector } from '../components/ui';
import { CalendarIcon, FactoryIcon, FilterIcon, ChevronDownIcon, ChevronUpIcon } from '../components/Icons';
import SimpleIcon from '../components/SimpleIcon';
import { getGunlukUretimler } from '../api/apiService';

const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const formatTR = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d)} ${TR_MONTHS[parseInt(m) - 1]} ${y}`;
};

function ProductionRow({ u, isLast }) {
  return (
    <View style={[styles.prodRow, !isLast && styles.prodRowBorder]}>
      <View style={styles.prodTimeCol}>
        <Text style={styles.prodTime}>{u.saatDakika || '--:--'}</Text>
      </View>
      <View style={styles.prodInfoCol}>
        <Text style={styles.prodName} numberOfLines={1}>{u.urunAdi}</Text>
        <Text style={styles.prodCode}>{u.urunKodu}</Text>
      </View>
      <View style={styles.prodQtyCol}>
        <Text style={styles.prodQty}>{u.miktar?.toLocaleString('tr-TR')}</Text>
      </View>
    </View>
  );
}

const STATION_COLORS = [
  { bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8' },
  { bg: '#F0FDF4', border: '#22C55E', text: '#15803D' },
  { bg: '#FFF7ED', border: '#F97316', text: '#C2410C' },
  { bg: '#FAF5FF', border: '#A855F7', text: '#7E22CE' },
  { bg: '#FDF2F8', border: '#EC4899', text: '#BE185D' },
  { bg: '#ECFDF5', border: '#10B981', text: '#047857' },
  { bg: '#FEF3C7', border: '#F59E0B', text: '#B45309' },
  { bg: '#E0F2FE', border: '#0EA5E9', text: '#0369A1' },
];

function StationSection({ stationName, stationCode, items, totalMiktar, colorIndex }) {
  const palette = STATION_COLORS[colorIndex % STATION_COLORS.length];
  return (
    <View style={styles.stationSection}>
      {/* Station Header */}
      <View style={[styles.stationHeader, { backgroundColor: palette.bg, borderLeftColor: palette.border }]}>
        <View style={styles.stationHeaderLeft}>
          <View style={[styles.stationIcon, { backgroundColor: palette.border }]}>
            <Text style={styles.stationIconText}>{(stationCode || '?').charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.stationName, { color: palette.text }]}>{stationName}</Text>
            <Text style={styles.stationCode}>{stationCode}</Text>
          </View>
        </View>
        <View style={styles.stationHeaderRight}>
          <Text style={[styles.stationTotal, { color: palette.text }]}>{totalMiktar.toLocaleString('tr-TR')}</Text>
          <Text style={styles.stationCount}>{items.length} kayıt</Text>
        </View>
      </View>
      {/* Production Table */}
      <View style={styles.prodTable}>
        <View style={styles.prodTableHeader}>
          <View style={styles.prodTimeCol}><Text style={styles.prodTableHeaderText}>SAAT</Text></View>
          <View style={styles.prodInfoCol}><Text style={styles.prodTableHeaderText}>ÜRÜN</Text></View>
          <View style={styles.prodQtyCol}><Text style={[styles.prodTableHeaderText, { textAlign: 'right' }]}>MİKTAR</Text></View>
        </View>
        {items.map((u, idx) => (
          <ProductionRow key={idx} u={u} isLast={idx === items.length - 1} />
        ))}
      </View>
    </View>
  );
}

function SummaryItem({ ozet }) {
  return (
    <View style={styles.summaryItem}>
      <View style={{ flex: 1 }}>
        <Text style={styles.summaryStation}>{ozet.istasyonAdi}</Text>
        <Text style={styles.summaryProduct}>{ozet.urunAdi}</Text>
      </View>
      <View style={styles.summaryRight}>
        <Text style={styles.summaryTotal}>{ozet.toplam.toLocaleString('tr-TR')}</Text>
        <Text style={styles.summaryCount}>{ozet.kayitSayisi} kayıt</Text>
      </View>
    </View>
  );
}

export default function GunlukUretimlerScreen({ fabrika, istasyonlar }) {
  const navigation = useNavigation();
  const [uretimler, setUretimler] = useState([]);
  const [summaryUretimler, setSummaryUretimler] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const todayStr = new Date().toISOString().split('T')[0];
  const [filters, setFilters] = useState({
    istasyonKodu: '', startDate: todayStr, endDate: todayStr, startTime: '', endTime: '',
  });
  const [showIstasyonPicker, setShowIstasyonPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(null);
  const [showSummary, setShowSummary] = useState(true);
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'summary'
  const [showFilters, setShowFilters] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryLoaded, setSummaryLoaded] = useState(false);

  const sortUretimler = (arr) =>
    arr.slice().sort((a, b) => {
      try {
        const aDate = new Date((a.tarih || '') + 'T' + (a.saatDakika || '00:00'));
        const bDate = new Date((b.tarih || '') + 'T' + (b.saatDakika || '00:00'));
        return bDate.getTime() - aDate.getTime();
      } catch { return 0; }
    });

  const fetchUretimler = (pageNum = 1, isRefresh = false) => {
    if (!fabrika) return;
    isRefresh ? setRefreshing(true) : setLoading(true);

    const baseParams = { fabrikaNo: fabrika.fabrikaKodu };
    if (filters.istasyonKodu) baseParams.istasyonKodu = filters.istasyonKodu;
    if (filters.startDate) baseParams.startDate = filters.startDate;
    if (filters.endDate) baseParams.endDate = filters.endDate;
    if (filters.startTime) baseParams.startTime = filters.startTime;
    if (filters.endTime) baseParams.endTime = filters.endTime;

    const paginatedParams = { ...baseParams, page: pageNum, pageSize };

    getGunlukUretimler(paginatedParams)
      .then(pageData => {
        const pageRows = pageData.data || [];
        setUretimler(sortUretimler(pageRows));
        setTotal(pageData.total || 0);
        setPage(pageData.page || pageNum);
      })
      .catch(err => console.error(err))
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  const fetchSummary = () => {
    if (!fabrika || summaryLoaded || summaryLoading) return;
    setSummaryLoading(true);
    const baseParams = { fabrikaNo: fabrika.fabrikaKodu };
    if (filters.istasyonKodu) baseParams.istasyonKodu = filters.istasyonKodu;
    if (filters.startDate) baseParams.startDate = filters.startDate;
    if (filters.endDate) baseParams.endDate = filters.endDate;
    if (filters.startTime) baseParams.startTime = filters.startTime;
    if (filters.endTime) baseParams.endTime = filters.endTime;

    getGunlukUretimler(baseParams)
      .then(data => {
        const allRows = data.data || (Array.isArray(data) ? data : []);
        setSummaryUretimler(allRows);
        setSummaryLoaded(true);
      })
      .catch(err => console.error(err))
      .finally(() => setSummaryLoading(false));
  };

  useEffect(() => {
    fetchUretimler(1);
    // Auto-fetch summary for KPI cards
    setSummaryLoaded(false);
    setSummaryUretimler([]);
  }, [fabrika]);

  // Fetch summary data for KPI and Özet tab
  useEffect(() => {
    if (!summaryLoaded && !summaryLoading && fabrika) {
      fetchSummary();
    }
  }, [fabrika, summaryLoaded, summaryLoading]);

  const handleFilter = () => {
    setSummaryLoaded(false);
    setSummaryUretimler([]);
    fetchUretimler(1);
    setShowFilters(false);
  };
  const handleReset = () => {
    setFilters({ istasyonKodu: '', startDate: todayStr, endDate: todayStr, startTime: '', endTime: '' });
    setShowIstasyonPicker(false);
    setSummaryLoaded(false);
    setSummaryUretimler([]);
    setShowFilters(false);
    setTimeout(() => fetchUretimler(1), 0);
  };

  const totalPages = Math.ceil(total / pageSize);

  const gunlukToplam = {};
  summaryUretimler.forEach(u => {
    const key = `${u.istasyonKodu}_${u.urunKodu}`;
    if (!gunlukToplam[key]) {
      gunlukToplam[key] = {
        istasyonAdi: u.istasyonAdi, istasyonKodu: u.istasyonKodu,
        urunAdi: u.urunAdi, urunKodu: u.urunKodu, toplam: 0, kayitSayisi: 0,
      };
    }
    gunlukToplam[key].toplam += u.miktar;
    gunlukToplam[key].kayitSayisi += 1;
  });

  const selectedIstasyonLabel = filters.istasyonKodu
    ? istasyonlar.find(i => i.istasyonKodu === filters.istasyonKodu)?.istasyonAdi || filters.istasyonKodu
    : '';

  const istasyonOptions = [
    { key: 'all', value: '', label: 'Tüm İstasyonlar' },
    ...istasyonlar.map(ist => ({ key: ist.istasyonKodu, value: ist.istasyonKodu, label: `${ist.istasyonAdi} (${ist.istasyonKodu})` })),
  ];

  const [pendingDate, setPendingDate] = useState(null);
  const [pendingDateField, setPendingDateField] = useState(null);

  const handleDatePickerChange = (event, date) => {
    if (date) {
      setPendingDate(date);
    }
  };

  const handleDateConfirm = () => {
    if (pendingDate && pendingDateField) {
      if (pendingDateField === 'startDate' || pendingDateField === 'endDate') {
        setFilters(prev => ({ ...prev, [pendingDateField]: pendingDate.toISOString().split('T')[0] }));
      } else {
        const hours = String(pendingDate.getHours()).padStart(2, '0');
        const mins = String(pendingDate.getMinutes()).padStart(2, '0');
        setFilters(prev => ({ ...prev, [pendingDateField]: `${hours}:${mins}` }));
      }
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

  const openDatePicker = (field) => {
    setPendingDateField(field);
    setPendingDate(new Date());
    setShowDatePicker(field);
  };

  const summaryEntries = Object.values(gunlukToplam);
  const totalMiktar = summaryUretimler.reduce((s, u) => s + (u.miktar || 0), 0);
  const displayGroupCount = summaryEntries.length;

  // Group details by station
  const groupedByStation = React.useMemo(() => {
    const groups = {};
    uretimler.forEach(u => {
      const key = u.istasyonKodu || 'other';
      if (!groups[key]) {
        groups[key] = { stationName: u.istasyonAdi || 'Bilinmiyor', stationCode: u.istasyonKodu || '-', items: [], totalMiktar: 0 };
      }
      groups[key].items.push(u);
      groups[key].totalMiktar += u.miktar || 0;
    });
    return Object.values(groups);
  }, [uretimler]);

  const ListHeader = () => (
    <View>
      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <View style={styles.qStatItem}>
          <Text style={styles.qStatValue}>{total.toLocaleString('tr-TR')}</Text>
          <Text style={styles.qStatLabel}>Kayıt</Text>
        </View>
        <View style={styles.qStatDivider} />
        <View style={styles.qStatItem}>
          <Text style={styles.qStatValue}>{displayGroupCount}</Text>
          <Text style={styles.qStatLabel}>Ürün Grubu</Text>
        </View>
        <View style={styles.qStatDivider} />
        <View style={styles.qStatItem}>
          <Text style={[styles.qStatValue, { color: Colors.brandPrimary }]}>
            {totalMiktar.toLocaleString('tr-TR')}
          </Text>
          <Text style={styles.qStatLabel}>Toplam Üretim</Text>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'details' && styles.tabActive]}
          onPress={() => setActiveTab('details')}
        >
          <Text style={[styles.tabText, activeTab === 'details' && styles.tabTextActive]}>Detaylar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'summary' && styles.tabActive]}
          onPress={() => setActiveTab('summary')}
        >
          <Text style={[styles.tabText, activeTab === 'summary' && styles.tabTextActive]}>
            Özet ({summaryEntries.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary Grid (when summary tab) */}
      {activeTab === 'summary' && summaryLoading && (
        <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
          <ActivityIndicator size="small" color={Colors.brandPrimary} />
          <Text style={styles.loadingText}>Özet yükleniyor...</Text>
        </View>
      )}
      {activeTab === 'summary' && !summaryLoading && summaryEntries.length > 0 && (
        <View style={styles.summaryGrid}>
          {summaryEntries.map((ozet, idx) => (
            <SummaryItem key={idx} ozet={ozet} />
          ))}
        </View>
      )}

      {/* Detail section header */}
      {activeTab === 'details' && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Üretim Kayıtları</Text>
          <Chip
            label={`Sayfa ${page}/${totalPages || 1}`}
            size="sm"
            color={Colors.textSecondary}
            bgColor={Colors.bgSurface}
          />
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4, marginRight: 8 }}>
            <SimpleIcon name="arrow-back-ios" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.pageTitle, { flex: 1 }]}>Günlük Üretimler</Text>
          <Chip label={fabrika?.fabrikaAdi} size="sm" />
        </View>
      </View>

      {/* Filter Section */}
      <View style={styles.filterSection}>
        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => setShowFilters(!showFilters)}
          activeOpacity={0.7}
        >
          <View style={styles.filterToggleLeft}>
            <FilterIcon size={16} color={Colors.textPrimary} />
            <Text style={styles.filterToggleText}>Filtreler</Text>
            {(filters.istasyonKodu || filters.startDate || filters.endDate || filters.startTime || filters.endTime) ? (
              <View style={styles.filterActiveDot} />
            ) : null}
          </View>
          {showFilters ? <ChevronUpIcon size={12} color={Colors.textTertiary} /> : <ChevronDownIcon size={12} color={Colors.textTertiary} />}
        </TouchableOpacity>

        {showFilters && (
          <View style={styles.filterContent}>
            <DropdownSelector
          label="İSTASYON"
          value={selectedIstasyonLabel}
          placeholder="Tüm İstasyonlar"
          isOpen={showIstasyonPicker}
          onToggle={() => setShowIstasyonPicker(!showIstasyonPicker)}
          options={istasyonOptions}
          selectedValue={filters.istasyonKodu}
          onSelect={(val) => { setFilters(prev => ({ ...prev, istasyonKodu: val })); setShowIstasyonPicker(false); }}
        />

        {/* Date Range */}
        <View style={styles.dateGrid}>
          <TouchableOpacity style={styles.dateBtn} onPress={() => openDatePicker('startDate')}>
            <Text style={styles.dateBtnLabel}>BAŞLANGIÇ</Text>
            <Text style={[styles.dateBtnValue, !filters.startDate && styles.dateBtnPlaceholder]}>
              {filters.startDate ? formatTR(filters.startDate) : 'Tarih'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateBtn} onPress={() => openDatePicker('endDate')}>
            <Text style={styles.dateBtnLabel}>BİTİŞ</Text>
            <Text style={[styles.dateBtnValue, !filters.endDate && styles.dateBtnPlaceholder]}>
              {filters.endDate ? formatTR(filters.endDate) : 'Tarih'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dateGrid}>
          <TouchableOpacity style={styles.dateBtn} onPress={() => openDatePicker('startTime')}>
            <Text style={styles.dateBtnLabel}>BAŞLANGIÇ SAATİ</Text>
            <Text style={[styles.dateBtnValue, !filters.startTime && styles.dateBtnPlaceholder]}>
              {filters.startTime || 'Saat'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateBtn} onPress={() => openDatePicker('endTime')}>
            <Text style={styles.dateBtnLabel}>BİTİŞ SAATi</Text>
            <Text style={[styles.dateBtnValue, !filters.endTime && styles.dateBtnPlaceholder]}>
              {filters.endTime || 'Saat'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterBtnRow}>
          <TouchableOpacity style={styles.filterBtn} onPress={handleFilter} activeOpacity={0.7}>
            <Text style={styles.filterBtnText}>Ara</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.7}>
            <Text style={styles.resetBtnText}>Sıfırla</Text>
          </TouchableOpacity>
        </View>
          </View>
        )}
      </View>

      {/* Content */}
      {/* Date/Time Picker - rendered OUTSIDE FlatList to prevent scroll freeze */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={pendingDate || new Date()}
          mode={showDatePicker && showDatePicker.includes('Time') ? 'time' : 'date'}
          display="default"
          is24Hour={true}
          onChange={(event, date) => {
            if (event.type === 'dismissed' || !date) {
              setShowDatePicker(null);
              setPendingDate(null);
              setPendingDateField(null);
              return;
            }
            if (pendingDateField === 'startDate' || pendingDateField === 'endDate') {
              setFilters(prev => ({ ...prev, [pendingDateField]: date.toISOString().split('T')[0] }));
            } else {
              const hours = String(date.getHours()).padStart(2, '0');
              const mins = String(date.getMinutes()).padStart(2, '0');
              setFilters(prev => ({ ...prev, [pendingDateField]: `${hours}:${mins}` }));
            }
            setShowDatePicker(null);
            setPendingDate(null);
            setPendingDateField(null);
          }}
        />
      )}
      {showDatePicker && Platform.OS === 'ios' && (
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalSheet}>
              <Text style={styles.pickerModalTitle}>
                {showDatePicker.includes('Time') ? 'Saat Seçin' : 'Tarih Seçin'}
              </Text>
              <DateTimePicker
                value={pendingDate || new Date()}
                mode={showDatePicker && showDatePicker.includes('Time') ? 'time' : 'date'}
                display="spinner"
                themeVariant="light"
                locale="tr"
                is24Hour={true}
                onChange={handleDatePickerChange}
                style={{ height: 180 }}
              />
              <View style={styles.datePickerActions}>
                <TouchableOpacity style={styles.datePickerCancel} onPress={handleDateCancel}>
                  <Text style={styles.datePickerCancelText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.datePickerConfirm} onPress={handleDateConfirm}>
                  <Text style={styles.datePickerConfirmText}>Seç</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.brandPrimary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={activeTab === 'details' ? groupedByStation : []}
          keyExtractor={(item, idx) => item.stationCode + idx}
          renderItem={({ item, index }) => (
            <StationSection
              stationName={item.stationName}
              stationCode={item.stationCode}
              items={item.items}
              totalMiktar={item.totalMiktar}
              colorIndex={index}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            activeTab === 'details' ? (
              <EmptyState icon={<FactoryIcon size={28} color={Colors.textTertiary} />} title="Kayıt bulunamadı" subtitle="Filtre değerlerini kontrol edin" />
            ) : null
          }
          ListFooterComponent={
            activeTab === 'details' && totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                  disabled={page <= 1}
                  onPress={() => fetchUretimler(page - 1)}
                >
                  <View style={{flexDirection:'row',alignItems:'center',gap:4}}><SimpleIcon name="chevron-left" size={12} color={Colors.textPrimary} /><Text style={styles.pageBtnText}>Önceki</Text></View>
                </TouchableOpacity>
                <View style={styles.pageInfo}>
                  <Text style={styles.pageInfoText}>{page} / {totalPages}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                  disabled={page >= totalPages}
                  onPress={() => fetchUretimler(page + 1)}
                >
                  <View style={{flexDirection:'row',alignItems:'center',gap:4}}><Text style={styles.pageBtnText}>Sonraki</Text><SimpleIcon name="chevron-right" size={12} color={Colors.textPrimary} /></View>
                </TouchableOpacity>
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchUretimler(1, true)} tintColor={Colors.brandPrimary} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgApp },

  // Header
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

  // Filter
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
    width: 6,
    height: 6,
    borderRadius: 3,
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

  // Date Picker
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  datePickerCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgSurface,
    alignItems: 'center',
  },
  datePickerCancelText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 15 },
  datePickerConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.sm,
    backgroundColor: Colors.brandPrimary,
    alignItems: 'center',
  },
  datePickerConfirmText: { color: Colors.textWhite, fontWeight: '700', fontSize: 15 },

  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  qStatItem: { flex: 1, alignItems: 'center' },
  qStatValue: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  qStatLabel: { ...Typography.caption1, fontSize: 9, marginTop: 2 },
  qStatDivider: { width: 1, backgroundColor: Colors.borderLight, marginVertical: 4 },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    padding: 3,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  tabActive: {
    backgroundColor: Colors.brandPrimary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.textWhite,
  },

  // Summary
  summaryGrid: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  summaryStation: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  summaryProduct: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  summaryRight: { alignItems: 'flex-end' },
  summaryTotal: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  summaryCount: { fontSize: 11, color: Colors.textTertiary, marginTop: 1 },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: { ...Typography.headline },

  // Station Section
  stationSection: { marginBottom: Spacing.xl },
  stationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.md,
    padding: Spacing.md,
    paddingLeft: Spacing.lg,
    borderLeftWidth: 4,
    marginBottom: 0,
  },
  stationHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  stationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationIconText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  stationName: { fontSize: 15, fontWeight: '700' },
  stationCode: { fontSize: 11, color: Colors.textSecondary, marginTop: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  stationHeaderRight: { alignItems: 'flex-end' },
  stationTotal: { fontSize: 18, fontWeight: '800' },
  stationCount: { fontSize: 11, color: Colors.textTertiary, marginTop: 1 },

  // Production Table
  prodTable: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadows.sm,
    marginTop: -1,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  prodTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.bgSurface,
  },
  prodTableHeaderText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  prodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  prodRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  prodTimeCol: {
    width: 52,
  },
  prodTime: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.brandPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  prodInfoCol: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
  prodName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  prodCode: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 1,
  },
  prodQtyCol: {
    minWidth: 70,
    alignItems: 'flex-end',
  },
  prodQty: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },

  // Pagination
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  pageBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.sm,
    ...Shadows.sm,
  },
  pageBtnDisabled: { opacity: 0.35 },
  pageBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  pageInfo: {
    paddingHorizontal: Spacing.md,
  },
  pageInfoText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },

  // List
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 80,
  },

  // Loading
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { ...Typography.subhead, color: Colors.brandPrimary },

  pickerModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  pickerModalSheet: { backgroundColor: Colors.bgWhite, borderRadius: Radius.lg, padding: Spacing.lg, width: '85%', maxWidth: 360 },
  pickerModalTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
});