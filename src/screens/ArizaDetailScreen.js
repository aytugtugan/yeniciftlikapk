import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, StatusBar,
  ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SimpleIcon from '../components/SimpleIcon';
import { Colors, Shadows } from '../theme';
import { AppDataContext } from '../context/AppDataContext';
import { getArizaKayitById, resolveArizaKayit } from '../api/arizaApi';

export default function ArizaDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { oncuToken, loggedInUser } = useContext(AppDataContext);
  const id = route.params?.id;

  const [kayit, setKayit] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [cozumuValue, setCozumuValue] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [resolveErrors, setResolveErrors] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!oncuToken || !id) {
      setError('Gerekli parametreler eksik');
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await getArizaKayitById(oncuToken, id);
      if (response && response.id) {
        setKayit(response);
      } else {
        setError('Veriler yüklenemedi');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const validateResolveForm = () => {
    const newErrors = {};
    if (!cozumuValue.trim()) {
      newErrors.cozumu = 'Çözüm açıklaması boş olamaz';
    }
    if (cozumuValue.trim().length > 500) {
      newErrors.cozumu = 'Çözüm açıklaması 500 karakterden fazla olamaz';
    }
    setResolveErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResolve = async () => {
    if (!validateResolveForm()) return;

    setIsResolving(true);
    try {
      const response = await resolveArizaKayit(oncuToken, id, cozumuValue.trim(), loggedInUser?.userName || loggedInUser?.username || 'Bilinmiyor');
      Alert.alert('Başarılı', 'Arıza kaydı başarıyla çözüldü.', [
        {
          text: 'Tamam',
          onPress: () => {
            setShowResolveModal(false);
            loadData();
          },
        },
      ]);
    } catch (err) {
      Alert.alert('Hata', err.message || 'Bir hata oluştu');
    } finally {
      setIsResolving(false);
    }
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

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.brandPrimary} />
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
            <SimpleIcon name="arrow_back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Arıza Detayı</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.brandPrimary} />
        </View>
      </View>
    );
  }

  if (error || !kayit) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.brandPrimary} />
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
            <SimpleIcon name="arrow_back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Arıza Detayı</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.centerContainer}>
          <SimpleIcon name="error_outline" size={48} color={Colors.danger} />
          <Text style={styles.errorText}>{error || 'Kayıt bulunamadı'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isOpen = kayit.durum === 'Acik';
  const durumColor = isOpen ? '#FBBF24' : Colors.success;
  const durumText = isOpen ? 'Açık' : 'Çözüldü';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.brandPrimary} />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <SimpleIcon name="arrow_back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Arıza Detayı</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { backgroundColor: durumColor }]}>
            <SimpleIcon
              name={isOpen ? 'error' : 'check_circle'}
              size={24}
              color="#FFF"
            />
            <View>
              <Text style={styles.statusLabel}>Durum</Text>
              <Text style={styles.statusValue}>{durumText}</Text>
            </View>
          </View>
        </View>

        {/* Content Cards */}
        <View style={styles.contentArea}>
          {/* Makine Kodu */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <SimpleIcon name="precision_manufacturing" size={20} color={Colors.brandPrimary} />
              <Text style={styles.cardTitle}>Makine Kodu</Text>
            </View>
            <Text style={styles.cardValue}>{kayit.makineKodu}</Text>
          </View>

          {/* Arıza Nedeni */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <SimpleIcon name="warning" size={20} color={Colors.warning} />
              <Text style={styles.cardTitle}>Arıza Nedeni</Text>
            </View>
            <Text style={styles.cardValue}>{kayit.arizaNedeni}</Text>
            <Text style={styles.cardMeta}>
              Açıldı: {formatDate(kayit.kayitTarihiSaat)}
            </Text>
          </View>

          {/* Arıza Çözümü */}
          {kayit.arizaCozumu && (
            <View style={[styles.card, { borderLeftColor: Colors.success }]}>
              <View style={styles.cardHeader}>
                <SimpleIcon name="check_circle" size={20} color={Colors.success} />
                <Text style={styles.cardTitle}>Çözüm Açıklaması</Text>
              </View>
              <Text style={styles.cardValue}>{kayit.arizaCozumu}</Text>
              {kayit.cozumTarihiSaat && (
                <Text style={styles.cardMeta}>
                  Çözüldü: {formatDate(kayit.cozumTarihiSaat)}
                </Text>
              )}
            </View>
          )}

          {!kayit.arizaCozumu && (
            <View style={styles.infoBox}>
              <SimpleIcon name="info" size={16} color={Colors.warning} />
              <Text style={styles.infoText}>Bu arıza kaydı henüz çözülmemiştir.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Resolve Button */}
      {isOpen && (
        <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={styles.resolveButton}
            onPress={() => setShowResolveModal(true)}>
            <SimpleIcon name="check_circle" size={20} color="#FFF" />
            <Text style={styles.resolveButtonText}>Sorunu Çöz</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Resolve Modal */}
      <Modal visible={showResolveModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}>
          <View style={styles.modalOverlay} />
          <View style={[styles.modalContent, { paddingTop: insets.top }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowResolveModal(false)}>
                <SimpleIcon name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>Sorunu Çöz</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalLabel}>Çözüm Açıklaması *</Text>
              <View style={styles.textAreaContainer}>
                <TextInput
                  style={styles.textArea}
                  placeholder="Yapılan çalışmaları ve çözümü detaylı olarak açıklayınız..."
                  value={cozumuValue}
                  onChangeText={setCozumuValue}
                  multiline
                  numberOfLines={6}
                  placeholderTextColor={Colors.textSecondary}
                  textAlignVertical="top"
                />
              </View>
              <Text style={styles.charCounter}>{cozumuValue.length}/500</Text>
              {resolveErrors.cozumu && (
                <Text style={styles.errorText}>{resolveErrors.cozumu}</Text>
              )}
            </ScrollView>

            <View style={[styles.modalActions, { paddingBottom: insets.bottom + 16 }]}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowResolveModal(false)}
                disabled={isResolving}>
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, isResolving && { opacity: 0.6 }]}
                onPress={handleResolve}
                disabled={isResolving}>
                {isResolving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <SimpleIcon name="save" size={18} color="#FFF" />
                    <Text style={styles.submitBtnText}>Kaydet</Text>
                  </>
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
    paddingHorizontal: 8,
    paddingBottom: 12,
    backgroundColor: Colors.brandPrimary,
    ...Shadows.md,
  },
  headerBtn: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#FFF', flex: 1, textAlign: 'center' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scrollView: { flex: 1 },
  statusSection: { padding: 16, backgroundColor: Colors.bgWhite, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  statusLabel: { fontSize: 12, color: 'rgba(0,0,0,0.6)', fontWeight: '500' },
  statusValue: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  contentArea: { padding: 16, gap: 12 },
  card: {
    backgroundColor: Colors.bgWhite,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.brandPrimary,
    ...Shadows.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  cardValue: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  cardMeta: { fontSize: 11, color: Colors.textSecondary, marginTop: 8 },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  infoText: { flex: 1, fontSize: 13, color: Colors.textPrimary },
  bottomContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.bgWhite,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  resolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: Colors.success,
    borderRadius: 8,
    gap: 8,
  },
  resolveButtonText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  errorText: { fontSize: 12, color: Colors.danger, marginTop: 6 },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.brandPrimary,
    borderRadius: 6,
  },
  retryButtonText: { fontSize: 12, fontWeight: '600', color: '#FFF' },
  modalContainer: { flex: 1 },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: {
    backgroundColor: Colors.bgApp,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.bgWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalHeaderTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  modalBody: { flex: 1, padding: 16 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8 },
  textAreaContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.bgWhite,
    padding: 12,
    marginBottom: 6,
  },
  textArea: { fontSize: 14, color: Colors.textPrimary, maxHeight: 150 },
  charCounter: { fontSize: 12, color: Colors.textSecondary, marginBottom: 12 },
  modalActions: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.bgWhite,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    flexDirection: 'row',
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.success,
    borderRadius: 8,
    gap: 6,
  },
  submitBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
});
