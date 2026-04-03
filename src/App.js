import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  Image,
  Platform,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius } from './theme';
import { BoltIcon } from './components/Icons';
import { getFabrikalar, getIstasyonlar } from './api/apiService';
import { getOncuToken, getOncuIstasyonlar } from './api/oncuApi';
import { setTokenExpiredListener } from './utils/authEvents';
import { useAppUpdate } from './hooks/useAppUpdate';
import UpdateDialog from './components/UpdateDialog';
import MenuScreen from './screens/MenuScreen';
import GunlukUretimlerScreen from './screens/GunlukUretimlerScreen';
import UretimFormScreen from './screens/UretimFormScreen';
import GunlukRaporListScreen from './screens/GunlukRaporListScreen';
import GunlukRaporDetayScreen from './screens/GunlukRaporDetayScreen';
import OncuUretimSorguScreen from './screens/OncuUretimSorguScreen';
import OncuUretimDetayScreen from './screens/OncuUretimDetayScreen';
import LoginScreen from './screens/LoginScreen';
import FormListScreen from './screens/FormListScreen';
import FormDetailScreen from './screens/FormDetailScreen';
import BullDolumFormScreen from './screens/BullDolumFormScreen';
import BullDolumListScreen from './screens/BullDolumListScreen';
import BullDolumDetailScreen from './screens/BullDolumDetailScreen';
import VardiyaRaporScreen from './screens/VardiyaRaporScreen';
import VardiyaHammaddeScreen from './screens/VardiyaHammaddeScreen';
import KaliteModulScreen from './screens/KaliteModulScreen';
import KaliteFormKayitScreen from './screens/KaliteFormKayitScreen';
import KaliteKayitDetayScreen from './screens/KaliteKayitDetayScreen';
import KaliteUretimSorguScreen from './screens/KaliteUretimSorguScreen';
import KaliteSorguDataScreen from './screens/KaliteSorguDataScreen';
import KaliteKontrolOnizlemeScreen from './screens/KaliteKontrolOnizlemeScreen';
import StationScanScreen from './screens/StationScanScreen';
import ArizaQRScanScreen from './screens/ArizaQRScanScreen';
import ArizaFormScreen from './screens/ArizaFormScreen';
import ArizaListScreen from './screens/ArizaListScreen';
import ArizaDetailScreen from './screens/ArizaDetailScreen';
import StokListesiScreen from './screens/StokListesiScreen';

import SevkiyatListesiScreen from './screens/SevkiyatListesiScreen';
import SevkiyatDetayScreen from './screens/SevkiyatDetayScreen';
import MusteriProfilScreen from './screens/MusteriProfilScreen';
import UretimTuketimScreen from './screens/UretimTuketimScreen';
import UretimlerModulScreen from './screens/UretimlerModulScreen';
import ProfileScreen from './screens/ProfileScreen';
import { AppDataContext } from './context/AppDataContext';
import DismissKeyboardView from './components/DismissKeyboardView';

const Stack = createNativeStackNavigator();

// ─── Error Boundary ──────────────────────────────────────────
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: Colors.bgWhite }}>
          <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8, color: Colors.textPrimary }}>Bir hata oluştu</Text>
          <Text style={{ color: Colors.textSecondary, textAlign: 'center', marginBottom: 20 }}>{this.state.error?.message}</Text>
          <TouchableOpacity onPress={() => this.setState({ hasError: false, error: null })} style={{ paddingHorizontal: 24, paddingVertical: 12, backgroundColor: Colors.brandPrimary, borderRadius: 8 }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Tekrar Dene</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

// ─── Formlar nested stack ────────────────────────────────────
function FormlarStackScreen() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FormList" component={FormListScreen} />
      <Stack.Screen name="FormDetail" component={FormDetailScreen} />
      <Stack.Screen name="BullDolumList" component={BullDolumListScreen} />
      <Stack.Screen name="BullDolumDetail" component={BullDolumDetailScreen} />
      <Stack.Screen name="BullDolumForm" component={BullDolumFormScreen} />
      <Stack.Screen name="VardiyaRapor" component={VardiyaRaporScreen} />
      <Stack.Screen name="VardiyaHammadde" component={VardiyaHammaddeScreen} />
    </Stack.Navigator>
  );
}

