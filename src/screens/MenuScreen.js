import React, { useContext, useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  Alert, ActivityIndicator, Platform, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import SimpleIcon from '../components/SimpleIcon';
import { Colors, Shadows } from '../theme';
import { AppDataContext } from '../context/AppDataContext';
import { checkForUpdate, downloadApk, installApk, getCurrentVersion } from '../services/updateService';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_PAD = 16;
const CARD_SIZE = (SCREEN_W - CARD_PAD * 2 - CARD_GAP * 2) / 3;

const menuItems = [
  { icon: 'show-chart', title: 'Üretimler', desc: 'Üretim modülleri', route: 'UretimlerModul', color: '#0095F6', bg: '#E8F4FD' },
  { icon: 'verified', title: 'Kalite', desc: 'Kalite kontrol', route: 'KaliteModul', color: '#7C3AED', bg: '#F3E8FF' },
  { icon: 'description', title: 'Formlar', desc: 'Kontrol formları', route: 'FormlarStack', color: '#059669', bg: '#ECFDF5' },
  { icon: 'bar-chart', title: 'Rapor', desc: 'Günlük raporlar', route: 'RaporStack', color: '#D97706', bg: '#FEF3C7' },
  { icon: 'local-shipping', title: 'Depo Sevk\nHazırlık', desc: 'Depo sevk hazırlık', route: 'DepoSevk', color: '#DC2626', bg: '#FEE2E2' },
  { icon: 'person', title: 'Profil', desc: 'Hesap ve ayarlar', route: 'Profil', color: '#6366F1', bg: '#EEF2FF' },
];

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { loggedInUser, selectedFabrika, logout } = useContext(AppDataContext);

  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentVersionName, setCurrentVersionName] = useState('1.0.0');

  useEffect(() => { getCurrentVersion().then(v => setCurrentVersionName(v.versionName)); }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    checkForUpdate()
      .then(info => setUpdateInfo(info.hasUpdate ? info : null))
      .catch(() => setUpdateInfo(null));
  }, []);

  const handleUpdate = useCallback(async () => {
    if (!updateInfo?.apkUrl) return;
    try {
      setDownloading(true);
      setDownloadProgress(0);
      const apkPath = await downloadApk(updateInfo.apkUrl, p => setDownloadProgress(p));
      setDownloading(false);
      setInstalling(true);
      await installApk(apkPath);
      setInstalling(false);
    } catch (err) {
      setInstalling(false);
      setDownloading(false);
      if (err.message === 'UNKNOWN_SOURCES_REQUIRED') {
        Alert.alert('İzin Gerekli', 'Bilinmeyen kaynaklardan yükleme izni gerekli.');
      } else {
        Alert.alert('Hata', 'Güncelleme başarısız: ' + err.message);
      }
    }
  }, [updateInfo]);

  const handleLogout = () => {
    Alert.alert('Çıkış Yap', 'Hesabınızdan çıkış yapmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: () => { if (logout) logout(); } },
    ]);
  };

  const fullName = loggedInUser?.fullName || loggedInUser?.userName || 'Kullanıcı';
  const initial = fullName.charAt(0).toUpperCase();
  const fabrikaAdi = selectedFabrika?.fabrikaAdi || 'Yeni Çiftlik';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bgWhite} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View>
            <Text style={styles.headerName}>{fullName}</Text>
            <Text style={styles.headerSub}>{fabrikaAdi}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.7}>
          <SimpleIcon name="logout" size={20} color={Colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Update Banner */}
        {Platform.OS === 'android' && updateInfo && (
          <TouchableOpacity
            style={styles.updateBanner}
            onPress={!downloading && !installing ? handleUpdate : undefined}
            activeOpacity={0.8}
          >
            <SimpleIcon name="system-update" size={20} color="#fff" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.updateTitle}>
                {downloading ? `İndiriliyor... %${downloadProgress}` : installing ? 'Kuruluyor...' : `v${updateInfo.serverVersionName} Güncelleme Mevcut`}
              </Text>
            </View>
            {(downloading || installing) ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.updateAction}>Güncelle</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Big Square Menu Grid */}
        <View style={styles.grid}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.card, { width: CARD_SIZE, height: CARD_SIZE }]}
              onPress={() => {
                if (item.route === 'DepoSevk') {
                  navigation.navigate('FormlarStack', { screen: 'FormDetail', params: { formKey: 'depoSevk' } });
                } else {
                  navigation.navigate(item.route);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.cardIcon, { backgroundColor: item.bg }]}>
                <SimpleIcon name={item.icon} size={24} color={item.color} />
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Version */}
        <Text style={styles.version}>Yeni Çiftlik Mobil v{currentVersionName}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgApp },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16, backgroundColor: Colors.bgWhite,
    borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.brandPrimary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  headerSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  logoutBtn: { padding: 8 },
  scroll: { flex: 1 },
  scrollContent: { padding: CARD_PAD, gap: 16 },
  updateBanner: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12,
    backgroundColor: Colors.brandPrimary,
  },
  updateTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  updateAction: { color: '#fff', fontSize: 13, fontWeight: '700', opacity: 0.9 },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP,
  },
  card: {
    backgroundColor: Colors.bgWhite, borderRadius: 16,
    padding: 12, justifyContent: 'center', alignItems: 'center',
    ...Shadows.sm,
  },
  cardIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  cardTitle: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  version: { textAlign: 'center', fontSize: 11, color: Colors.textTertiary },
});
