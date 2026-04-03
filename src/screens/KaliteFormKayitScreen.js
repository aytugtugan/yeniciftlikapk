import React, { useState, useCallback, useEffect, useMemo, useContext } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  StatusBar, RefreshControl, TextInput, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import SimpleIcon from '../components/SimpleIcon';
import { Colors, Shadows } from '../theme';
import { AppDataContext } from '../context/AppDataContext';
import {
  getFisMaster, getOncuIstasyonlar, getOncuEmirlerByStation,
} from '../api/oncuApi';

const FACTORY_CODE = 2; // Yeniçiftlik

export default function KaliteFormKayitScreen({ navigation }) {
  const { oncuToken, istasyonlar: ctxIstasyonlar } = useContext(AppDataContext);
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Station filter
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);

  // Active/Completed tab
  const [activeTab, setActiveTab] = useState('aktif');
  const [activeFicheNos, setActiveFicheNos] = useState(new Set());
  const [activeOrdersLoading, setActiveOrdersLoading] = useState(true);

  // Load stations
  useEffect(() => {
    if (!oncuToken) return;
    (async () => {
      try {
        const stationList = await getOncuIstasyonlar(oncuToken, String(FACTORY_CODE));
        const names = stationList.map(s => s.name).filter(Boolean);
        names.sort((a, b) => a.localeCompare(b, 'tr'));
        setStations(names);
      } catch { setStations([]); }
    })();
  }, [oncuToken]);

  // Load active orders
  useEffect(() => {
    if (!oncuToken || stations.length === 0) {
      setActiveFicheNos(new Set());
      setActiveOrdersLoading(false);
      return;
    }
    setActiveOrdersLoading(true);
    (async () => {
      const allFicheNos = new Set();
      const results = await Promise.allSettled(
        stations.map(st => getOncuEmirlerByStation(oncuToken, st))
      );
      results.forEach(r => {
        if (r.status === 'fulfilled') {
          r.value.forEach(order => { if (order.ficheno) allFicheNos.add(order.ficheno); });
        }
      });
      setActiveFicheNos(allFicheNos);
      setActiveOrdersLoading(false);
    })();
  }, [oncuToken, stations]);

  const fetchRecords = useCallback(async () => {
    if (!oncuToken) return;
    try {
      setError(null);
      const response = await getFisMaster(oncuToken, {
        page: 1, pageSize: 10000,
        urunAdi: searchQuery.trim() || undefined,
        fabrikaKodu: FACTORY_CODE,
        istasyonAdi: selectedStation || undefined,
      });
      setRecords(response?.items || []);
    } catch (err) {
      setError(err.message || 'Veriler yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [oncuToken, searchQuery, selectedStation]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchRecords();
  }, [fetchRecords]));

  useEffect(() => { setLoading(true); fetchRecords(); }, [selectedStation]);

  const onRefresh = () => { setRefreshing(true); fetchRecords(); };
  const handleSearch = () => { setLoading(true); fetchRecords(); };

  const formatNumber = (num) => {
    if (num == null) return '-';
    return num.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const filteredRecords = useMemo(() => {
    if (activeOrdersLoading) return records;
    return activeTab === 'aktif'
      ? records.filter(r => activeFicheNos.has(r.fisNo))
      : records.filter(r => !activeFicheNos.has(r.fisNo));
  }, [records, activeFicheNos, activeTab, activeOrdersLoading]);

  const aktifCount = useMemo(() => activeOrdersLoading ? 0 : records.filter(r => activeFicheNos.has(r.fisNo)).length, [records, activeFicheNos, activeOrdersLoading]);
  const tamamlandiCount = useMemo(() => activeOrdersLoading ? 0 : records.filter(r => !activeFicheNos.has(r.fisNo)).length, [records, activeFicheNos, activeOrdersLoading]);

  const getCompletionPercent = (item) => {
    if (!item.planMiktar || item.planMiktar === 0) return 0;
    return Math.min(100, ((item.uretilenMiktar || 0) / item.planMiktar) * 100);
  };

  const getStatusInfo = (item) => {
    if (activeTab === 'tamamlandi') return { label: 'Tamamlandı', color: Colors.success, icon: 'check_circle' };
    const p = getCompletionPercent(item);
    if (p >= 100) return { label: 'Üretim Tamam', color: Colors.success, icon: 'check_circle' };
    if (p > 0) return { label: 'Devam Ediyor', color: Colors.warning, icon: 'schedule' };
    return { label: 'Beklemede', color: Colors.info, icon: 'hourglass_empty' };
  };

  const handleRecordPress = (item) => {
    navigation.navigate('KaliteKayitDetay', {
      fisNo: item.fisNo,
      urunAdi: item.urunAdi || '',
      kod: item.kod,
      istasyonAdi: item.istasyonAdi,
      fabrikaAdi: item.fabrikaAdi,
      planMiktar: item.planMiktar,
      uretilenMiktar: item.uretilenMiktar,
    });
  };

  const renderRecordItem = ({ item }) => {
    const status = getStatusInfo(item);
    const pct = getCompletionPercent(item);
    return (
      <TouchableOpacity style={styles.recordCard} onPress={() => handleRecordPress(item)} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={styles.fisNo} numberOfLines={1}>{item.fisNo}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
            <SimpleIcon name={status.icon} size={12} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <Text style={styles.productName} numberOfLines={2}>{item.urunAdi || item.kod || 'Ürün Adı Yok'}</Text>
        <View style={styles.metaRow}>
          {item.istasyonAdi ? (
            <View style={styles.metaItem}>
              <SimpleIcon name="precision_manufacturing" size={14} color={Colors.textSecondary} />
              <Text style={styles.metaText} numberOfLines={1}>{item.istasyonAdi}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>İlerleme</Text>
            <Text style={[styles.progressPercent, { color: status.color }]}>%{pct.toFixed(0)}</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { backgroundColor: status.color, width: `${pct}%` }]} />
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Plan</Text>
            <Text style={styles.statValue}>{formatNumber(item.planMiktar)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Üretilen</Text>
            <Text style={[styles.statValue, { color: Colors.success }]}>{formatNumber(item.uretilenMiktar)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Kalan</Text>
            <Text style={[styles.statValue, { color: Colors.warning }]}>{formatNumber((item.planMiktar || 0) - (item.uretilenMiktar || 0))}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <SimpleIcon name={activeTab === 'aktif' ? 'play_circle_outline' : 'check_circle'} size={48} color={activeTab === 'aktif' ? Colors.brandPrimary : Colors.success} />
      <Text style={styles.emptyTitle}>{activeTab === 'aktif' ? 'Aktif Emir Yok' : 'Kayıt Bulunamadı'}</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? 'Arama kriterlerinize uygun kayıt yok' : activeTab === 'aktif' ? 'Aktif üretim emri bulunamadı' : 'Tamamlanmış kayıt bulunamadı'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bgWhite} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <SimpleIcon name="arrow_back_ios" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        {showSearch ? (
          <View style={styles.searchContainer}>
            <SimpleIcon name="search" size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Ürün ara..."
              placeholderTextColor={Colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <SimpleIcon name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <Text style={styles.headerTitle}>Kalite Form Kayıtları</Text>
        )}
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowSearch(!showSearch)}>
            <SimpleIcon name={showSearch ? 'close' : 'search'} size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={onRefresh}>
            <SimpleIcon name="refresh" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Station Filter */}
      {stations.length > 0 && (
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
            <TouchableOpacity
              style={[styles.filterChip, { backgroundColor: selectedStation === null ? Colors.brandPrimary : '#F0F0F0' }]}
              onPress={() => setSelectedStation(null)}>
              <Text style={[styles.filterChipText, { color: selectedStation === null ? '#FFF' : Colors.textPrimary }]}>Tüm Hatlar</Text>
            </TouchableOpacity>
            {stations.map(st => (
              <TouchableOpacity
                key={st}
                style={[styles.filterChip, { backgroundColor: selectedStation === st ? Colors.brandPrimary : '#F0F0F0' }]}
                onPress={() => setSelectedStation(st)}>
                <Text style={[styles.filterChipText, { color: selectedStation === st ? '#FFF' : Colors.textPrimary }]}>{st}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'aktif' && styles.tabActive]} onPress={() => setActiveTab('aktif')}>
          <SimpleIcon name="play_circle_outline" size={16} color={activeTab === 'aktif' ? Colors.brandPrimary : Colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'aktif' ? Colors.brandPrimary : Colors.textSecondary }]}>
            Aktif{!activeOrdersLoading ? ` (${aktifCount})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'tamamlandi' && { borderBottomColor: Colors.success, borderBottomWidth: 2 }]} onPress={() => setActiveTab('tamamlandi')}>
          <SimpleIcon name="check_circle" size={16} color={activeTab === 'tamamlandi' ? Colors.success : Colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'tamamlandi' ? Colors.success : Colors.textSecondary }]}>
            Tamamlandı{!activeOrdersLoading ? ` (${tamamlandiCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brandPrimary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <SimpleIcon name="error_outline" size={48} color={Colors.danger} />
          <Text style={styles.errorTitle}>Bir Hata Oluştu</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); fetchRecords(); }}>
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          keyExtractor={(item, i) => `${item.fisNo}-${i}`}
          renderItem={renderRecordItem}
          contentContainerStyle={[styles.listContent, filteredRecords.length === 0 && styles.listContentEmpty]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brandPrimary} />}
          ListEmptyComponent={renderEmpty}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgApp },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: Colors.bgWhite, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight, gap: 12,
  },
  backButton: { padding: 4, width: 32 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', textAlign: 'center', color: Colors.textPrimary },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { padding: 4 },
  searchContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.bgSurface, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0, color: Colors.textPrimary },
  filterBar: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: Colors.bgWhite, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  filterChips: { flexDirection: 'row', gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  filterChipText: { fontSize: 13, fontWeight: '500' },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.bgWhite, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.brandPrimary },
  tabText: { fontSize: 14, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: Colors.textSecondary },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  errorTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  errorText: { fontSize: 14, textAlign: 'center', color: Colors.textSecondary },
  retryButton: { backgroundColor: Colors.brandPrimary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  retryButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  listContent: { padding: 16, gap: 12 },
  listContentEmpty: { flex: 1 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  emptySubtitle: { fontSize: 14, textAlign: 'center', maxWidth: 280, color: Colors.textSecondary },
  recordCard: { borderRadius: 16, padding: 16, backgroundColor: Colors.bgWhite, ...Shadows.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  fisNo: { fontSize: 14, fontWeight: '600', flex: 1, color: Colors.textPrimary },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  productName: { fontSize: 15, fontWeight: '600', lineHeight: 22, marginBottom: 8, color: Colors.textPrimary },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, maxWidth: 120, color: Colors.textSecondary },
  progressSection: { marginBottom: 12 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  progressLabel: { fontSize: 12, color: Colors.textSecondary },
  progressPercent: { fontSize: 13, fontWeight: '700' },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: Colors.borderLight },
  progressFill: { height: '100%', borderRadius: 3 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, marginBottom: 2, color: Colors.textSecondary },
  statValue: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  statDivider: { width: 1, height: 28, backgroundColor: Colors.borderLight },
});
