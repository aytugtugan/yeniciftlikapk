import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  ActivityIndicator, Alert, Linking, BackHandler,
} from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera, useCameraDevices, useCodeScanner,
} from 'react-native-vision-camera';
import SimpleIcon from '../components/SimpleIcon';
import { Colors } from '../theme';
import { AppDataContext } from '../context/AppDataContext';
import { getOncuFabrikalar, getOncuIstasyonlar } from '../api/oncuApi';

export default function StationScanScreen({ navigation }) {
  const { oncuToken } = useContext(AppDataContext);
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [hasPermission, setHasPermission] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [stationList, setStationList] = useState([]);
  const [isLoadingStations, setIsLoadingStations] = useState(true);
  const [scannedStationName, setScannedStationName] = useState('');

  const isScanningRef = useRef(false);
  const stationListRef = useRef([]);
  const isLoadingStationsRef = useRef(true);
  useEffect(() => { stationListRef.current = stationList; }, [stationList]);
  useEffect(() => { isLoadingStationsRef.current = isLoadingStations; }, [isLoadingStations]);

  const devices = useCameraDevices();
  const device = devices.find(d => d.position === 'back');

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => { loadStations(); }, [oncuToken]);

  const loadStations = async () => {
    if (!oncuToken) return;
    setIsLoadingStations(true);
    try {
      const factories = await getOncuFabrikalar(oncuToken);
      const allStations = [];
      await Promise.all(
        (factories || []).map(async (f) => {
          try {
            const code = f.factoryCode?.toString() || f.id?.toString() || '';
            if (!code) return;
            const stations = await getOncuIstasyonlar(oncuToken, code);
            allStations.push(...stations);
          } catch {}
        }),
      );
      setStationList(allStations);
    } catch (err) {
      Alert.alert('Hata', `İstasyonlar yüklenemedi: ${err.message}`);
    } finally {
      setIsLoadingStations(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      isScanningRef.current = false;
      setIsBusy(false);
      const onBack = () => { navigation.goBack(); return true; };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [navigation]),
  );

  const normalize = (value) => (value || '').trim().toUpperCase().replace(/\s/g, '').replace(/-/g, '');

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'ean-8', 'code-128', 'code-39', 'data-matrix'],
    onCodeScanned: (codes) => {
      if (codes.length === 0 || isScanningRef.current) return;
      isScanningRef.current = true;

      const rawScanned = codes
        .map(c => (c.value || '').replace(/\n/g, '').replace(/\r/g, '').trim())
        .filter(v => v.length > 0)
        .sort((a, b) => b.length - a.length)[0] || '';

      if (rawScanned.length < 2) { isScanningRef.current = false; return; }

      const currentStations = stationListRef.current;
      const currentLoading = isLoadingStationsRef.current;

      if (currentLoading || currentStations.length === 0) {
        isScanningRef.current = false;
        return;
      }

      const scannedNorm = normalize(rawScanned);

      let match = currentStations.find(s => normalize(s.code) === scannedNorm);
      if (!match) {
        match = currentStations.find(s => normalize(s.name) === scannedNorm);
      }
      if (!match && scannedNorm.length >= 3) {
        match = currentStations.find(s => {
          const codeNorm = normalize(s.code);
          const nameNorm = normalize(s.name);
          return (codeNorm.length >= 3 && (scannedNorm.includes(codeNorm) || codeNorm.includes(scannedNorm)))
            || (nameNorm.length >= 3 && (scannedNorm.includes(nameNorm) || nameNorm.includes(scannedNorm)));
        });
      }

      if (match) {
        navigation.push('KaliteUretimSorgu', {
          preCode: match.code,
          preStationName: match.name,
          preFactoryCode: match.factoryCode?.toString() || '',
        });
      } else {
        navigation.push('KaliteUretimSorgu', { preCode: rawScanned });
      }
      setTimeout(() => { isScanningRef.current = false; }, 2000);
    },
  });

  if (hasPermission === false) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.bgApp }]}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.brandPrimary} />
        <View style={[styles.header, { backgroundColor: Colors.brandPrimary, paddingTop: insets.top }]}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
            <SimpleIcon name="arrow_back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>İstasyon Tarama</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Kamera izni gerekli</Text>
          <Text style={styles.permissionText}>Barkod okuyabilmek için kameraya erişim izni vermelisiniz.</Text>
          <TouchableOpacity style={styles.permissionBtn}
            onPress={async () => { const s = await Camera.requestCameraPermission(); setHasPermission(s === 'granted'); }}>
            <Text style={styles.permissionBtnText}>Kameraya İzin Ver</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => Linking.openSettings()}>
            <Text style={styles.settingsBtnText}>Ayarları Aç</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!device || hasPermission === null) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.bgApp }]}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.brandPrimary} />
        <View style={[styles.header, { backgroundColor: Colors.brandPrimary, paddingTop: insets.top }]}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
            <SimpleIcon name="arrow_back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>İstasyon Tarama</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brandPrimary} />
          <Text style={styles.loadingText}>
            {hasPermission === null ? 'Kamera izni kontrol ediliyor...' : 'Kamera hazırlanıyor...'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <Camera style={StyleSheet.absoluteFill} device={device} isActive={isFocused} codeScanner={codeScanner} />

      <View style={[styles.cameraHeader, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.cameraBackBtn} onPress={() => navigation.goBack()}>
          <SimpleIcon name="arrow_back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.cameraTitle}>İstasyon Tarama</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.scanFrameContainer}>
        <View style={styles.scanInstructionContainer}>
          <Text style={styles.scanInstructionText}>İstasyon Barkodu Tara</Text>
          {scannedStationName ? <Text style={styles.stationNameText}>{scannedStationName}</Text> : null}
        </View>
        <View style={styles.scanBox}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
      </View>

      {(isBusy || isLoadingStations) && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.brandPrimary} />
            <Text style={styles.loadingOverlayText}>
              {isLoadingStations ? 'İstasyonlar yükleniyor...' : 'İşleniyor...'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingBottom: 12, elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  headerBtn: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#FFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 16, color: Colors.textSecondary },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  permissionTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8, color: Colors.textPrimary },
  permissionText: { fontSize: 16, textAlign: 'center', marginBottom: 24, color: Colors.textSecondary },
  permissionBtn: { paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, marginBottom: 16, backgroundColor: Colors.brandPrimary },
  permissionBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  settingsBtn: { padding: 12 },
  settingsBtnText: { fontSize: 16, color: Colors.brandPrimary },
  cameraHeader: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingBottom: 12, backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cameraBackBtn: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  cameraTitle: { fontSize: 18, fontWeight: '600', color: '#FFF' },
  scanFrameContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanInstructionContainer: { position: 'absolute', top: 120, alignItems: 'center' },
  scanInstructionText: {
    color: '#FFF', fontSize: 18, fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8,
  },
  stationNameText: {
    color: '#4CAF50', fontSize: 16, fontWeight: '600', marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6,
  },
  scanBox: {
    width: 280, height: 280, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 16, position: 'relative',
  },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#FFF' },
  cornerTL: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
  cornerTR: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
  cornerBL: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
  cornerBR: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  loadingBox: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, alignItems: 'center', gap: 12 },
  loadingOverlayText: { fontSize: 16, color: '#333', fontWeight: '500' },
});
