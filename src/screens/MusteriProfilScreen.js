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
import { getCariOzetler } from '../api/oncuApi';

export default function MusteriProfilScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { oncuToken } = useContext(AppDataContext);

  const musteriKod = route.params?.musteriKod || '';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customer, setCustomer] = useState(null);

  const loadData = useCallback(async () => {
    if (!musteriKod || !oncuToken) { setLoading(false); return; }
    try {
      const res = await getCariOzetler(oncuToken, { musteriAdi: musteriKod });
      if (res?.items?.length > 0) setCustomer(res.items[0]);
    } catch (err) { console.log('Error:', err); }
    finally { setLoading(false); setRefreshing(false); }
  }, [musteriKod, oncuToken]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const formatNumber = (num) => {
    if (num == null) return '-';
    return num.toLocaleString('tr-TR');
  };
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try { return new Date(dateStr).toLocaleDateString('tr-TR'); } catch { return dateStr; }
  };

  const getActivityStatus = () => {
    if (!customer || !customer.siparisSayisi || customer.siparisSayisi === 0)
      return { label: 'Yeni', color: '#2196F3', icon: 'fiber_new' };
    if (customer.sonSiparisTarihi) {
      const lastOrder = new Date(customer.sonSiparisTarihi);
      const daysSince = Math.floor((new Date().getTime() - lastOrder.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince <= 30) return { label: 'Aktif', color: '#4CAF50', icon: 'verified' };
      if (daysSince <= 60) return { label: 'Normal', color: '#FF9800', icon: 'schedule' };
      return { label: 'Pasif', color: '#F44336', icon: 'schedule' };
    }
    return { label: 'Normal', color: '#FF9800', icon: 'schedule' };
  };

  const status = getActivityStatus();

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <SimpleIcon name="arrow_back_ios" size={22} color={Colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Müşteri Profili</Text>
      <View style={styles.placeholder} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brandPrimary} />
        </View>
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        {renderHeader()}
        <View style={styles.emptyContainer}>
          <SimpleIcon name="person_off" size={64} color={Colors.borderLight} />
          <Text style={styles.emptyText}>Müşteri bulunamadı</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {renderHeader()}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}
          tintColor={Colors.brandPrimary} colors={[Colors.brandPrimary]} />}>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={[styles.avatarRing, { borderColor: Colors.brandPrimary }]}>
              <View style={[styles.avatar, { backgroundColor: Colors.bgApp }]}>
                <Text style={[styles.avatarText, { color: Colors.brandPrimary }]}>
                  {customer.musteriAdi?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            </View>
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{formatNumber(customer.siparisSayisi)}</Text>
                <Text style={styles.statLabel}>Sipariş</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{formatNumber(customer.toplamSiparisMiktari)}</Text>
                <Text style={styles.statLabel}>Miktar</Text>
              </View>
            </View>
          </View>

          <Text style={styles.customerName}>{customer.musteriAdi}</Text>

          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
              <SimpleIcon name={status.icon} size={14} color={status.color} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>

          {customer.musteriKodu && (
            <Text style={styles.customerCode}>@{customer.musteriKodu}</Text>
          )}
        </View>

        {/* Info Cards */}
        <View style={styles.infoCard}>
          {customer.odemePlani && (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#4CAF5015' }]}>
                <SimpleIcon name="credit_card" size={18} color="#4CAF50" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Ödeme Planı</Text>
                <Text style={styles.infoValue}>{customer.odemePlani}</Text>
              </View>
            </View>
          )}
          {(customer.sehir || customer.ulke) && (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: `${Colors.brandPrimary}15` }]}>
                <SimpleIcon name="location_on" size={18} color={Colors.brandPrimary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Konum</Text>
                <Text style={styles.infoValue}>
                  {[customer.sehir, customer.ulke].filter(Boolean).join(', ')}
                </Text>
              </View>
            </View>
          )}
          {customer.adres && (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#2196F315' }]}>
                <SimpleIcon name="business" size={18} color="#2196F3" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Adres</Text>
                <Text style={styles.infoValue} numberOfLines={3}>{customer.adres}</Text>
              </View>
            </View>
          )}
          {customer.sonSiparisTarihi && (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#FF980015' }]}>
                <SimpleIcon name="event" size={18} color="#FF9800" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Son Sipariş</Text>
                <Text style={styles.infoValue}>{formatDate(customer.sonSiparisTarihi)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>Hızlı İşlemler</Text>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.actionRow}
            onPress={() => navigation.navigate('Siparisler', { musteriAdi: customer.musteriAdi })}
            activeOpacity={0.6}>
            <View style={[styles.actionIcon, { backgroundColor: `${Colors.brandPrimary}15` }]}>
              <SimpleIcon name="receipt_long" size={20} color={Colors.brandPrimary} />
            </View>
            <Text style={styles.actionText}>Siparişleri Görüntüle</Text>
            <SimpleIcon name="chevron_right" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

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
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  emptyText: { fontSize: 16, fontWeight: '500', color: Colors.textSecondary },
  scrollView: { flex: 1 },
  profileCard: { marginHorizontal: 16, marginTop: 16, padding: 20, borderRadius: 16, backgroundColor: Colors.bgWhite },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  avatarRing: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 76, height: 76, borderRadius: 38, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 32, fontWeight: '700' },
  statsContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  statBox: { alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  statLabel: { fontSize: 13, marginTop: 2, color: Colors.textSecondary },
  customerName: { fontSize: 18, fontWeight: '700', lineHeight: 24, color: Colors.textPrimary, marginTop: 16 },
  badgeRow: { marginTop: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  customerCode: { fontSize: 14, marginTop: 4, color: Colors.textSecondary },
  infoCard: { marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 16, gap: 16, backgroundColor: Colors.bgWhite },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: Colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600', marginTop: 2, color: Colors.textPrimary },
  actionsCard: { marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 16, backgroundColor: Colors.bgWhite },
  actionsTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  divider: { height: 1, marginVertical: 12, backgroundColor: Colors.borderLight },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  actionIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  actionText: { flex: 1, fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
});
