import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar,
  ActivityIndicator, RefreshControl, Alert, Dimensions, Modal,
  ScrollView, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import SimpleIcon from '../components/SimpleIcon';
import { Colors, Shadows } from '../theme';
import { AppDataContext } from '../context/AppDataContext';
import { getArizaKayitlari, resolveArizaKayit } from '../api/arizaApi';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ArizaListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { oncuToken, loggedInUser } = useContext(AppDataContext);

  const [kayitlar, setKayitlar] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [durum, setDurum] = useState(null); // null = all, 'Arizali' = open, 'Cozuldu' = closed

  // Detail modal state
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // Resolve modal state
  const [resolveVisible, setResolveVisible] = useState(false);
  const [cozumText, setCozumText] = useState('');
  const [kapanisNotu, setKapanisNotu] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const loadData = useCallback(async () => {
    if (!oncuToken) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await getArizaKayitlari(oncuToken, {
        factoryNo: 2,
        pageSize: 50,
      });

      if (Array.isArray(response)) {
        setKayitlar(response);
      } else {
        setKayitlar([]);
        setError('Beklenmeyen veri formatı');
      }
    } catch (err) {
      setError(err.message || 'Bağlantı hatası');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [oncuToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const filteredKayitlar = durum
    ? kayitlar.filter((k) => k.durum === durum)
    : kayitlar;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
  };

  const getDurumBadgeColor = (durum) => {
    if (durum === 'Arizali') return '#FBBF24'; // amber
    if (durum === 'Cozuldu') return Colors.success;
    return Colors.textSecondary;
  };

  const getDurumText = (durum) => {
    if (durum === 'Arizali') return 'Arızalı';
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

  const openDetail = (item) => {
    setSelectedItem(item);
    setDetailVisible(true);
  };

  const closeDetail = () => {
    setDetailVisible(false);
    setSelectedItem(null);
  };

  const openResolve = () => {
    setCozumText('');
    setKapanisNotu('');
    setResolveVisible(true);
  };

  const handleResolve = async () => {
    if (!cozumText.trim()) {
      Alert.alert('Uyarı', 'Çözüm açıklaması giriniz.');
      return;
    }
    setIsResolving(true);
    try {
      await resolveArizaKayit(oncuToken, selectedItem.id, {
        arizaCozumu: cozumText.trim(),
        cozenKullanici: loggedInUser?.userName || loggedInUser?.username || '',
        kapanisNotu: kapanisNotu.trim(),
      });
      Alert.alert('Başarılı', 'Arıza kaydı çözüldü.');
      setResolveVisible(false);
      closeDetail();
      loadData();
    } catch (err) {
      Alert.alert('Hata', err.message || 'Çözüm kaydedilemedi.');
    } finally {
      setIsResolving(false);
    }
  };

  const DetailRow = ({ label, value }) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || '-'}</Text>
    </View>
  );

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}
      activeOpacity={0.7}
      onPress={() => openDetail(item)}
    >
      <View style={styles.cellMakine}>
        <Text style={styles.cellMakineCode} numberOfLines={1}>{item.makineKodu}</Text>
      </View>
      <View style={styles.cellNeden}>
        <Text style={styles.cellText} numberOfLines={2}>{item.arizaNedeni}</Text>
      </View>
      <View style={styles.cellDurum}>
        <View style={[styles.durumBadge, { backgroundColor: getDurumBadgeColor(item.durum) }]}>
          <Text style={styles.durumText}>{getDurumText(item.durum)}</Text>
        </View>
      </View>
      <View style={styles.cellTarih}>
        <Text style={styles.cellDateText}>{formatDate(item.kayitTarihiSaat)}</Text>
      </View>
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
        <TouchableOpacity style={styles.addHeaderBtn} onPress={() => navigation.navigate('ArizaQRScan')} activeOpacity={0.7}>
          <SimpleIcon name="add" size={18} color="#FFF" />
          <Text style={styles.addHeaderBtnText}>Yeni</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, !durum && styles.filterTabActive]}
          onPress={() => setDurum(null)}>
          <Text
            style={[
              styles.filterTabText,
              !durum && styles.filterTabTextActive,
            ]}>
            Tümü
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, durum === 'Arizali' && styles.filterTabActive]}
          onPress={() => setDurum('Arizali')}>
          <View style={styles.filterTabBadge}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FBBF24' }} />
            <Text
              style={[
                styles.filterTabText,
                durum === 'Arizali' && styles.filterTabTextActive,
              ]}>
              Açık
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, durum === 'Cozuldu' && styles.filterTabActive]}
          onPress={() => setDurum('Cozuldu')}>
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
        <>
          {/* Table Header */}
          {filteredKayitlar.length > 0 && (
            <View style={styles.tableHeader}>
              <View style={styles.cellMakine}><Text style={styles.thText}>Makine</Text></View>
              <View style={styles.cellNeden}><Text style={styles.thText}>Arıza Nedeni</Text></View>
              <View style={styles.cellDurum}><Text style={styles.thText}>Durum</Text></View>
              <View style={styles.cellTarih}><Text style={styles.thText}>Tarih</Text></View>
            </View>
          )}
          <FlatList
            data={filteredKayitlar}
            renderItem={renderItem}
            keyExtractor={(item, idx) => `${item.id}-${idx}`}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={emptyComponent}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
            scrollEnabled={filteredKayitlar.length > 0}
          />
        </>
      )}

      {/* Detail Modal */}
      <Modal
        visible={detailVisible}
        animationType="fade"
        transparent
        onRequestClose={closeDetail}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Arıza Detayı</Text>
              <TouchableOpacity onPress={closeDetail} style={styles.modalCloseBtn}>
                <SimpleIcon name="close" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <DetailRow label="MAKİNE KODU" value={selectedItem.makineKodu} />
                <DetailRow label="ARIZA NEDENİ / ÇÖZÜMÜ" value={selectedItem.arizaNedeni} />
                {selectedItem.durum === 'Cozuldu' && selectedItem.arizaCozumu && (
                  <DetailRow label="ÇÖZÜM" value={selectedItem.arizaCozumu} />
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>DURUM</Text>
                  <View style={[styles.durumBadge, { backgroundColor: getDurumBadgeColor(selectedItem.durum) }]}>
                    <Text style={styles.durumText}>{getDurumText(selectedItem.durum)}</Text>
                  </View>
                </View>
                <DetailRow label="KAYIT TARİHİ - SAAT" value={formatDate(selectedItem.kayitTarihiSaat)} />
                <DetailRow label="ÇÖZÜM TARİHİ - SAAT" value={formatDate(selectedItem.cozumTarihiSaat)} />
                <DetailRow label="DURUŞ (DK)" value={selectedItem.durusDk != null ? String(selectedItem.durusDk) : '-'} />
                <DetailRow label="AÇAN" value={selectedItem.acanKullanici} />
                <DetailRow label="ÇÖZEN" value={selectedItem.cozenKullanici} />
                <DetailRow label="KAPANIŞ NOTU" value={selectedItem.kapanisNotu} />

                {selectedItem.durum === 'Arizali' && (
                  <TouchableOpacity style={styles.resolveBtn} onPress={openResolve} activeOpacity={0.7}>
                    <SimpleIcon name="check_circle" size={18} color="#FFF" />
                    <Text style={styles.resolveBtnText}>Çöz</Text>
                  </TouchableOpacity>
                )}

                <View style={{ height: 40 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Resolve Modal */}
      <Modal
        visible={resolveVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setResolveVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.resolveModalContainer}>
            <Text style={styles.resolveModalTitle}>Arızayı Çöz</Text>
            <Text style={styles.resolveModalSubtitle}>
              {selectedItem?.makineKodu} - {selectedItem?.arizaNedeni}
            </Text>

            <Text style={styles.inputLabel}>Çözüm Açıklaması *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Çözüm açıklamasını giriniz..."
              placeholderTextColor={Colors.textSecondary}
              value={cozumText}
              onChangeText={setCozumText}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Kapanış Notu</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Kapanış notu (opsiyonel)..."
              placeholderTextColor={Colors.textSecondary}
              value={kapanisNotu}
              onChangeText={setKapanisNotu}
              multiline
              numberOfLines={2}
            />

            <View style={styles.resolveModalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setResolveVisible(false)}>
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, isResolving && { opacity: 0.6 }]}
                onPress={handleResolve}
                disabled={isResolving}>
                {isResolving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>Çöz</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  addHeaderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: Colors.brandPrimary,
  },
  addHeaderBtnText: { fontSize: 13, fontWeight: '600', color: '#FFF' },
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
  // Table
  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: Colors.bgSurface,
    borderBottomWidth: 1, borderBottomColor: Colors.borderColor,
  },
  thText: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.bgWhite,
    minHeight: 52,
  },
  tableRowEven: { backgroundColor: '#FAFBFC' },
  cellMakine: { flex: 2, paddingRight: 8 },
  cellMakineCode: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  cellNeden: { flex: 3, paddingRight: 8 },
  cellText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 16 },
  cellDurum: { flex: 1.5, alignItems: 'center' },
  cellTarih: { flex: 2, alignItems: 'flex-end' },
  cellDateText: { fontSize: 10, color: Colors.textSecondary },
  listContent: { paddingBottom: 40 },
  durumBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durumText: { fontSize: 9, fontWeight: '600', color: '#000' },
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
  // Detail Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: Colors.bgWhite,
    borderRadius: 16,
    width: '90%',
    maxWidth: 440,
    maxHeight: '85%',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  modalCloseBtn: { padding: 4 },
  modalBody: { marginTop: 12 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 0.4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    flex: 0.6,
    textAlign: 'right',
  },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 14,
    backgroundColor: Colors.brandPrimary,
    borderRadius: 10,
  },
  resolveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  // Resolve Modal
  resolveModalContainer: {
    backgroundColor: Colors.bgWhite,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    alignSelf: 'center',
    width: SCREEN_WIDTH - 40,
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  resolveModalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  resolveModalSubtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6 },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.bgSurface,
    marginBottom: 16,
    textAlignVertical: 'top',
    minHeight: 60,
  },
  resolveModalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.brandPrimary,
    alignItems: 'center',
  },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});