import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SimpleIcon from '../components/SimpleIcon';
import { Colors, Shadows } from '../theme';
import { AppDataContext } from '../context/AppDataContext';
import { getSiparisler, getSiparisDetay, getSiparisSevkiyatlar } from '../api/oncuApi';

export default function SiparisDetayScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { oncuToken } = useContext(AppDataContext);

  const siparisNo = route.params?.siparisNo || '';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [siparis, setSiparis] = useState(null);
  const [details, setDetails] = useState([]);
  const [sevkiyatlar, setSevkiyatlar] = useState([]);
  const [activeTab, setActiveTab] = useState('products');
  const [expandedProducts, setExpandedProducts] = useState(false);

  const loadData = useCallback(async () => {
    if (!siparisNo || !oncuToken) { setLoading(false); return; }
    try {
      const [siparisRes, detayRes, sevkiyatRes] = await Promise.allSettled([
        getSiparisler(oncuToken, { siparisNo, pageSize: 1 }),
        getSiparisDetay(oncuToken, { siparisNo }),
        getSiparisSevkiyatlar(oncuToken, { siparisNo }),
      ]);
      if (siparisRes.status === 'fulfilled' && siparisRes.value?.items?.length > 0) {
        setSiparis(siparisRes.value.items[0]);
      }
      if (detayRes.status === 'fulfilled') setDetails(detayRes.value?.items || []);
      if (sevkiyatRes.status === 'fulfilled') setSevkiyatlar(sevkiyatRes.value?.items || []);
    } catch (err) { console.log('Error:', err); }
    finally { setLoading(false); setRefreshing(false); }
  }, [siparisNo, oncuToken]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const formatNumber = (num) => {
    if (num == null) return '-';
    return num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try { return new Date(dateStr).toLocaleDateString('tr-TR'); } catch { return dateStr; }
  };

  const displayedProducts = expandedProducts ? details : details.slice(0, 3);
  const isCompleted = siparis && !siparis.devamEdiyor;

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <SimpleIcon name="arrow_back_ios" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sipariş Detay</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brandPrimary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <SimpleIcon name="arrow_back_ios" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sipariş Detay</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}
          tintColor={Colors.brandPrimary} colors={[Colors.brandPrimary]} />}>

        {/* Customer Card */}
        {siparis && (
          <TouchableOpacity style={styles.customerCard}
            onPress={() => navigation.navigate('MusteriProfil', { musteriKod: siparis.musteriAdi })}
            activeOpacity={0.7}>
            <View style={[styles.customerAvatar, { backgroundColor: `${Colors.brandPrimary}15` }]}>
              <Text style={[styles.customerAvatarText, { color: Colors.brandPrimary }]}>
                {siparis.musteriAdi?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName} numberOfLines={1}>{siparis.musteriAdi}</Text>
              {siparis.odemePlani && (
                <View style={styles.paymentRow}>
                  <SimpleIcon name="schedule" size={14} color={Colors.textSecondary} />
                  <Text style={styles.paymentText}>{siparis.odemePlani}</Text>
                </View>
              )}
            </View>
            <SimpleIcon name="chevron_right" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Order Summary */}
        {siparis && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View>
                <Text style={styles.orderNumber}>#{siparisNo}</Text>
                <Text style={styles.orderDate}>{formatDate(siparis.siparisTarihi)}</Text>
              </View>
              <View style={[styles.statusBadge, {
                backgroundColor: isCompleted ? '#E8F5E9' : '#FFF8E1',
              }]}>
                <SimpleIcon name={isCompleted ? 'check_circle' : 'schedule'} size={14}
                  color={isCompleted ? '#4CAF50' : '#FF9800'} />
                <Text style={[styles.statusText, { color: isCompleted ? '#4CAF50' : '#FF9800' }]}>
                  {isCompleted ? 'Tamamlandı' : 'Devam Ediyor'}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Toplam Sipariş</Text>
                <Text style={styles.statValue}>{formatNumber(siparis.toplamSiparisMiktari)}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Fabrika</Text>
                <Text style={styles.statValue}>{siparis.fabrikaAdi || '-'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Tab Buttons */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'products' && { backgroundColor: Colors.brandPrimary }]}
            onPress={() => setActiveTab('products')}>
            <SimpleIcon name="inventory" size={18}
              color={activeTab === 'products' ? '#FFFFFF' : Colors.brandPrimary} />
            <Text style={[styles.tabBtnText, { color: activeTab === 'products' ? '#FFFFFF' : Colors.brandPrimary }]}>
              Ürünler ({details.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'shipments' && { backgroundColor: Colors.brandPrimary }]}
            onPress={() => setActiveTab('shipments')}>
            <SimpleIcon name="local_shipping" size={18}
              color={activeTab === 'shipments' ? '#FFFFFF' : Colors.brandPrimary} />
            <Text style={[styles.tabBtnText, { color: activeTab === 'shipments' ? '#FFFFFF' : Colors.brandPrimary }]}>
              Sevkiyat ({sevkiyatlar.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Products */}
        {activeTab === 'products' && (
          <View style={styles.listCard}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Sipariş Kalemleri</Text>
              <View style={[styles.countBadge, { backgroundColor: `${Colors.brandPrimary}15` }]}>
                <Text style={[styles.countText, { color: Colors.brandPrimary }]}>{details.length}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            {displayedProducts.map((item, index) => (
              <View key={index} style={styles.productItem}>
                <Text style={styles.productName} numberOfLines={2}>{item.stokAdi || item.stokKodu || '-'}</Text>
                <View style={styles.productStats}>
                  <View style={styles.productStatCol}>
                    <Text style={styles.productStatLabel}>Sipariş:</Text>
                    <Text style={styles.productStatValue}>{formatNumber(item.siparisMiktari)}</Text>
                  </View>
                  <View style={styles.productStatCol}>
                    <Text style={styles.productStatLabel}>Giden:</Text>
                    <Text style={[styles.productStatValue, { color: '#4CAF50' }]}>{formatNumber(item.gidenMiktar)}</Text>
                  </View>
                  <View style={styles.productStatCol}>
                    <Text style={styles.productStatLabel}>Kalan:</Text>
                    <Text style={styles.productStatValue}>{formatNumber(item.kalanMiktar)}</Text>
                  </View>
                </View>
                {index < displayedProducts.length - 1 && <View style={styles.itemDivider} />}
              </View>
            ))}
            {details.length > 3 && (
              <TouchableOpacity style={styles.expandBtn} onPress={() => setExpandedProducts(!expandedProducts)}>
                <Text style={[styles.expandBtnText, { color: Colors.brandPrimary }]}>
                  {expandedProducts ? 'Daha Az Göster' : `+${details.length - 3} Ürün Daha`}
                </Text>
                <SimpleIcon name={expandedProducts ? 'expand_less' : 'expand_more'} size={20} color={Colors.brandPrimary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Shipments */}
        {activeTab === 'shipments' && (
          <View style={styles.listCard}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Sevkiyatlar</Text>
              <View style={[styles.countBadge, { backgroundColor: `${Colors.brandPrimary}15` }]}>
                <Text style={[styles.countText, { color: Colors.brandPrimary }]}>{sevkiyatlar.length}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            {sevkiyatlar.length === 0 ? (
              <View style={styles.emptyList}>
                <SimpleIcon name="local_shipping" size={40} color={Colors.borderLight} />
                <Text style={styles.emptyText}>Henüz sevkiyat yok</Text>
              </View>
            ) : (
              sevkiyatlar.map((item, index) => (
                <TouchableOpacity key={index} style={styles.shipmentItem} activeOpacity={0.7}
                  onPress={() => {
                    if (item.irsaliyeNo) {
                      navigation.navigate('SevkiyatDetay', {
                        irsaliyeNo: item.irsaliyeNo,
                        musteriAdi: item.musteriAdi || siparis?.musteriAdi,
                      });
                    }
                  }}>
                  <View style={styles.shipmentHeader}>
                    <View style={[styles.shipmentIcon, { backgroundColor: '#E3F2FD' }]}>
                      <SimpleIcon name="local_shipping" size={18} color="#2196F3" />
                    </View>
                    <View style={styles.shipmentInfo}>
                      <Text style={styles.shipmentNo}>#{item.irsaliyeNo || '-'}</Text>
                      <Text style={styles.shipmentDate}>{formatDate(item.sevkTarihi)}</Text>
                    </View>
                    <Text style={styles.shipmentQty}>{formatNumber(item.toplamSevkMiktari)} adet</Text>
                    <SimpleIcon name="chevron_right" size={20} color={Colors.textSecondary} />
                  </View>
                  {index < sevkiyatlar.length - 1 && <View style={styles.itemDivider} />}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  headerTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  placeholder: { width: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  customerCard: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16,
    marginTop: 16, padding: 16, borderRadius: 16, backgroundColor: Colors.bgWhite,
  },
  customerAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  customerAvatarText: { fontSize: 20, fontWeight: '700' },
  customerInfo: { flex: 1, marginLeft: 12 },
  customerName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  paymentRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  paymentText: { fontSize: 13, color: Colors.textSecondary },
  summaryCard: { marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 16, backgroundColor: Colors.bgWhite },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderNumber: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  orderDate: { fontSize: 13, marginTop: 2, color: Colors.textSecondary },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  divider: { height: 1, marginVertical: 16, backgroundColor: Colors.borderLight },
  statsRow: { flexDirection: 'row' },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, marginHorizontal: 16, backgroundColor: Colors.borderLight },
  statLabel: { fontSize: 12, color: Colors.textSecondary },
  statValue: { fontSize: 16, fontWeight: '600', marginTop: 4, color: Colors.textPrimary },
  tabContainer: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 12, padding: 4,
    borderRadius: 12, gap: 8, backgroundColor: Colors.bgWhite,
  },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 6 },
  tabBtnText: { fontSize: 13, fontWeight: '600' },
  listCard: { marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 16, backgroundColor: Colors.bgWhite },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countText: { fontSize: 13, fontWeight: '600' },
  productItem: { paddingVertical: 12 },
  productName: { fontSize: 14, fontWeight: '600', lineHeight: 20, color: Colors.textPrimary },
  productStats: { flexDirection: 'row', marginTop: 10, gap: 16 },
  productStatCol: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  productStatLabel: { fontSize: 12, color: Colors.textSecondary },
  productStatValue: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  itemDivider: { height: 1, marginTop: 12, backgroundColor: Colors.borderLight },
  expandBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginTop: 8, gap: 4 },
  expandBtnText: { fontSize: 14, fontWeight: '600' },
  shipmentItem: { paddingVertical: 12 },
  shipmentHeader: { flexDirection: 'row', alignItems: 'center' },
  shipmentIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  shipmentInfo: { flex: 1, marginLeft: 12 },
  shipmentNo: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  shipmentDate: { fontSize: 12, marginTop: 2, color: Colors.textSecondary },
  shipmentQty: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  emptyList: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14, marginTop: 8, color: Colors.textSecondary },
});
