import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  TextInput, FlatList, RefreshControl, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SimpleIcon from '../components/SimpleIcon';
import { Colors, Shadows } from '../theme';
import { AppDataContext } from '../context/AppDataContext';
import { getSevkiyatlar } from '../api/oncuApi';

export default function SevkiyatListesiScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { oncuToken } = useContext(AppDataContext);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const pageSize = 50;
  const totalPages = totalRows > 0 ? Math.ceil(totalRows / pageSize) : 1;

  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });

  const loadData = useCallback(async (isRefresh = false) => {
    if (!oncuToken) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await getSevkiyatlar(oncuToken, {
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        page,
        pageSize,
      });
      setItems(res?.items || []);
      setTotalRows(res?.totalRows || 0);
    } catch (e) {
      setError(e.message || 'Sevkiyatlar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [oncuToken, page, startDate, endDate]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter(i =>
      (i.musteriAdi || '').toLowerCase().includes(q) ||
      (i.irsaliyeNo || '').toLowerCase().includes(q) ||
      (i.musteriKodu || '').toLowerCase().includes(q) ||
      (i.plasiyer || '').toLowerCase().includes(q),
    );
  }, [items, search]);

  const stats = useMemo(() => {
    const topMiktar = filtered.reduce((s, i) => s + (i.toplamMiktar ?? i.toplamSevkMiktari ?? 0), 0);
    const topTutar = filtered.reduce((s, i) => s + (i.toplamTutar ?? 0), 0);
    return { count: filtered.length, topMiktar, topTutar, total: totalRows };
  }, [filtered, totalRows]);

  const fmt = (n) => {
    if (n == null || isNaN(n)) return '-';
    return n.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
  };
  const fmtDate = (d) => {
    if (!d) return '-';
    try { return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };

  const handleItemPress = (item) => {
    if (item.irsaliyeNo) {
      navigation.navigate('SevkiyatDetay', { irsaliyeNo: item.irsaliyeNo, musteriAdi: item.musteriAdi });
    }
  };

  const handleApplyFilter = () => { setPage(1); setFilterOpen(false); loadData(); };
  const clearFilters = () => {
    setSearch('');
    const d = new Date(); d.setDate(d.getDate() - 30);
    setStartDate(d.toISOString().split('T')[0]);
    const e = new Date(); e.setDate(e.getDate() + 1);
    setEndDate(e.toISOString().split('T')[0]);
    setPage(1);
  };

  const accent = '#E11D48';
  const emerald = '#059669';
  const blue = '#2563EB';
  const amber = '#D97706';

  const renderSummary = () => (
    <View style={s.summaryRow}>
      <View style={[s.summaryCard, { backgroundColor: 'rgba(225,29,72,0.06)' }]}>
        <SimpleIcon name="local_shipping" size={20} color={accent} />
        <Text style={[s.summaryVal, { color: accent }]}>{stats.total}</Text>
        <Text style={[s.summaryLbl, { color: accent }]}>Sevkiyat</Text>
      </View>
      <View style={[s.summaryCard, { backgroundColor: 'rgba(5,150,105,0.08)' }]}>
        <SimpleIcon name="inventory" size={20} color={emerald} />
        <Text style={[s.summaryVal, { color: emerald }]}>{fmt(stats.topMiktar)}</Text>
        <Text style={[s.summaryLbl, { color: emerald }]}>Miktar</Text>
      </View>
      {stats.topTutar > 0 && (
        <View style={[s.summaryCard, { backgroundColor: 'rgba(37,99,235,0.06)' }]}>
          <SimpleIcon name="payments" size={20} color={blue} />
          <Text style={[s.summaryVal, { color: blue }]}>{fmt(stats.topTutar)}</Text>
          <Text style={[s.summaryLbl, { color: blue }]}>Tutar</Text>
        </View>
      )}
    </View>
  );

  const renderCard = ({ item }) => {
    const miktar = item.toplamMiktar ?? item.toplamSevkMiktari ?? 0;
    const tarih = item.tarih || item.sevkTarihi;
    const tutar = item.toplamTutar ?? 0;

    return (
      <TouchableOpacity activeOpacity={0.6} onPress={() => handleItemPress(item)}
        style={[s.card, { backgroundColor: Colors.bgWhite, borderColor: Colors.borderLight }]}>
        <View style={s.cardTop}>
          <View style={[s.badge, { backgroundColor: 'rgba(225,29,72,0.06)' }]}>
            <SimpleIcon name="receipt_long" size={13} color={accent} />
            <Text style={[s.badgeTxt, { color: accent }]}>{item.irsaliyeNo || '-'}</Text>
          </View>
          <View style={s.dateChip}>
            <SimpleIcon name="schedule" size={12} color={Colors.textSecondary} />
            <Text style={[s.dateTxt, { color: Colors.textSecondary }]}>{fmtDate(tarih)}</Text>
          </View>
        </View>
        <View style={s.cardMid}>
          <SimpleIcon name="storefront" size={18} color={Colors.textSecondary} />
          <Text style={[s.customerTxt, { color: Colors.textPrimary }]} numberOfLines={2}>
            {item.musteriAdi || 'Müşteri bilgisi yok'}
          </Text>
        </View>
        <View style={s.cardBot}>
          <View style={s.tagsWrap}>
            {item.musteriKodu ? (
              <View style={[s.tag, { backgroundColor: Colors.bgApp }]}>
                <Text style={[s.tagTxt, { color: Colors.textSecondary }]}>#{item.musteriKodu}</Text>
              </View>
            ) : null}
            {item.plasiyer ? (
              <View style={[s.tag, { backgroundColor: 'rgba(217,119,6,0.08)' }]}>
                <SimpleIcon name="person" size={10} color={amber} />
                <Text style={[s.tagTxt, { color: amber }]}>{item.plasiyer}</Text>
              </View>
            ) : null}
          </View>
          <View style={s.metricsBox}>
            {tutar > 0 && (
              <View style={[s.metricChip, { backgroundColor: 'rgba(37,99,235,0.06)' }]}>
                <Text style={[s.metricVal, { color: blue }]}>₺{fmt(tutar)}</Text>
              </View>
            )}
            <View style={[s.metricChip, { backgroundColor: 'rgba(5,150,105,0.08)' }]}>
              <Text style={[s.metricVal, { color: emerald }]}>{fmt(miktar)}</Text>
              <Text style={[s.metricUnit, { color: emerald }]}>ad</Text>
            </View>
          </View>
        </View>
        <View style={s.chevron}>
          <SimpleIcon name="chevron_right" size={22} color={Colors.borderLight} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderPagination = () => {
    if (totalRows <= pageSize) return null;
    return (
      <View style={[s.pagination, { backgroundColor: Colors.bgWhite, borderTopColor: Colors.borderLight }]}>
        <Text style={[s.pageText, { color: Colors.textSecondary }]}>
          <Text style={{ color: Colors.textPrimary, fontWeight: '700' }}>{page}</Text>
          {' / '}{totalPages}{'  ·  '}{totalRows} kayıt
        </Text>
        <View style={s.pageBtns}>
          <TouchableOpacity disabled={page <= 1} onPress={() => setPage(page - 1)}
            style={[s.pageBtn, { backgroundColor: Colors.bgApp, opacity: page <= 1 ? 0.35 : 1 }]}>
            <SimpleIcon name="chevron_left" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity disabled={page >= totalPages} onPress={() => setPage(page + 1)}
            style={[s.pageBtn, { backgroundColor: Colors.bgApp, opacity: page >= totalPages ? 0.35 : 1 }]}>
            <SimpleIcon name="chevron_right" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[s.root, { backgroundColor: Colors.bgApp }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <SimpleIcon name="arrow_back_ios" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Sevkiyatlar</Text>
        <TouchableOpacity style={s.filterBtn} onPress={() => setFilterOpen(!filterOpen)} activeOpacity={0.7}>
          <SimpleIcon name="tune" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Filter */}
      {filterOpen && (
        <View style={[s.filterPanel, { backgroundColor: Colors.bgWhite, borderBottomColor: Colors.borderLight }]}>
          <View style={s.filterLabelRow}>
            <SimpleIcon name="date_range" size={16} color={Colors.textSecondary} />
            <Text style={[s.filterLabel, { color: Colors.textSecondary }]}>TARİH ARALIĞI</Text>
          </View>
          <View style={s.dateRow}>
            <View style={[s.dateBox, { backgroundColor: Colors.bgApp, borderColor: Colors.borderLight }]}>
              <TextInput style={[s.dateInput, { color: Colors.textPrimary }]} value={startDate}
                onChangeText={setStartDate} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textSecondary} />
            </View>
            <SimpleIcon name="east" size={16} color={Colors.textSecondary} />
            <View style={[s.dateBox, { backgroundColor: Colors.bgApp, borderColor: Colors.borderLight }]}>
              <TextInput style={[s.dateInput, { color: Colors.textPrimary }]} value={endDate}
                onChangeText={setEndDate} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textSecondary} />
            </View>
          </View>
          <View style={s.filterBtns}>
            <TouchableOpacity style={[s.filterBtnClear, { borderColor: Colors.borderLight }]} onPress={clearFilters}>
              <SimpleIcon name="refresh" size={16} color={Colors.textSecondary} />
              <Text style={[s.filterBtnClearTxt, { color: Colors.textSecondary }]}>Sıfırla</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.filterBtnApply, { backgroundColor: accent }]} onPress={handleApplyFilter}>
              <SimpleIcon name="filter_list" size={16} color="#FFF" />
              <Text style={s.filterBtnApplyTxt}>Filtrele</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Search */}
      <View style={[s.searchWrap, { backgroundColor: Colors.bgWhite, borderBottomColor: Colors.borderLight }]}>
        <View style={[s.searchBox, { backgroundColor: Colors.bgApp }]}>
          <SimpleIcon name="search" size={20} color={Colors.textSecondary} />
          <TextInput style={[s.searchInput, { color: Colors.textPrimary }]}
            placeholder="Müşteri, irsaliye no veya kod ara..."
            placeholderTextColor={Colors.textSecondary}
            value={search} onChangeText={setSearch}
            onSubmitEditing={handleApplyFilter}
            autoCorrect={false} autoCapitalize="none" returnKeyType="search" />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <SimpleIcon name="close" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderSummary()}

      {loading && items.length === 0 ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={accent} />
          <Text style={[s.centerTxt, { color: Colors.textSecondary }]}>Sevkiyatlar yükleniyor...</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <SimpleIcon name="error_outline" size={40} color={accent} />
          <Text style={[s.errorTitle, { color: Colors.textPrimary }]}>Hata Oluştu</Text>
          <Text style={[s.errorMsg, { color: Colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity style={[s.retryBtn, { backgroundColor: accent }]} onPress={() => loadData()}>
            <Text style={s.retryTxt}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <SimpleIcon name="local_shipping" size={44} color={Colors.textSecondary} />
          <Text style={[s.emptyTitle, { color: Colors.textPrimary }]}>Sevkiyat Bulunamadı</Text>
        </View>
      ) : (
        <FlatList data={filtered} keyExtractor={(item, idx) => `${item.irsaliyeNo}-${idx}`}
          renderItem={renderCard} showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)}
            colors={[accent]} tintColor={accent} />}
        />
      )}

      {renderPagination()}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: Colors.bgWhite,
    borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  backBtn: { padding: 4, width: 40 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  filterBtn: { padding: 4, width: 40, alignItems: 'flex-end' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  centerTxt: { fontSize: 14, marginTop: 8, fontWeight: '500' },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight },
  summaryCard: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, gap: 4 },
  summaryVal: { fontSize: 17, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  summaryLbl: { fontSize: 11, fontWeight: '600', opacity: 0.8 },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  searchBox: { flexDirection: 'row', alignItems: 'center', height: 44, borderRadius: 12, paddingHorizontal: 14, gap: 10 },
  searchInput: { flex: 1, fontSize: 14, padding: 0, fontWeight: '400' },
  filterPanel: { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, gap: 14 },
  filterLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateBox: { flex: 1, height: 44, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, justifyContent: 'center' },
  dateInput: { fontSize: 14, padding: 0 },
  filterBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 2 },
  filterBtnClear: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  filterBtnClearTxt: { fontSize: 13, fontWeight: '500' },
  filterBtnApply: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  filterBtnApplyTxt: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, marginBottom: 12, position: 'relative' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeTxt: { fontSize: 13, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  dateChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateTxt: { fontSize: 12, fontWeight: '500' },
  cardMid: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12, paddingRight: 28 },
  customerTxt: { fontSize: 15, fontWeight: '600', flex: 1, lineHeight: 21 },
  cardBot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  tagsWrap: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1, paddingRight: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagTxt: { fontSize: 11, fontWeight: '500' },
  metricsBox: { alignItems: 'flex-end', gap: 4 },
  metricChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  metricVal: { fontSize: 14, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  metricUnit: { fontSize: 10, fontWeight: '600' },
  chevron: { position: 'absolute', right: 14, top: '50%', marginTop: -11 },
  errorTitle: { fontSize: 18, fontWeight: '700' },
  errorMsg: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 8 },
  retryTxt: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  pageText: { fontSize: 13, fontWeight: '500' },
  pageBtns: { flexDirection: 'row', gap: 8 },
  pageBtn: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});
