import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar,
  ActivityIndicator, RefreshControl, Alert, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import SimpleIcon from '../components/SimpleIcon';
import { Colors, Shadows } from '../theme';
import { AppDataContext } from '../context/AppDataContext';
import { getArizaKayitlari } from '../api/arizaApi';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ArizaListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { oncuToken } = useContext(AppDataContext);

  const [kayitlar, setKayitlar] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [durum, setDurum] = useState(null); // null = all, 'Acik' = open, 'Cozuldu' = closed

  const loadData = useCallback(async () => {
    if (!oncuToken) return;
    try {
      setError(null);
      const response = await getArizaKayitlari(oncuToken, {
        factoryNo: 2,
        durum: durum || undefined,
        pageSize: 50,
      });

      if (response.success) {
        setKayitlar(response.data || []);
      } else {
        setError(response.message || 'Veriler yüklenemedi');
      }
    } catch (err) {
      setError(err.message || 'Bağlantı hatası');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [oncuToken, durum]);

  useEffect(() => {
    setIsLoading(true);
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
  };

  const getDurumBadgeColor = (durum) => {
    if (durum === 'Acik') return '#FBBF24'; // amber
    if (durum === 'Cozuldu') return Colors.success;
    return Colors.textSecondary;
  };

  const getDurumText = (durum) => {
    if (durum === 'Acik') return 'Açık';
    if (durum === 'Cozuldu') return 'Çözüldü';
    return durum || '-';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => navigation.navigate('ArizaDetail', { id: item.id })}>
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.makineKodu}>{item.makineKodu}</Text>
          </View>
          <View
            style={[
              styles.durumBadge,
              { backgroundColor: getDurumBadgeColor(item.durum) },
            ]}>
            <Text style={styles.durumText}>{getDurumText(item.durum)}</Text>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {item.durum === 'Cozuldu' && item.arizaCozumu
            ? item.arizaCozumu
            : item.arizaNedeni}
        </Text>

        <View style={styles.itemFooter}>
          <SimpleIcon name="schedule" size={12} color={Colors.textSecondary} />
          <Text style={styles.tarih}>
            {item.durum === 'Cozuldu'
              ? formatDate(item.captilidiTarih)
              : formatDate(item.acildiTarih)}
          </Text>
        </View>
      </View>
      <SimpleIcon name="chevron_right" size={20} color={Colors.textSecondary} />
    </TouchableOpacity>
  );

  const emptyComponent = () => (
    <View style={styles.emptyContainer}>
      <SimpleIcon name="inbox" size={48} color={Colors.textSecondary} />
      <Text style={styles.emptyTitle}>
        {durum ? `${getDurumText(durum)} kayıt yok` : 'Kayıt bulunmuyor'}
      </Text>
      <Text style={styles.emptyText}>
        {durum
          ? 'Bu durumda kayıt bulunmamaktadır.'
          : 'Yeni bir arıza kaydı açarak başlayın.'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bgWhite} />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}>
          <SimpleIcon name="arrow_back_ios" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Arıza Kayıtları</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, !durum && styles.filterTabActive]}
          onPress={() => {
            setDurum(null);
            setIsLoading(true);
            getArizaKayitlari(oncuToken, { factoryNo: 2, pageSize: 50 }).then((res) => {
              if (res.success) setKayitlar(res.data || []);
              setIsLoading(false);
            });
          }}>
          <Text
            style={[
              styles.filterTabText,
              !durum && styles.filterTabTextActive,
            ]}>
            Tümü
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, durum === 'Acik' && styles.filterTabActive]}
          onPress={() => {
            setDurum('Acik');
            setIsLoading(true);
            getArizaKayitlari(oncuToken, { factoryNo: 2, durum: 'Acik', pageSize: 50 }).then((res) => {
              if (res.success) setKayitlar(res.data || []);
              setIsLoading(false);
            });
          }}>
          <View style={styles.filterTabBadge}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FBBF24' }} />
            <Text
              style={[
                styles.filterTabText,
                durum === 'Acik' && styles.filterTabTextActive,
              ]}>
              Açık
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, durum === 'Cozuldu' && styles.filterTabActive]}
          onPress={() => {
            setDurum('Cozuldu');
            setIsLoading(true);
            getArizaKayitlari(oncuToken, { factoryNo: 2, durum: 'Cozuldu', pageSize: 50 }).then((res) => {
              if (res.success) setKayitlar(res.data || []);
              setIsLoading(false);
            });
          }}>
          <View style={styles.filterTabBadge}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success }} />
            <Text
              style={[
                styles.filterTabText,
                durum === 'Cozuldu' && styles.filterTabTextActive,
              ]}>
              Çözüldü
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* List */}
      {isLoading &&!isRefreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.brandPrimary} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <SimpleIcon name="error_outline" size={48} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={kayitlar}
          renderItem={renderItem}
          keyExtractor={(item, idx) => `${item.id}-${idx}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={emptyComponent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
          scrollEnabled={kayitlar.length > 0}
        />
      )}

      {/* FAB - New record */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ArizaQRScan')}
        activeOpacity={0.7}>
        <SimpleIcon name="add" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgApp },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.bgWhite,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  backBtn: { padding: 4, width: 40 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 6,
    backgroundColor: Colors.bgWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.bgSurface,
  },
  filterTabActive: {
    backgroundColor: Colors.brandPrimary,
    borderColor: Colors.brandPrimary,
  },
  filterTabBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  filterTabText: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary, textAlign: 'center' },
  filterTabTextActive: { color: '#FFF' },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  listContent: { padding: 12, gap: 10 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.bgWhite,
    borderRadius: 12,
    ...Shadows.sm,
  },
  itemContent: { flex: 1, gap: 6 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  makineKodu: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  durumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durumText: { fontSize: 10, fontWeight: '600', color: '#000' },
  arizaNedeni: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  cozumLabel: { fontWeight: '600', color: Colors.success },
  arizaCozumu: { fontSize: 12, color: Colors.success, lineHeight: 16 },
  itemFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  tarih: { fontSize: 11, color: Colors.textSecondary },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', maxWidth: SCREEN_WIDTH - 64 },
  errorText: { fontSize: 14, color: Colors.danger, marginVertical: 16, textAlign: 'center' },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.brandPrimary,
    borderRadius: 6,
  },
  retryButtonText: { fontSize: 12, fontWeight: '600', color: '#FFF' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.brandPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
});
