import React, { useState, useCallback, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SimpleIcon from '../components/SimpleIcon';
import { Colors, Shadows } from '../theme';
import { AppDataContext } from '../context/AppDataContext';
import { createUretimKayit } from '../api/oncuApi';

export default function KaliteKontrolOnizlemeScreen({ navigation, route }) {
  const { oncuToken } = useContext(AppDataContext);
  const insets = useSafeAreaInsets();
  const payload = route.params?.payload;
  const displayData = route.params?.displayData;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isYRM = (displayData?.kod || '').toUpperCase().includes('YRM');
  const stationFactoryCode = displayData?.stationFactoryCode || '';
  const isFactory2 = stationFactoryCode === '2';
  const hatNameUpper = (displayData?.uretimHatti || '').toUpperCase().replace(/İ/g, 'I');
  const isDolum = isFactory2 && hatNameUpper.includes('DOLUM');
  const isKolileme = isFactory2 && !hatNameUpper.includes('DOLUM');
  const hideHologram = isFactory2;

  const handleSubmit = useCallback(async () => {
    if (!payload || !oncuToken) return;
    setIsSubmitting(true);
    try {
      const response = await createUretimKayit(oncuToken, payload);
      if (response.success) {
        Alert.alert('Başarılı', 'Kalite kontrol kaydı başarıyla oluşturuldu.', [
          { text: 'Tamam', onPress: () => navigation.popToTop() },
        ]);
      } else {
        Alert.alert('Hata', response.message || 'Kayıt oluşturulamadı.');
      }
    } catch (err) {
      Alert.alert('Hata', err.message || 'Bağlantı hatası oluştu.');
    } finally { setIsSubmitting(false); }
  }, [payload, oncuToken, navigation]);

  if (!payload) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.brandPrimary} />
        <View style={styles.errorContainer}>
          <SimpleIcon name="error_outline" size={64} color={Colors.brandPrimary} />
          <Text style={styles.errorText}>Önizleme verisi bulunamadı</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const PreviewRow = ({ label, value }) => {
    if (!value || value === '-' || value === '0') return null;
    return (
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue} numberOfLines={2}>{value}</Text>
      </View>
    );
  };

  const SectionHeader = ({ title, icon }) => (
    <View style={styles.sectionHeader}>
      <SimpleIcon name={icon} size={20} color={Colors.brandPrimary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.brandPrimary} />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <SimpleIcon name="arrow_back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Kontrol Önizleme</Text>
          <Text style={styles.headerSubtitle}>Gönderilecek verileri kontrol edin</Text>
        </View>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <SectionHeader title="Ürün Bilgileri" icon="inventory_2" />
          <PreviewRow label="Fiş No" value={displayData?.fisNo || payload.fisNo} />
          <PreviewRow label="Kod" value={displayData?.kod || ''} />
          <PreviewRow label="Ürün Adı" value={displayData?.urunAdi || ''} />
          <PreviewRow label="P.No" value={displayData?.pNo || ''} />
        </View>

        <View style={styles.card}>
          <SectionHeader title="Üretim Bilgileri" icon="precision_manufacturing" />
          <PreviewRow label="Üretim Tarihi" value={displayData?.uretimTarihi || ''} />
          <PreviewRow label="TETT" value={displayData?.tett || ''} />
          {(isFactory2 ? isDolum : true) && <PreviewRow label="İnjectleme" value={displayData?.injectleme || ''} />}
          <PreviewRow label="Üretim Hattı" value={displayData?.uretimHatti || ''} />
        </View>

        <View style={styles.card}>
          <SectionHeader title="Ambalaj Bilgileri" icon="local_shipping" />
          <PreviewRow label="Ambalaj Adı" value={displayData?.ambalajAdi || ''} />
          <PreviewRow label="Kapak Adı" value={displayData?.kapakAdi || ''} />
          <PreviewRow label="Kapak Barkod" value={displayData?.kapakBarkod || payload.kapakBarkod} />
          {!hideHologram && <>
            <PreviewRow label="Hologram" value={displayData?.hologram || payload.hologram} />
            <PreviewRow label="Hologram Lot" value={displayData?.hologramLot || payload.hologramLot || '-'} />
          </>}
        </View>

        <View style={styles.card}>
          <SectionHeader title={isKolileme ? 'Ürün Bilgileri' : 'Etiket Bilgileri'} icon="label" />
          <PreviewRow label={isKolileme ? 'Ürün Adı' : 'Etiket Adı'} value={displayData?.etiketAdi || ''} />
          <PreviewRow label={isKolileme ? 'Ürün Barkod' : 'Etiket Barkod'} value={displayData?.etiketBarkod || ''} />
          <PreviewRow label={isKolileme ? 'Ürün Lot' : 'Etiket Lot'} value={displayData?.etiketLot || payload.etiketLot || '-'} />
        </View>

        {!isYRM && !isDolum && (
          <View style={styles.card}>
            <SectionHeader title="Koli Bilgileri" icon="all_inbox" />
            <PreviewRow label="Koli Adı" value={displayData?.koliAdi || ''} />
            <PreviewRow label="Koli Barkod" value={displayData?.koliBarkod || ''} />
            <PreviewRow label="Koli Lot" value={displayData?.koliLot || payload.koliLot || '-'} />
          </View>
        )}

        <View style={styles.card}>
          <SectionHeader title="Operatör Bilgileri" icon="person" />
          <PreviewRow label="Operatör Adı" value={displayData?.operatorAdi || payload.operatorAdi || '-'} />
        </View>

        <View style={styles.infoNotice}>
          <SimpleIcon name="check_circle" size={20} color={Colors.success} />
          <Text style={styles.infoText}>Tüm kontroller tamamlandı. Raporu göndermek için onaylayın.</Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <SimpleIcon name="edit" size={20} color={Colors.textPrimary} />
          <Text style={styles.cancelBtnText}>Düzenle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator size="small" color="#FFF" /> : <>
            <SimpleIcon name="send" size={20} color="#FFF" />
            <Text style={styles.submitBtnText}>Onayla ve Gönder</Text>
          </>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgApp },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 16, backgroundColor: Colors.brandPrimary, ...Shadows.md },
  headerBtn: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  card: { borderRadius: 12, padding: 16, backgroundColor: Colors.bgWhite, ...Shadows.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  rowLabel: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  rowValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, flex: 2, textAlign: 'right' },
  infoNotice: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, gap: 8, marginTop: 4, backgroundColor: Colors.successLight },
  infoText: { fontSize: 13, flex: 1, color: Colors.success },
  bottomActions: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight, backgroundColor: Colors.bgWhite },
  cancelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 10, gap: 8, borderWidth: 1, borderColor: Colors.borderLight },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  submitBtn: { flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 10, gap: 8, backgroundColor: Colors.success },
  submitBtnText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 16, marginTop: 16, textAlign: 'center', color: Colors.textPrimary },
  backButton: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, backgroundColor: Colors.brandPrimary },
  backButtonText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});
