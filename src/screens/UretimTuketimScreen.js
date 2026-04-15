import React, { useState, useContext, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Modal, Platform, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Path, Circle, Rect, G, Line } from 'react-native-svg';
import SimpleIcon from '../components/SimpleIcon';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';
import { DropdownSelector, Chip } from '../components/ui';
import { FilterIcon, ChevronDownIcon, ChevronUpIcon } from '../components/Icons';
import { AppDataContext } from '../context/AppDataContext';
import { getUretimOzeti, getTuketimOzeti } from '../api/apiService';
import { toLocalDateStr } from '../utils/dateUtils';

/* ─── Renk Paletleri ─────────────────────────────────────── */
const CHART_COLORS = [
  '#0095F6', '#F97316', '#10B981', '#8B5CF6', '#EC4899',
  '#06B6D4', '#F59E0B', '#EF4444', '#14B8A6', '#6366F1',
  '#84CC16', '#D946EF', '#F43F5E', '#0EA5E9', '#A855F7',
];
const BAR_COLORS = ['#0095F6', '#10B981', '#8B5CF6', '#F97316', '#EC4899', '#06B6D4', '#F59E0B'];

/* ─── Yardımcı Fonksiyonlar ──────────────────────────────── */
const fmt = (n) => {
  if (n == null || isNaN(n)) return '0';
  return Number(n).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
};
const fmtShort = (n) => {
  if (n == null || isNaN(n)) return '0';
  const v = Number(n);
  if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
  if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
  return v.toLocaleString('tr-TR', { maximumFractionDigits: 1 });
};
const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const formatTR = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d)} ${TR_MONTHS[parseInt(m) - 1]} ${y}`;
};

/* ─── Donut PieChart (SVG) ───────────────────────────────── */
function PieChart({ data, size = 140, innerRadius = 40, centerLabel, centerValue }) {
  if (!data || data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  const r = size / 2;
  const outerR = r - 4;
  let cumAngle = -Math.PI / 2;

  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 2 * Math.PI;
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;
    if (data.length === 1) return <Circle key={i} cx={r} cy={r} r={outerR} fill={d.color} />;
    const x1 = r + outerR * Math.cos(startAngle);
    const y1 = r + outerR * Math.sin(startAngle);
    const x2 = r + outerR * Math.cos(endAngle);
    const y2 = r + outerR * Math.sin(endAngle);
    const ix1 = r + innerRadius * Math.cos(endAngle);
    const iy1 = r + innerRadius * Math.sin(endAngle);
    const ix2 = r + innerRadius * Math.cos(startAngle);
    const iy2 = r + innerRadius * Math.sin(startAngle);
    const large = angle > Math.PI ? 1 : 0;
    const pathD = [
      `M ${x1} ${y1}`,
      `A ${outerR} ${outerR} 0 ${large} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${innerRadius} ${innerRadius} 0 ${large} 0 ${ix2} ${iy2}`,
      'Z',
    ].join(' ');
    return <Path key={i} d={pathD} fill={d.color} />;
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {slices}
        {innerRadius > 0 && <Circle cx={r} cy={r} r={innerRadius} fill={Colors.bgWhite} />}
      </Svg>
      {centerLabel && (
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.textPrimary }}>{centerValue}</Text>
          <Text style={{ fontSize: 9, color: Colors.textSecondary, marginTop: 1 }}>{centerLabel}</Text>
        </View>
      )}
    </View>
  );
}

/* ─── Yatay Bar Chart (SVG) ──────────────────────────────── */
function HorizontalBarChart({ data, barColors = BAR_COLORS }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.value));
  if (maxVal === 0) return null;
  return (
    <View style={st.barChartContainer}>
      {data.slice(0, 7).map((item, i) => {
        const pct = (item.value / maxVal) * 100;
        const color = barColors[i % barColors.length];
        return (
          <View key={i} style={st.barRow}>
            <Text style={st.barLabel} numberOfLines={1}>{item.name}</Text>
            <View style={st.barTrack}>
              <View style={[st.barFill, { width: `${Math.max(pct, 2)}%`, backgroundColor: color }]} />
            </View>
            <Text style={st.barValue}>{fmtShort(item.value)}</Text>
          </View>
        );
      })}
    </View>
  );
}

/* ─── Circular Progress (SVG) ────────────────────────────── */
function CircularProgress({ percentage, size = 80, strokeWidth = 8, color = '#0095F6' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(percentage, 0), 100);
  const offset = circumference * (1 - clamped / 100);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={Colors.bgSurface} strokeWidth={strokeWidth} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color }}>{Math.round(clamped)}%</Text>
      </View>
    </View>
  );
}

/* ─── KPI Kartı ──────────────────────────────────────────── */
function KPICard({ icon, label, value, sub, color, bgColor }) {
  return (
    <View style={[st.kpiCard, { backgroundColor: Colors.bgWhite }]}>
      <View style={[st.kpiIcon, { backgroundColor: bgColor || `${color}15` }]}>
        <SimpleIcon name={icon} size={20} color={color} />
      </View>
      <Text style={st.kpiValue}>{value}</Text>
      <Text style={st.kpiLabel}>{label}</Text>
      {sub ? <Text style={st.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function UretimTuketimScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { width: screenWidth } = useWindowDimensions();
  const { selectedFabrika, istasyonlar } = useContext(AppDataContext);

  const [uretimData, setUretimData] = useState([]);
  const [tuketimData, setTuketimData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0=Özet, 1=Üretim, 2=Tüketim

  // Default: bugün
  const todayStr = toLocalDateStr(new Date());
  const [filters, setFilters] = useState({ hatKodu: '', startDate: todayStr, endDate: todayStr });
  const [showFilters, setShowFilters] = useState(false);
  const [showHatPicker, setShowHatPicker] = useState(false);

  // Date picker
  const [showDatePicker, setShowDatePicker] = useState(null);
  const [pendingDate, setPendingDate] = useState(null);
  const [pendingDateField, setPendingDateField] = useState(null);

  const factoryNo = selectedFabrika?.fabrikaKodu ?? 2;

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

  /* ─── API Çağrısı ─── */
  const fetchData = useCallback(async (isRefresh = false, overrideFilters = null) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    const f = overrideFilters || filters;
    const params = { factoryNo };
    if (f.startDate) params.startDateTime = `${f.startDate}T00:00:00`;
    if (f.endDate) params.endDateTime = `${f.endDate}T23:59:59`;
    if (f.hatKodu) params.hatKodu = f.hatKodu;
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

  const handleFilter = () => { fetchData(); setShowFilters(false); };
  const handleReset = () => {
    const defaults = { hatKodu: '', startDate: todayStr, endDate: todayStr };
    setFilters(defaults);
    setShowHatPicker(false);
    setError(null);
    fetchData(false, defaults);
  };

  // Date picker handlers
  const openDatePicker = (field) => {
    setPendingDateField(field);
    const current = filters[field] ? new Date(filters[field] + 'T12:00:00') : new Date();
    setPendingDate(current);
    setShowDatePicker(field);
  };
  const handleDatePickerChange = (_, date) => { if (date) setPendingDate(date); };
  const handleDateConfirm = () => {
    if (pendingDate && pendingDateField) {
      const y = pendingDate.getFullYear();
      const m = String(pendingDate.getMonth() + 1).padStart(2, '0');
      const d = String(pendingDate.getDate()).padStart(2, '0');
      setFilters(prev => ({ ...prev, [pendingDateField]: `${y}-${m}-${d}` }));
    }
    setShowDatePicker(null); setPendingDate(null); setPendingDateField(null);
  };
  const handleDateCancel = () => { setShowDatePicker(null); setPendingDate(null); setPendingDateField(null); };

  /* ─── Hızlı Tarih Butonları ─── */
  const setQuickDate = (key) => {
    const today = new Date();
    let start = todayStr, end = todayStr;
    if (key === 'today') { /* default */ }
    else if (key === 'yesterday') {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      start = end = toLocalDateStr(y);
    } else if (key === 'week') {
      const w = new Date(today); w.setDate(w.getDate() - 7);
      start = toLocalDateStr(w);
    } else if (key === 'month') {
      const m = new Date(today); m.setMonth(m.getMonth() - 1);
      start = toLocalDateStr(m);
    }
    const newF = { ...filters, startDate: start, endDate: end };
    setFilters(newF);
    fetchData(false, newF);
  };

  /* ─── İstatistikler ─── */
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

  // Verimlilik oranı (üretim / tüketim)
  const efficiencyPct = useMemo(() => {
    if (tStats.total === 0) return 0;
    return Math.min(((uStats.total / tStats.total) * 100), 999);
  }, [uStats.total, tStats.total]);

  // Unique hat & ürün sayıları
  const uniqueHatCount = useMemo(() => {
    const s = new Set();
    uretimData.forEach(i => { if (i.hatKodu) s.add(i.hatKodu); });
    return s.size;
  }, [uretimData]);

  const uniqueUrunCount = useMemo(() => {
    const s = new Set();
    uretimData.forEach(i => { if (i.urunKodu) s.add(i.urunKodu); });
    return s.size;
  }, [uretimData]);

  /* ─── Grafik Verileri ─── */
  // Ürün bazlı üretim (donut)
  const uretimChartData = useMemo(() => {
    const map = {};
    uretimData.forEach(item => {
      const key = item.urunAdi || item.urunKodu || 'Diğer';
      map[key] = (map[key] || 0) + (Number(item.toplamUretimMiktari) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
  }, [uretimData]);

  // Hat bazlı üretim (horizontal bar)
  const uretimByHat = useMemo(() => {
    const map = {};
    uretimData.forEach(item => {
      const key = item.hatAdi || item.hatKodu || 'Bilinmiyor';
      map[key] = (map[key] || 0) + (Number(item.toplamUretimMiktari) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
  }, [uretimData]);

  // Hammadde bazlı tüketim (donut)
  const tuketimChartData = useMemo(() => {
    const map = {};
    tuketimData.forEach(item => {
      const key = item.stokAdi || item.stokKodu || 'Diğer';
      map[key] = (map[key] || 0) + (Number(item.toplamTuketimMiktari) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
  }, [tuketimData]);

  // Hat bazlı tüketim (horizontal bar)
  const tuketimByHat = useMemo(() => {
    const map = {};
    tuketimData.forEach(item => {
      const key = item.hatAdi || item.hatKodu || 'Bilinmiyor';
      map[key] = (map[key] || 0) + (Number(item.toplamTuketimMiktari) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
  }, [tuketimData]);

  // Top 5 üretim ürünleri
  const topUretimUrunler = useMemo(() => {
    const map = {};
    uretimData.forEach(item => {
      const key = item.urunAdi || item.urunKodu || 'Diğer';
      map[key] = (map[key] || 0) + (Number(item.toplamUretimMiktari) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [uretimData]);

  // Top 5 tüketim hammaddeleri
  const topTuketimHammaddeler = useMemo(() => {
    const map = {};
    tuketimData.forEach(item => {
      const key = item.stokAdi || item.stokKodu || 'Diğer';
      map[key] = (map[key] || 0) + (Number(item.toplamTuketimMiktari) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [tuketimData]);

  const hasActiveFilters = filters.hatKodu || filters.startDate !== todayStr || filters.endDate !== todayStr;

  // Sayfa açılınca bugünün verisini getir
  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const TABS = ['Özet', 'Üretim', 'Tüketim'];

  /* ═══════════════════════════════════════════════════════════ */
  return (
    <View style={st.container}>
      {/* ── Header ── */}
      <View style={[st.header, { paddingTop: insets.top }]}>
        <View style={st.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4, marginRight: 8 }}>
            <SimpleIcon name="arrow-back-ios" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[st.pageTitle, { flex: 1 }]}>Üretim & Tüketim</Text>
          <Chip label={selectedFabrika?.fabrikaAdi} size="sm" />
        </View>

        {/* ── Hızlı Tarih Butonları ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.quickDateRow}>
          {[
            { key: 'today', label: 'Bugün' },
            { key: 'yesterday', label: 'Dün' },
            { key: 'week', label: 'Son 7 Gün' },
            { key: 'month', label: 'Son 1 Ay' },
          ].map((item) => {
            const isActive = (item.key === 'today' && filters.startDate === todayStr && filters.endDate === todayStr) ||
              (item.key === 'yesterday' && filters.startDate !== todayStr && filters.startDate === filters.endDate) ||
              (item.key === 'week' && filters.endDate === todayStr && filters.startDate !== todayStr && filters.startDate !== filters.endDate) ||
              false;
            return (
              <TouchableOpacity
                key={item.key}
                style={[st.quickDateBtn, isActive && st.quickDateBtnActive]}
                onPress={() => setQuickDate(item.key)}
                activeOpacity={0.7}
              >
                <Text style={[st.quickDateText, isActive && st.quickDateTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Filter Section ── */}
      <View style={st.filterSection}>
        <TouchableOpacity style={st.filterToggle} onPress={() => setShowFilters(!showFilters)} activeOpacity={0.7}>
          <View style={st.filterToggleLeft}>
            <FilterIcon size={16} color={Colors.textPrimary} />
            <Text style={st.filterToggleText}>Filtreler</Text>
            {hasActiveFilters ? <View style={st.filterActiveDot} /> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 11, color: Colors.textTertiary }}>
              {formatTR(filters.startDate)}{filters.startDate !== filters.endDate ? ` — ${formatTR(filters.endDate)}` : ''}
            </Text>
            {showFilters ? <ChevronUpIcon size={12} color={Colors.textTertiary} /> : <ChevronDownIcon size={12} color={Colors.textTertiary} />}
          </View>
        </TouchableOpacity>

        {showFilters && (
          <View style={st.filterContent}>
            <DropdownSelector label="HAT" value={selectedHatLabel} placeholder="Tüm Hatlar"
              isOpen={showHatPicker} onToggle={() => setShowHatPicker(!showHatPicker)}
              options={hatOptions} selectedValue={filters.hatKodu}
              onSelect={(val) => { setFilters(prev => ({ ...prev, hatKodu: val })); setShowHatPicker(false); }} />

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

            {/* Android Date Picker */}
            {showDatePicker && Platform.OS === 'android' && (
              <DateTimePicker value={pendingDate || new Date()} mode="date" display="default"
                onChange={(event, date) => {
                  if (event.type === 'dismissed' || !date) { setShowDatePicker(null); setPendingDate(null); setPendingDateField(null); return; }
                  const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, '0'), dd = String(date.getDate()).padStart(2, '0');
                  setFilters(prev => ({ ...prev, [pendingDateField]: `${y}-${m}-${dd}` }));
                  setShowDatePicker(null); setPendingDate(null); setPendingDateField(null);
                }} />
            )}
            {/* iOS Date Picker */}
            {showDatePicker && Platform.OS === 'ios' && (
              <Modal visible={true} transparent animationType="fade">
                <View style={st.pickerModalOverlay}>
                  <View style={st.pickerModalSheet}>
                    <DateTimePicker value={pendingDate || new Date()} mode="date" display="spinner" themeVariant="light" locale="tr" onChange={handleDatePickerChange} />
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

      {/* ── Tab Bar ── */}
      {fetched && !error && (
        <View style={st.tabBar}>
          {TABS.map((tab, i) => (
            <TouchableOpacity key={i} style={[st.tabItem, activeTab === i && st.tabItemActive]} onPress={() => setActiveTab(i)} activeOpacity={0.7}>
              <Text style={[st.tabText, activeTab === i && st.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Content ── */}
      {loading && !refreshing ? (
        <View style={st.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.brandPrimary} />
          <Text style={st.loadingTxt}>Yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={Colors.brandPrimary} />}
        >
          {error ? (
            <View style={st.errorBox}>
              <Text style={st.errorTxt}>{error}</Text>
              <TouchableOpacity onPress={() => fetchData()}><Text style={st.retryTxt}>Tekrar Dene</Text></TouchableOpacity>
            </View>
          ) : null}

          {fetched && !error && (
            <>
              {/* ═══════════ TAB 0: ÖZET ═══════════ */}
              {activeTab === 0 && (
                <>
                  {/* KPI Kartları 2×2 */}
                  <View style={st.kpiGrid}>
                    <KPICard icon="inventory-2" label="Toplam Üretim" value={fmtShort(uStats.total)} sub={`${uStats.count} kalem`} color="#0095F6" />
                    <KPICard icon="local-fire-department" label="Toplam Tüketim" value={fmtShort(tStats.total)} sub={`${tStats.count} kalem`} color="#EF4444" />
                    <KPICard icon="precision-manufacturing" label="Aktif Hat" value={String(uniqueHatCount)} sub={`${uniqueUrunCount} ürün`} color="#8B5CF6" />
                    <KPICard icon="speed" label="Verimlilik" value={`%${efficiencyPct.toFixed(1)}`} sub="Ü/T oranı" color="#10B981" />
                  </View>

                  {/* Verimlilik göstergesi */}
                  {uStats.total > 0 && tStats.total > 0 && (
                    <View style={st.chartCard}>
                      <View style={st.chartHeader}>
                        <View>
                          <Text style={st.chartTitle}>Üretim / Tüketim Oranı</Text>
                          <Text style={st.chartSubtitle}>Hammadde kullanım verimliliği</Text>
                        </View>
                        <View style={[st.chartIconBg, { backgroundColor: '#10B98115' }]}>
                          <SimpleIcon name="pie-chart" size={18} color="#10B981" />
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                        <CircularProgress percentage={Math.min(efficiencyPct, 100)} size={90} color="#10B981" />
                        <View style={{ flex: 1, gap: 8 }}>
                          <View style={st.ratioRow}>
                            <View style={[st.ratioDot, { backgroundColor: '#0095F6' }]} />
                            <Text style={st.ratioLabel}>Üretim</Text>
                            <Text style={st.ratioValue}>{fmt(uStats.total)}</Text>
                          </View>
                          <View style={st.ratioRow}>
                            <View style={[st.ratioDot, { backgroundColor: '#EF4444' }]} />
                            <Text style={st.ratioLabel}>Tüketim</Text>
                            <Text style={st.ratioValue}>{fmt(tStats.total)}</Text>
                          </View>
                          <View style={[st.ratioRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.borderLight, paddingTop: 6 }]}>
                            <View style={[st.ratioDot, { backgroundColor: '#10B981' }]} />
                            <Text style={[st.ratioLabel, { fontWeight: '700' }]}>Oran</Text>
                            <Text style={[st.ratioValue, { fontWeight: '800', color: '#10B981' }]}>%{efficiencyPct.toFixed(1)}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Hat Bazlı Üretim - Yatay Bar */}
                  {uretimByHat.length > 0 && (
                    <View style={st.chartCard}>
                      <View style={st.chartHeader}>
                        <View>
                          <Text style={st.chartTitle}>Hat Bazlı Üretim</Text>
                          <Text style={st.chartSubtitle}>En yüksek {Math.min(uretimByHat.length, 7)} hat</Text>
                        </View>
                        <View style={[st.chartIconBg, { backgroundColor: '#0095F615' }]}>
                          <SimpleIcon name="bar-chart" size={18} color="#0095F6" />
                        </View>
                      </View>
                      <HorizontalBarChart data={uretimByHat} />
                    </View>
                  )}

                  {/* Top 5 Üretilen Ürünler - mini tablo */}
                  {topUretimUrunler.length > 0 && (
                    <View style={st.chartCard}>
                      <View style={st.chartHeader}>
                        <View>
                          <Text style={st.chartTitle}>En Çok Üretilen Ürünler</Text>
                          <Text style={st.chartSubtitle}>İlk 5 ürün</Text>
                        </View>
                        <View style={[st.chartIconBg, { backgroundColor: '#F9731615' }]}>
                          <SimpleIcon name="emoji-events" size={18} color="#F97316" />
                        </View>
                      </View>
                      {topUretimUrunler.map((item, i) => (
                        <View key={i} style={[st.topItemRow, i !== topUretimUrunler.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight }]}>
                          <View style={[st.topItemRank, { backgroundColor: i < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][i] + '25' : Colors.bgSurface }]}>
                            <Text style={[st.topItemRankText, i < 3 && { color: ['#B8860B', '#6B6B6B', '#8B4513'][i] }]}>{i + 1}</Text>
                          </View>
                          <Text style={st.topItemName} numberOfLines={1}>{item.name}</Text>
                          <Text style={st.topItemValue}>{fmt(item.value)}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Top 5 Tüketilen Hammaddeler */}
                  {topTuketimHammaddeler.length > 0 && (
                    <View style={st.chartCard}>
                      <View style={st.chartHeader}>
                        <View>
                          <Text style={st.chartTitle}>En Çok Tüketilen Hammaddeler</Text>
                          <Text style={st.chartSubtitle}>İlk 5 hammadde</Text>
                        </View>
                        <View style={[st.chartIconBg, { backgroundColor: '#EF444415' }]}>
                          <SimpleIcon name="whatshot" size={18} color="#EF4444" />
                        </View>
                      </View>
                      {topTuketimHammaddeler.map((item, i) => (
                        <View key={i} style={[st.topItemRow, i !== topTuketimHammaddeler.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight }]}>
                          <View style={[st.topItemRank, { backgroundColor: i < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][i] + '25' : Colors.bgSurface }]}>
                            <Text style={[st.topItemRankText, i < 3 && { color: ['#B8860B', '#6B6B6B', '#8B4513'][i] }]}>{i + 1}</Text>
                          </View>
                          <Text style={st.topItemName} numberOfLines={1}>{item.name}</Text>
                          <Text style={[st.topItemValue, { color: '#B91C1C' }]}>{fmt(item.value)}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {uretimData.length === 0 && tuketimData.length === 0 && (
                    <View style={st.emptyRow}>
                      <SimpleIcon name="inbox" size={36} color={Colors.textTertiary} />
                      <Text style={st.emptyTxt}>Seçilen tarih aralığında veri bulunamadı</Text>
                    </View>
                  )}
                </>
              )}

              {/* ═══════════ TAB 1: ÜRETİM ═══════════ */}
              {activeTab === 1 && (
                <>
                  {/* Özet Kartları */}
                  <View style={st.summaryRow}>
                    <View style={[st.summaryCard, { borderLeftColor: '#0095F6' }]}>
                      <SimpleIcon name="inventory-2" size={20} color="#0095F6" />
                      <Text style={st.summaryLabel}>Toplam Üretim</Text>
                      <Text style={[st.summaryValue, { color: '#0095F6' }]}>{fmt(uStats.total)}</Text>
                      <Text style={st.summaryCount}>{uStats.count} kalem · {uniqueUrunCount} ürün</Text>
                    </View>
                    <View style={[st.summaryCard, { borderLeftColor: '#8B5CF6' }]}>
                      <SimpleIcon name="precision-manufacturing" size={20} color="#8B5CF6" />
                      <Text style={st.summaryLabel}>Aktif Hat</Text>
                      <Text style={[st.summaryValue, { color: '#8B5CF6' }]}>{uniqueHatCount}</Text>
                      <Text style={st.summaryCount}>üretim hattı</Text>
                    </View>
                  </View>

                  {/* Donut: Ürün Dağılımı */}
                  {uretimChartData.length > 0 && (
                    <View style={st.chartCard}>
                      <View style={st.chartHeader}>
                        <View>
                          <Text style={st.chartTitle}>Ürün Bazlı Dağılım</Text>
                          <Text style={st.chartSubtitle}>{uretimChartData.length} farklı ürün</Text>
                        </View>
                        <View style={[st.chartIconBg, { backgroundColor: '#0095F615' }]}>
                          <SimpleIcon name="donut-large" size={18} color="#0095F6" />
                        </View>
                      </View>
                      <View style={st.chartRow}>
                        <PieChart data={uretimChartData} size={130} innerRadius={38}
                          centerLabel="Toplam" centerValue={fmtShort(uStats.total)} />
                        <View style={st.legendWrap}>
                          {uretimChartData.slice(0, 6).map((item, i) => {
                            const pct = uStats.total > 0 ? ((item.value / uStats.total) * 100).toFixed(1) : 0;
                            return (
                              <View key={i} style={st.legendItem}>
                                <View style={[st.legendDot, { backgroundColor: item.color }]} />
                                <View style={{ flex: 1 }}>
                                  <Text style={st.legendName} numberOfLines={1}>{item.name}</Text>
                                  <Text style={st.legendVal}>{fmt(item.value)} ({pct}%)</Text>
                                </View>
                              </View>
                            );
                          })}
                          {uretimChartData.length > 6 && <Text style={st.legendMore}>+{uretimChartData.length - 6} diğer</Text>}
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Bar: Hat Bazlı Üretim */}
                  {uretimByHat.length > 0 && (
                    <View style={st.chartCard}>
                      <View style={st.chartHeader}>
                        <View>
                          <Text style={st.chartTitle}>Hat Bazlı Üretim</Text>
                          <Text style={st.chartSubtitle}>{uretimByHat.length} hat</Text>
                        </View>
                        <View style={[st.chartIconBg, { backgroundColor: '#10B98115' }]}>
                          <SimpleIcon name="bar-chart" size={18} color="#10B981" />
                        </View>
                      </View>
                      <HorizontalBarChart data={uretimByHat} barColors={['#10B981', '#0095F6', '#8B5CF6', '#F97316', '#EC4899']} />
                    </View>
                  )}

                  {/* Detay Tablosu */}
                  {uretimData.length > 0 && (
                    <View style={st.section}>
                      <View style={st.sectionHead}>
                        <Text style={st.sectionTitle}>ÜRETİM DETAY</Text>
                        <Text style={st.sectionSummary}>{uStats.count} kayıt</Text>
                      </View>
                      <View style={st.tableCard}>
                        {uretimData.map((item, i) => (
                          <View key={i} style={[st.detailRow, i !== uretimData.length - 1 && st.detailRowBorder]}>
                            <View style={st.detailTop}>
                              <View style={st.detailNumBadge}><Text style={st.detailNum}>{i + 1}</Text></View>
                              <Text style={st.detailTitle} numberOfLines={2}>{item.urunAdi || '-'}</Text>
                              <View style={st.detailAmount}>
                                <Text style={st.detailVal}>{fmt(item.toplamUretimMiktari)}</Text>
                                {item.birim ? <Text style={st.detailUnit}>{item.birim}</Text> : null}
                              </View>
                            </View>
                            <View style={st.detailMeta}>
                              {item.urunKodu ? <Text style={st.metaTag}>{item.urunKodu}</Text> : null}
                              {item.hatKodu ? <Text style={st.metaTag}>{item.hatKodu}{item.hatAdi ? ` · ${item.hatAdi}` : ''}</Text> : null}
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {uretimData.length === 0 && (
                    <View style={st.emptyRow}>
                      <SimpleIcon name="inbox" size={36} color={Colors.textTertiary} />
                      <Text style={st.emptyTxt}>Üretim verisi bulunamadı</Text>
                    </View>
                  )}
                </>
              )}

              {/* ═══════════ TAB 2: TÜKETİM ═══════════ */}
              {activeTab === 2 && (
                <>
                  {/* Özet Kartları */}
                  <View style={st.summaryRow}>
                    <View style={[st.summaryCard, { borderLeftColor: '#EF4444' }]}>
                      <SimpleIcon name="local-fire-department" size={20} color="#EF4444" />
                      <Text style={st.summaryLabel}>Toplam Tüketim</Text>
                      <Text style={[st.summaryValue, { color: '#EF4444' }]}>{fmt(tStats.total)}</Text>
                      <Text style={st.summaryCount}>{tStats.count} kalem</Text>
                    </View>
                    <View style={[st.summaryCard, { borderLeftColor: '#F97316' }]}>
                      <SimpleIcon name="category" size={20} color="#F97316" />
                      <Text style={st.summaryLabel}>Hammadde Çeşidi</Text>
                      <Text style={[st.summaryValue, { color: '#F97316' }]}>{tuketimChartData.length}</Text>
                      <Text style={st.summaryCount}>farklı hammadde</Text>
                    </View>
                  </View>

                  {/* Donut: Hammadde Dağılımı */}
                  {tuketimChartData.length > 0 && (
                    <View style={st.chartCard}>
                      <View style={st.chartHeader}>
                        <View>
                          <Text style={st.chartTitle}>Hammadde Bazlı Dağılım</Text>
                          <Text style={st.chartSubtitle}>{tuketimChartData.length} farklı hammadde</Text>
                        </View>
                        <View style={[st.chartIconBg, { backgroundColor: '#EF444415' }]}>
                          <SimpleIcon name="donut-large" size={18} color="#EF4444" />
                        </View>
                      </View>
                      <View style={st.chartRow}>
                        <PieChart data={tuketimChartData} size={130} innerRadius={38}
                          centerLabel="Toplam" centerValue={fmtShort(tStats.total)} />
                        <View style={st.legendWrap}>
                          {tuketimChartData.slice(0, 6).map((item, i) => {
                            const pct = tStats.total > 0 ? ((item.value / tStats.total) * 100).toFixed(1) : 0;
                            return (
                              <View key={i} style={st.legendItem}>
                                <View style={[st.legendDot, { backgroundColor: item.color }]} />
                                <View style={{ flex: 1 }}>
                                  <Text style={st.legendName} numberOfLines={1}>{item.name}</Text>
                                  <Text style={st.legendVal}>{fmt(item.value)} ({pct}%)</Text>
                                </View>
                              </View>
                            );
                          })}
                          {tuketimChartData.length > 6 && <Text style={st.legendMore}>+{tuketimChartData.length - 6} diğer</Text>}
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Bar: Hat Bazlı Tüketim */}
                  {tuketimByHat.length > 0 && (
                    <View style={st.chartCard}>
                      <View style={st.chartHeader}>
                        <View>
                          <Text style={st.chartTitle}>Hat Bazlı Tüketim</Text>
                          <Text style={st.chartSubtitle}>{tuketimByHat.length} hat</Text>
                        </View>
                        <View style={[st.chartIconBg, { backgroundColor: '#F9731615' }]}>
                          <SimpleIcon name="bar-chart" size={18} color="#F97316" />
                        </View>
                      </View>
                      <HorizontalBarChart data={tuketimByHat} barColors={['#EF4444', '#F97316', '#F59E0B', '#EC4899', '#8B5CF6']} />
                    </View>
                  )}

                  {/* Detay Tablosu */}
                  {tuketimData.length > 0 && (
                    <View style={st.section}>
                      <View style={st.sectionHead}>
                        <Text style={st.sectionTitle}>TÜKETİM DETAY</Text>
                        <Text style={st.sectionSummary}>{tStats.count} kayıt</Text>
                      </View>
                      <View style={st.tableCard}>
                        {tuketimData.map((item, i) => (
                          <View key={i} style={[st.detailRow, i !== tuketimData.length - 1 && st.detailRowBorder]}>
                            <View style={st.detailTop}>
                              <View style={st.detailNumBadge}><Text style={st.detailNum}>{i + 1}</Text></View>
                              <Text style={st.detailTitle} numberOfLines={2}>{item.stokAdi || '-'}</Text>
                              <View style={st.detailAmount}>
                                <Text style={[st.detailVal, { color: '#B91C1C' }]}>{fmt(item.toplamTuketimMiktari)}</Text>
                                {item.birim ? <Text style={st.detailUnit}>{item.birim}</Text> : null}
                              </View>
                            </View>
                            <View style={st.detailMeta}>
                              {item.stokKodu ? <Text style={st.metaTag}>{item.stokKodu}</Text> : null}
                              {item.hatKodu ? <Text style={st.metaTag}>{item.hatKodu}{item.hatAdi ? ` · ${item.hatAdi}` : ''}</Text> : null}
                              {item.uretimUrunAdi ? <Text style={st.metaTagLinked}>→ {item.uretimUrunAdi}</Text> : null}
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {tuketimData.length === 0 && (
                    <View style={st.emptyRow}>
                      <SimpleIcon name="inbox" size={36} color={Colors.textTertiary} />
                      <Text style={st.emptyTxt}>Tüketim verisi bulunamadı</Text>
                    </View>
                  )}
                </>
              )}
            </>
          )}

          {!fetched && !loading && !error && (
            <View style={st.initWrap}>
              <SimpleIcon name="assessment" size={36} color={Colors.textTertiary} />
              <Text style={st.initTitle}>Üretim & Tüketim Raporu</Text>
              <Text style={st.initSub}>Veriler yükleniyor...</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════ */
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgApp },
  header: { backgroundColor: Colors.bgWhite, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  pageTitle: { ...Typography.title1 },

  // Hızlı Tarih
  quickDateRow: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, gap: 8 },
  quickDateBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.round, backgroundColor: Colors.bgSurface, borderWidth: 1, borderColor: Colors.borderLight },
  quickDateBtnActive: { backgroundColor: Colors.brandPrimary, borderColor: Colors.brandPrimary },
  quickDateText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  quickDateTextActive: { color: Colors.textWhite },

  // Tab Bar
  tabBar: { flexDirection: 'row', backgroundColor: Colors.bgWhite, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight, paddingHorizontal: Spacing.lg },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: Colors.brandPrimary },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.brandPrimary },

  // KPI Grid (2x2)
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.lg },
  kpiCard: { width: '48%', flexGrow: 1, padding: 14, borderRadius: Radius.md, alignItems: 'center', gap: 6, ...Shadows.sm },
  kpiIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  kpiValue: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  kpiLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  kpiSub: { fontSize: 10, color: Colors.textTertiary },

  // Filter
  filterSection: { backgroundColor: Colors.bgWhite, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  filterToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  filterToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  filterToggleText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  filterActiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.brandPrimary },
  filterContent: { marginTop: Spacing.sm },
  dateGrid: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  dateBtn: { flex: 1, backgroundColor: Colors.bgSurface, borderRadius: Radius.md, padding: Spacing.md },
  dateBtnLabel: { ...Typography.caption1, fontSize: 9, marginBottom: 3, color: Colors.textPrimary },
  dateBtnValue: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  dateBtnPlaceholder: { color: Colors.textSecondary },
  filterBtnRow: { flexDirection: 'row', gap: Spacing.sm },
  filterBtn: { flex: 1, backgroundColor: Colors.brandPrimary, borderRadius: Radius.sm, paddingVertical: 10, alignItems: 'center' },
  filterBtnText: { color: Colors.textWhite, fontWeight: '600', fontSize: 14 },
  resetBtn: { paddingVertical: 10, paddingHorizontal: Spacing.lg, alignItems: 'center', justifyContent: 'center' },
  resetBtnText: { color: Colors.textSecondary, fontWeight: '500', fontSize: 14 },

  // Date Picker Modal
  pickerModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  pickerModalSheet: { backgroundColor: Colors.bgWhite, borderRadius: Radius.lg, padding: Spacing.lg, width: '85%', maxWidth: 360 },
  datePickerActions: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  datePickerCancel: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: Radius.sm, backgroundColor: Colors.bgSurface },
  datePickerCancelText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
  datePickerConfirm: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: Radius.sm, backgroundColor: Colors.brandPrimary },
  datePickerConfirmText: { color: Colors.textWhite, fontWeight: '600', fontSize: 14 },

  // Content
  scrollContent: { padding: Spacing.lg },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingTxt: { fontSize: 14, color: Colors.textSecondary },

  // Error
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEF2F2', borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: '#FECACA' },
  errorTxt: { flex: 1, fontSize: 12, color: '#B91C1C' },
  retryTxt: { fontSize: 12, fontWeight: '600', color: Colors.brandPrimary },

  // Summary cards
  summaryRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  summaryCard: { flex: 1, backgroundColor: Colors.bgWhite, borderRadius: Radius.md, padding: Spacing.lg, borderLeftWidth: 3, ...Shadows.sm },
  summaryLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.3 },
  summaryValue: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  summaryCount: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },

  // Chart card
  chartCard: { backgroundColor: Colors.bgWhite, borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadows.sm },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  chartTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  chartSubtitle: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  chartIconBg: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  legendWrap: { flex: 1, gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { fontSize: 11, fontWeight: '500', color: Colors.textPrimary },
  legendVal: { fontSize: 10, color: Colors.textSecondary },
  legendMore: { fontSize: 10, color: Colors.textTertiary, fontStyle: 'italic', marginTop: 2 },

  // Horizontal Bar Chart
  barChartContainer: { gap: 10 },
  barRow: { gap: 4 },
  barLabel: { fontSize: 12, fontWeight: '500', color: Colors.textPrimary },
  barTrack: { height: 22, borderRadius: 6, backgroundColor: Colors.bgSurface, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 6 },
  barValue: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },

  // Ratio
  ratioRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratioDot: { width: 8, height: 8, borderRadius: 4 },
  ratioLabel: { flex: 1, fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  ratioValue: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },

  // Top items
  topItemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  topItemRank: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  topItemRankText: { fontSize: 12, fontWeight: '800', color: Colors.textTertiary },
  topItemName: { flex: 1, fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  topItemValue: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },

  // Section
  section: { marginBottom: Spacing.lg },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: Spacing.xs, paddingHorizontal: 2 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.5 },
  sectionSummary: { fontSize: 11, color: Colors.textTertiary },

  // Table card
  tableCard: { backgroundColor: Colors.bgWhite, borderRadius: Radius.md, overflow: 'hidden', ...Shadows.sm },
  detailRow: { paddingVertical: 12, paddingHorizontal: 14 },
  detailRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight },
  detailTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  detailNumBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.bgSurface, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  detailNum: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary },
  detailTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textPrimary, lineHeight: 18 },
  detailAmount: { alignItems: 'flex-end', flexShrink: 0 },
  detailVal: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  detailUnit: { fontSize: 9, color: Colors.textTertiary, marginTop: 1, textTransform: 'uppercase' },
  detailMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6, paddingLeft: 34 },
  metaTag: { fontSize: 10, fontWeight: '500', color: Colors.textSecondary, backgroundColor: Colors.bgSurface, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4, overflow: 'hidden' },
  metaTagLinked: { fontSize: 10, fontWeight: '500', color: Colors.brandPrimary, backgroundColor: Colors.brandPrimaryLight, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4, overflow: 'hidden' },

  // Empty
  emptyRow: { paddingVertical: 40, alignItems: 'center', gap: 8 },
  emptyTxt: { fontSize: 13, color: Colors.textTertiary },

  // Init
  initWrap: { alignItems: 'center', paddingTop: 80, gap: 8 },
  initTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  initSub: { fontSize: 13, color: Colors.textSecondary },
});
