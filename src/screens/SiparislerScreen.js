import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, Modal, RefreshControl, StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SimpleIcon from '../components/SimpleIcon';
import { Colors, Shadows } from '../theme';
import { AppDataContext } from '../context/AppDataContext';
import { getSiparisler } from '../api/oncuApi';

export default function SiparislerScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { oncuToken } = useContext(AppDataContext);

  const [activeTab, setActiveTab] = useState(route.params?.mode || 'all');
  const [orders, setOrders] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const filterCustomer = route.params?.musteriAdi || '';
  const isFilteredByCustomer = filterCustomer.length > 0;

  const pageSize = 50;
  const totalPages = totalRows > 0 ? Math.ceil(totalRows / pageSize) : 1;

  const loadOrders = useCallback(async (pageNum, refresh = false) => {
    if (!oncuToken) return;
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await getSiparisler(oncuToken, {
        page: pageNum,
        pageSize,
        status: activeTab === 'all' ? undefined : activeTab,
        musteriAdi: filterCustomer || searchQuery.trim() || undefined,
      });
      setOrders(data?.items || []);
      setTotalRows(data?.totalRows || 0);
      setPage(pageNum);
    } catch (err) {
      console.log('Siparişler yükleme hatası:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [oncuToken, activeTab, searchQuery, filterCustomer]);

  useEffect(() => { loadOrders(1); }, [loadOrders]);

  const handleRefresh = () => loadOrders(1, true);
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) loadOrders(newPage);
  };
  const handleSearch = () => { loadOrders(1); setShowSearch(false); };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
    } catch { return dateStr; }
  };

  const renderOrderItem = ({ item }) => {
    const isCompleted = !item.devamEdiyor;
    return (
      <TouchableOpacity
        style={[styles.orderItem, { borderBottomColor: Colors.borderLight }]}
        onPress={() => navigation.navigate('SiparisDetay', { siparisNo: item.siparisNo })}
        activeOpacity={0.7}>
        <View style={[styles.avatar, { backgroundColor: `${Colors.brandPrimary}15` }]}>
          <Text style={[styles.avatarText, { color: Colors.brandPrimary }]}>
            {item.musteriAdi?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.orderContent}>
          <View style={styles.orderHeader}>
            <Text style={styles.customerName} numberOfLines={1}>{item.musteriAdi || 'Bilinmiyor'}</Text>
            <Text style={styles.orderDate}>{formatDate(item.siparisTarihi)}</Text>
          </View>
          <View style={styles.orderMeta}>
            <Text style={styles.orderNo}>#{item.siparisNo}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.factory}>{item.fabrikaAdi || '-'}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, {
          backgroundColor: isCompleted ? '#E8F5E9' : '#FFF8E1',
        }]}>
          <View style={[styles.statusDot, {
            backgroundColor: isCompleted ? '#4CAF50' : '#FF9800',
          }]} />
        </View>
      </TouchableOpacity>
    );
  };

  const TabButton = ({ tab, label }) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        style={[styles.tabButton, isActive && { borderBottomColor: Colors.brandPrimary, borderBottomWidth: 2 }]}
        onPress={() => { setActiveTab(tab); setPage(1); }}
        activeOpacity={0.7}>
        <Text style={[styles.tabText, { color: isActive ? Colors.brandPrimary : Colors.textTertiary },
          isActive && styles.tabTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <SimpleIcon name="arrow_back_ios" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isFilteredByCustomer ? 'Müşteri Siparişleri' : 'Siparişler'}
        </Text>
        <TouchableOpacity style={styles.searchButton} onPress={() => setShowSearch(true)} activeOpacity={0.7}>
          <SimpleIcon name="search" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TabButton tab="all" label="Tümü" />
        <TabButton tab="devam" label="Devam Eden" />
        <TabButton tab="tamam" label="Tamamlanan" />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brandPrimary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={item => item.siparisNo}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh}
              tintColor={Colors.brandPrimary} colors={[Colors.brandPrimary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <SimpleIcon name="inbox" size={64} color={Colors.borderLight} />
              <Text style={styles.emptyTitle}>Sipariş bulunamadı</Text>
              <Text style={styles.emptySubtitle}>Bu kategoride sipariş yok</Text>
            </View>
          }
        />
      )}

      {!isLoading && totalRows > 0 && (
        <View style={styles.pagination}>
          <View style={styles.paginationLeft}>
            <Text style={styles.paginationText}>
              {`${((page - 1) * pageSize) + 1}-${Math.min(page * pageSize, totalRows)}`}
              <Text style={{ color: Colors.textPrimary, fontWeight: '600' }}> / {totalRows}</Text>
            </Text>
          </View>
          <View style={styles.paginationRight}>
            <TouchableOpacity style={[styles.paginationBtn, { opacity: page <= 1 ? 0.4 : 1 }]}
              onPress={() => handlePageChange(page - 1)} disabled={page <= 1}>
              <SimpleIcon name="chevron_left" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.pageIndicator}>
              <Text style={styles.pageIndicatorText}>{page}</Text>
            </View>
            <TouchableOpacity style={[styles.paginationBtn, { opacity: page >= totalPages ? 0.4 : 1 }]}
              onPress={() => handlePageChange(page + 1)} disabled={page >= totalPages}>
              <SimpleIcon name="chevron_right" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal visible={showSearch} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSearch(false)}>
          <View style={styles.searchModal}>
            <View style={styles.searchInputContainer}>
              <SimpleIcon name="search" size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Müşteri ara..."
                placeholderTextColor={Colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <SimpleIcon name="close" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.searchActions}>
              <TouchableOpacity style={styles.searchCancelBtn}
                onPress={() => { setSearchQuery(''); setShowSearch(false); loadOrders(1); }}>
                <Text style={styles.searchCancelText}>Temizle</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.searchBtn, { backgroundColor: Colors.brandPrimary }]}
                onPress={handleSearch}>
                <Text style={styles.searchBtnText}>Ara</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgApp },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: Colors.bgWhite,
    borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  backButton: { padding: 4, width: 40 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  searchButton: { padding: 4, width: 40, alignItems: 'flex-end' },
  tabBar: {
    flexDirection: 'row', backgroundColor: Colors.bgWhite,
    borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  tabButton: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '500' },
  tabTextActive: { fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { flexGrow: 1 },
  orderItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 14, borderBottomWidth: 0.5, backgroundColor: Colors.bgWhite,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  orderContent: { flex: 1, marginLeft: 12 },
  orderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  customerName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, flex: 1, marginRight: 8 },
  orderDate: { fontSize: 12, color: Colors.textSecondary },
  orderMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  orderNo: { fontSize: 13, color: Colors.textSecondary },
  dot: { marginHorizontal: 6, fontSize: 10, color: Colors.textSecondary },
  factory: { fontSize: 13, color: Colors.textSecondary },
  statusBadge: { width: 12, height: 12, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary, marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 4, color: Colors.textSecondary },
  pagination: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.bgWhite,
    borderTopWidth: 0.5, borderTopColor: Colors.borderLight,
  },
  paginationLeft: { flex: 1 },
  paginationText: { fontSize: 13, color: Colors.textSecondary },
  paginationRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  paginationBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  pageIndicator: { minWidth: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8, backgroundColor: '#F0F0F0' },
  pageIndicatorText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', paddingTop: 100, paddingHorizontal: 20 },
  searchModal: { borderRadius: 16, padding: 16, backgroundColor: Colors.bgWhite, ...Shadows.md },
  searchInputContainer: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1,
    borderColor: Colors.borderLight, paddingHorizontal: 14, height: 48, gap: 10, backgroundColor: Colors.bgApp,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0, color: Colors.textPrimary },
  searchActions: { flexDirection: 'row', marginTop: 12, gap: 10 },
  searchCancelBtn: {
    flex: 1, height: 44, borderRadius: 10, borderWidth: 1,
    borderColor: Colors.borderLight, justifyContent: 'center', alignItems: 'center',
  },
  searchCancelText: { fontSize: 15, fontWeight: '500', color: Colors.textSecondary },
  searchBtn: { flex: 1, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  searchBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
