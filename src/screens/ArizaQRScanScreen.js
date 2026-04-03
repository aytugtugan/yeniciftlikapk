import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import {
  View, Text, StyleSheet, Alert, StatusBar, TouchableOpacity, ActivityIndicator, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Camera, useCameraDevices, useCodeScanner,
} from 'react-native-vision-camera';
import SimpleIcon from '../components/SimpleIcon';
import { Colors, Shadows } from '../theme';
import { AppDataContext } from '../context/AppDataContext';

export default function ArizaQRScanScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { userName } = useContext(AppDataContext);

  const [hasPermission, setHasPermission] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  const isScanningRef = useRef(false);
  const devices = useCameraDevices();
  const device = devices.find(d => d.position === 'back');

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      isScanningRef.current = false;
      setIsBusy(false);
    }, []),
  );

  const normalizeInput = (value) => (value || '').trim().toUpperCase().replace(/\s/g, '').replace(/-/g, '');

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'ean-8', 'code-128', 'code-39', 'data-matrix'],
    onCodeScanned: (codes) => {
      if (codes.length === 0 || isScanningRef.current) return;
      isScanningRef.current = true;

      const rawScanned = codes
        .map(c => (c.value || '').replace(/\n/g, '').replace(/\r/g, '').trim())
        .filter(v => v.length > 0)
        .sort((a, b) => b.length - a.length)[0] || '';

      if (rawScanned.length < 2) {
        isScanningRef.current = false;
        return;
      }

      // Navigate to form with scanned makine kodu
      navigation.navigate('ArizaForm', { makineKodu: rawScanned });
      setTimeout(() => { isScanningRef.current = false; }, 2000);
    },
  });

  if (hasPermission === false) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.bgApp }]}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.brandPrimary} />
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
            <SimpleIcon name="arrow_back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Arıza Kaydı Aç</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.permissionContainer}>
          <SimpleIcon name="camera_alt" size={64} color={Colors.textSecondary} />
          <Text style={styles.permissionTitle}>Kamera izni gerekli</Text>
          <Text style={styles.permissionText}>QR kodu okuyabilmek için kameraya erişim izni vermelisiniz.</Text>
          <TouchableOpacity
            style={styles.permissionBtn}
            onPress={async () => {
              const s = await Camera.requestCameraPermission();
              setHasPermission(s === 'granted');
            }}>
            <Text style={styles.permissionBtnText}>Kameraya İzin Ver</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => Linking.openSettings()}>
            <Text style={styles.settingsBtnText}>Ayarları Aç</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.brandPrimary} />
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
            <SimpleIcon name="arrow_back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Arıza Kaydı Aç</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Kamera bulunamadı</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.brandPrimary} />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <SimpleIcon name="arrow_back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Arıza Kaydı Aç</Text>
          <Text style={styles.headerSubtitle}>Makine QR kodunu tarayın</Text>
        </View>
        <View style={styles.headerBtn} />
      </View>

      {hasPermission && (
        <View style={styles.cameraContainer}>
          <Camera style={StyleSheet.absoluteFill} device={device} isActive codeScanner={codeScanner} />
          <View style={styles.cameraOverlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.instructionText}>QR kodu çerçeveye tutun</Text>
          </View>
        </View>
      )}

      {/* Manual input option */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.manualButton}
          onPress={() => navigation.navigate('ArizaForm', { makineKodu: '' })}>
          <SimpleIcon name="edit" size={18} color={Colors.brandPrimary} />
          <Text style={styles.manualButtonText}>Manuel Giriş</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
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
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#FFF' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: Colors.brandPrimary,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  instructionText: {
    marginTop: 20,
    fontSize: 14,
    color: '#FFF',
    fontWeight: '500',
  },
  actionContainer: {
    padding: 16,
    backgroundColor: Colors.bgWhite,
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.brandPrimary,
    gap: 8,
  },
  manualButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.brandPrimary,
  },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary, marginTop: 16, marginBottom: 8 },
  permissionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.brandPrimary,
    borderRadius: 8,
    marginBottom: 12,
  },
  permissionBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF', textAlign: 'center' },
  settingsBtn: { paddingHorizontal: 20, paddingVertical: 12 },
  settingsBtnText: { fontSize: 14, fontWeight: '600', color: Colors.brandPrimary, textAlign: 'center' },
  errorText: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center' },
});
