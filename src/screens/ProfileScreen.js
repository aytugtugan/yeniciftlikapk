import React, { useContext, useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, Platform, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SimpleIcon from '../components/SimpleIcon';
import { Colors, Shadows, Radius, Spacing } from '../theme';
import { AppDataContext } from '../context/AppDataContext';
import { checkForUpdate, downloadApk, installApk, getCurrentVersion } from '../services/updateService';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { loggedInUser, selectedFabrika, logout } = useContext(AppDataContext);

  const [updateInfo, setUpdateInfo] = useState(null);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentVersionName, setCurrentVersionName] = useState('1.0.0');

  useEffect(() => {
    getCurrentVersion().then(v => setCurrentVersionName(v.versionName));
  }, []);

  const doDownload = useCallback(async (apkUrl) => {
    try {
      setDownloading(true);
      setInstalling(false);
      setDownloadProgress(0);
      const apkPath = await downloadApk(apkUrl, (p) => setDownloadProgress(p));
      setDownloading(false);
      setInstalling(true);
      await installApk(apkPath);
      setInstalling(false);
    } catch (err) {
      setInstalling(false);
      setDownloading(false);
      if (err.message === 'UNKNOWN_SOURCES_REQUIRED') {
        Alert.alert('İzin Gerekli', 'Bilinmeyen kaynaklardan yükleme izni gerekli. Ayarlardan izin verdikten sonra tekrar deneyin.');
      } else {
        Alert.alert('Hata', 'Güncelleme başarısız: ' + err.message);
      }
    }
  }, []);

  // Tek fonksiyon: kontrol et, güncelleme varsa hemen indir
  const checkAndUpdate = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    if (downloading || installing) return;
    try {
      setChecking(true);
      const info = await checkForUpdate();
      if (info.hasUpdate && info.apkUrl) {
        setUpdateInfo(info);
        setChecking(false);
        doDownload(info.apkUrl);
      } else {
        setUpdateInfo(null);
        setChecking(false);
        Alert.alert('Güncel', 'Uygulamanız güncel, yeni sürüm yok.');
      }
    } catch (err) {
      setChecking(false);
      Alert.alert('Hata', 'Güncelleme kontrolü başarısız: ' + err.message);
      setUpdateInfo(null);
    }
  }, [doDownload, downloading, installing]);

  // Sayfa açılınca sadece kontrol et (indirme)
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    setChecking(true);
    checkForUpdate()
      .then(info => setUpdateInfo(info.hasUpdate ? info : null))
      .catch(() => setUpdateInfo(null))
      .finally(() => setChecking(false));
  }, []);

  // Güncelle badge'ine basınca direkt indir (updateInfo zaten var)
  const handleUpdate = useCallback(async () => {
    if (!updateInfo?.apkUrl || downloading || installing) return;
    doDownload(updateInfo.apkUrl);
  }, [updateInfo, doDownload, downloading, installing]);

  const fullName = loggedInUser?.fullName || loggedInUser?.userName || loggedInUser?.username || 'Kullanıcı';
  const initial = fullName.charAt(0).toUpperCase();
  const username = loggedInUser?.userName || loggedInUser?.username || 'user';
  const role = loggedInUser?.role || 'Kullanıcı';
  const userId = loggedInUser?.userId || '-';
  const fabrikaAdi = selectedFabrika?.fabrikaAdi || 'Yeni Çiftlik';

  const formatRole = (r) => {
    if (!r) return 'Kullanıcı';
    switch (r.toLowerCase()) {
      case 'admin': case 'administrator': return 'Sistem Yöneticisi';
      case 'manager': case 'yonetici': return 'Yönetici';
      case 'operator': case 'operatör': return 'Operatör';
      default: return r;
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: () => { if (logout) logout(); },
        },
      ],
    );
  };

  const settingsGroups = [
    {
      title: 'Hesap',
      items: [
        {
          icon: 'person-outline',
          title: 'Kullanıcı Bilgileri',
          subtitle: `ID: ${userId}`,
        },
        {
          icon: 'business',
          title: 'Fabrika',
          subtitle: fabrikaAdi,
        },
      ],
    },
    {
      title: 'Uygulama',
      items: [
        {
          icon: 'system-update',
          title: checking ? 'Kontrol ediliyor...' : updateInfo ? 'Güncelleme Mevcut!' : 'Güncel',
          subtitle: updateInfo
            ? `v${updateInfo.serverVersionName} hazır — güncelle`
            : `Yeni Çiftlik Mobil v${currentVersionName}`,
          isUpdate: true,
          hasUpdate: !!updateInfo,
        },
        {
          icon: 'refresh',
          title: 'Güncellemeleri Kontrol Et',
          subtitle: 'Manuel güncelleme kontrolü',
          isCheckUpdate: true,
        },
        {
          icon: 'info-outline',
          title: 'Hakkında',
          subtitle: `Yeni Çiftlik Mobil v${currentVersionName}`,
        },
        {
          icon: 'help-outline',
          title: 'Yardım & Destek',
          subtitle: 'SSS ve iletişim',
        },
      ],
    },
  ];

  const renderSettingItem = (item, index, isLast) => {
    const isClickable = (item.isUpdate && (updateInfo || checking)) || item.isCheckUpdate;
    const Wrapper = isClickable ? TouchableOpacity : View;
    const wrapperProps = item.isCheckUpdate
      ? { onPress: checkAndUpdate, activeOpacity: 0.7, disabled: checking || downloading || installing }
      : item.isUpdate && updateInfo && !downloading && !installing
      ? { onPress: handleUpdate, activeOpacity: 0.7 }
      : {};

    return (
      <Wrapper
        key={index}
        style={[
          styles.settingItem,
          !isLast && { borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
          item.hasUpdate && { backgroundColor: Colors.successLight || '#F0FFF4' },
        ]}
        {...wrapperProps}
      >
        <View style={[styles.settingIcon, {
          backgroundColor: item.hasUpdate ? (Colors.successBg || '#DCFCE7')
            : item.danger ? Colors.dangerLight
            : Colors.brandPrimaryLight,
        }]}>
          {checking && item.isUpdate ? (
            <ActivityIndicator size="small" color={Colors.brandPrimary} />
          ) : (
            <SimpleIcon name={item.icon} size={20} color={
              item.hasUpdate ? (Colors.success || '#16A34A')
              : item.danger ? Colors.danger
              : Colors.brandPrimary
            } />
          )}
        </View>
        <View style={styles.settingContent}>
          <Text style={[
            styles.settingTitle,
            item.danger && { color: Colors.danger },
            item.hasUpdate && { color: Colors.success || '#16A34A', fontWeight: '700' },
          ]}>
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
          ) : null}
          {(downloading || installing) && item.isUpdate && (
            <View style={styles.profileProgress}>
              <View style={[styles.profileProgressFill, { width: `${downloadProgress}%` }]} />
            </View>
          )}
        </View>
        {item.hasUpdate && !downloading && !installing ? (
          <View style={styles.updateBadge}>
            <Text style={styles.updateBadgeText}>Güncelle</Text>
          </View>
        ) : (downloading || installing) && item.isUpdate ? (
          <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
            {installing ? 'Kuruluyor...' : `%${downloadProgress}`}
          </Text>
        ) : (
          <SimpleIcon name="chevron-right" size={22} color={Colors.textTertiary} />
        )}
      </Wrapper>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bgWhite} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 40, padding: 4 }} activeOpacity={0.7}>
          <SimpleIcon name="arrow-back-ios" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{fullName}</Text>
            <Text style={styles.profileUsername}>@{username}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{formatRole(role)}</Text>
            </View>
          </View>
        </View>

        {/* Settings Groups */}
        {settingsGroups.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.settingsGroup}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.settingsCard}>
              {group.items.map((item, index) =>
                renderSettingItem(item, index, index === group.items.length - 1),
              )}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={[styles.settingIcon, { backgroundColor: Colors.dangerLight }]}>
            <SimpleIcon name="logout" size={20} color={Colors.danger} />
          </View>
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>Yeni Çiftlik Mobil v{currentVersionName}</Text>
        <Text style={styles.versionText}>© 2025 Acemoğlu Gıda</Text>
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
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', padding: 20,
    borderRadius: 16, backgroundColor: Colors.bgWhite, marginBottom: 24,
    ...Shadows.sm,
  },
  avatarRing: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 2, borderColor: Colors.brandPrimary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatar: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: Colors.brandPrimary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#FFF' },
  profileInfo: { flex: 1, marginLeft: 16 },
  profileName: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  profileUsername: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  roleBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, marginTop: 8, backgroundColor: Colors.brandPrimaryLight,
  },
  roleText: { fontSize: 12, fontWeight: '600', color: Colors.brandPrimary },
  settingsGroup: { marginBottom: 24 },
  groupTitle: {
    fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 4,
    textTransform: 'uppercase', letterSpacing: 0.5, color: Colors.textSecondary,
  },
  settingsCard: { borderRadius: 16, overflow: 'hidden', backgroundColor: Colors.bgWhite, ...Shadows.sm },
  settingItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14,
  },
  settingIcon: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  settingContent: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  settingSubtitle: { fontSize: 12, marginTop: 2, color: Colors.textSecondary },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: 16, gap: 14, marginBottom: 20, backgroundColor: Colors.bgWhite,
    ...Shadows.sm,
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: Colors.danger },
  versionText: { fontSize: 12, textAlign: 'center', color: Colors.textTertiary, marginBottom: 4 },
  updateBadge: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
    backgroundColor: Colors.success || '#16A34A',
  },
  updateBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  profileProgress: {
    height: 4, backgroundColor: Colors.borderLight, borderRadius: 2,
    marginTop: 6, overflow: 'hidden',
  },
  profileProgressFill: {
    height: '100%', backgroundColor: Colors.brandPrimary, borderRadius: 2,
  },
});