// ─── Rapor nested stack ─────────────────────────────────────
function RaporStackScreen() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GunlukRaporList" component={GunlukRaporListScreen} />
      <Stack.Screen name="GunlukRaporDetay" component={GunlukRaporDetayScreen} />
      <Stack.Screen name="GunlukRaporForm" component={UretimFormScreen} />
    </Stack.Navigator>
  );
}

// ─── Wrapper for GunlukUretimler when navigated from menu ───
function GunlukUretimlerTabWrapper() {
  const { selectedFabrika, istasyonlar } = useContext(AppDataContext);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bgApp }}>
      <GunlukUretimlerScreen fabrika={selectedFabrika} istasyonlar={istasyonlar} />
    </SafeAreaView>
  );
}

export default function App() {
  const [oncuToken, setOncuToken] = useState(null);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [selectedFabrika, setSelectedFabrika] = useState(null);
  const [istasyonlar, setIstasyonlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // OTA Update hook
  const {
    updateInfo,
    downloading,
    installing,
    progress,
    error: updateError,
    showDialog: showUpdateDialog,
    startUpdate,
    dismiss: dismissUpdate,
    retry: retryUpdate,
  } = useAppUpdate();

  const logout = useCallback(() => {
    setLoggedInUser(null);
    setOncuToken(null);
    setSelectedFabrika(null);
    setIstasyonlar([]);
  }, []);

  // Register global token-expired listener
  useEffect(() => {
    setTokenExpiredListener(logout);
    return () => setTokenExpiredListener(null);
  }, [logout]);

  const handleLoginSuccess = (userData, username, password) => {
    setLoggedInUser(userData);
    // Öncü API token'ini arka planda al
    getOncuToken(username, password)
      .then(tokenResult => {
        const t = tokenResult?.access_token || tokenResult?.token || tokenResult?.accessToken || tokenResult;
        if (t && typeof t === 'string') setOncuToken(t);
      })
      .catch(() => {});
  };

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    getFabrikalar()
      .then(data => {
        const yeniCiftlik = data.find(
          f => f.fabrikaAdi?.toLowerCase().includes('yeni') && f.fabrikaAdi?.toLowerCase().includes('çiftlik'),
        );
        setSelectedFabrika(yeniCiftlik || data[0] || null);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Fabrikaları yükle: ilk mount + login sonrası retry
  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (loggedInUser && (error || !selectedFabrika)) {
      loadData();
    }
  }, [error, loadData, loggedInUser, selectedFabrika]);

  useEffect(() => {
    if (!selectedFabrika) return;
    const fabrikaKodu = selectedFabrika.fabrikaKodu;

    const normalize = (data) => {
      if (!Array.isArray(data)) return [];
      return data
        .map(s => ({
          istasyonAdi: (s.istasyonAdi || s.name || s.stationName || s.StationName || '').trim(),
          istasyonKodu: (s.istasyonKodu || s.code || s.Code || '').trim(),
        }))
        .filter(s => {
          if (!s.istasyonAdi) return false;
          const ad = s.istasyonAdi.toLowerCase();
          return !ad.includes('gönen');
        });
    };

    // Prefer Öncü API (returns all stations), fallback to legacy API
    if (oncuToken) {
      getOncuIstasyonlar(oncuToken, String(fabrikaKodu))
        .then(data => setIstasyonlar(normalize(data)))
        .catch(() => {
          getIstasyonlar(fabrikaKodu)
            .then(data => setIstasyonlar(normalize(data)))
            .catch(err => console.error('İstasyonlar yüklenemedi:', err));
        });
    } else {
      getIstasyonlar(fabrikaKodu)
        .then(data => setIstasyonlar(normalize(data)))
        .catch(err => console.error('İstasyonlar yüklenemedi:', err));
    }
  }, [selectedFabrika, oncuToken]);

  // Show login screen if not authenticated
  if (!loggedInUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.splashContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bgWhite} />
        <View style={styles.splashLogo}>
          <Image source={require('./assets/onculogo.png')} style={styles.splashLogoImage} resizeMode="contain" />
        </View>
        <Text style={styles.splashTitle}>Yeni Çiftlik</Text>
        <Text style={styles.splashSubtitle}>Üretim Yönetim Sistemi</Text>
        <ActivityIndicator size="small" color={Colors.brandPrimary} style={{ marginTop: 32 }} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bgWhite} />
        <View style={styles.errorIconWrap}>
          <BoltIcon size={28} color={Colors.danger} />
        </View>
        <Text style={styles.errorTitle}>Bağlantı Hatası</Text>
        <Text style={styles.errorMsg}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData} activeOpacity={0.8}>
          <Text style={styles.retryBtnText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <AppDataContext.Provider value={{ selectedFabrika, istasyonlar, oncuToken, loggedInUser, logout }}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bgWhite} />
        <ErrorBoundary>
          <DismissKeyboardView>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Menu" component={MenuScreen} />
              <Stack.Screen name="UretimlerModul" component={UretimlerModulScreen} />
              <Stack.Screen name="KaliteModul" component={KaliteModulScreen} />
              <Stack.Screen name="FormlarStack" component={FormlarStackScreen} />
              <Stack.Screen name="RaporStack" component={RaporStackScreen} />
              <Stack.Screen name="OncuUretimDetay" component={OncuUretimDetayScreen} />
              <Stack.Screen name="StationScan" component={StationScanScreen} />
              <Stack.Screen name="KaliteUretimSorgu" component={KaliteUretimSorguScreen} />
              <Stack.Screen name="KaliteSorguData" component={KaliteSorguDataScreen} />
              <Stack.Screen name="KaliteKontrolOnizleme" component={KaliteKontrolOnizlemeScreen} />
              <Stack.Screen name="KaliteFormKayit" component={KaliteFormKayitScreen} />
              <Stack.Screen name="KaliteKayitDetay" component={KaliteKayitDetayScreen} />
              <Stack.Screen name="ArizaQRScan" component={ArizaQRScanScreen} />
              <Stack.Screen name="ArizaForm" component={ArizaFormScreen} />
              <Stack.Screen name="ArizaList" component={ArizaListScreen} />
              <Stack.Screen name="ArizaDetail" component={ArizaDetailScreen} />
              <Stack.Screen name="StokListesi" component={StokListesiScreen} />
              <Stack.Screen name="GunlukUretimlerTab">
                {() => <GunlukUretimlerTabWrapper />}
              </Stack.Screen>
              <Stack.Screen name="EmirlerTab">
                {() => (
                  <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bgApp }}>
                    <OncuUretimSorguScreen />
                  </SafeAreaView>
                )}
              </Stack.Screen>

              <Stack.Screen name="SevkiyatListesi" component={SevkiyatListesiScreen} />
              <Stack.Screen name="SevkiyatDetay" component={SevkiyatDetayScreen} />
              <Stack.Screen name="MusteriProfil" component={MusteriProfilScreen} />
              <Stack.Screen name="UretimTuketim" component={UretimTuketimScreen} />
              <Stack.Screen name="Profil" component={ProfileScreen} />
            </Stack.Navigator>
          </NavigationContainer>
          </DismissKeyboardView>
          {Platform.OS === 'android' && showUpdateDialog && (
            <UpdateDialog
              updateInfo={updateInfo}
              downloading={downloading}
              installing={installing}
              progress={progress}
              error={updateError}
              onUpdate={startUpdate}
              onDismiss={dismissUpdate}
              onRetry={retryUpdate}
            />
          )}
        </ErrorBoundary>
      </SafeAreaProvider>
    </AppDataContext.Provider>
  );
}

const styles = StyleSheet.create({
  // ─ Splash / Loading ─
  splashContainer: {
    flex: 1,
    backgroundColor: Colors.bgWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...Shadows.lg,
  },
  splashLogoImage: {
    width: 48,
    height: 48,
  },
  splashTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  splashSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: '400',
  },

  // ─ Error ─
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.bgWhite,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  errorIcon: { fontSize: 28 },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  errorMsg: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: Colors.brandPrimary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: Radius.sm,
  },
  retryBtnText: {
    color: Colors.textWhite,
    fontWeight: '600',
    fontSize: 15,
  },
});