import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  TextInput, Alert, Modal, StatusBar, BackHandler,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera, useCameraDevices, useCodeScanner,
} from 'react-native-vision-camera';
import SimpleIcon from '../components/SimpleIcon';
import { Colors, Shadows } from '../theme';
import { AppDataContext } from '../context/AppDataContext';
import { getKaliteDetayData, getInject, createUretimKayit } from '../api/oncuApi';
import ValidationMismatchModal from '../components/ValidationMismatchModal';

export default function KaliteSorguDataScreen({ navigation, route }) {
  const ficheno = route.params?.ficheno || '';
  const hatName = route.params?.hatName || '';
  const stationFactoryCode = route.params?.stationFactoryCode || '';
  const { oncuToken } = useContext(AppDataContext);
  const insets = useSafeAreaInsets();

  const successColor = '#81C784';
  const errorColorBtn = '#E57373';

  // Loading & error
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [checkboxStates, setCheckboxStates] = useState({});

  // Inputs
  const [injectlemeValue, setInjectlemeValue] = useState('');
  const [injectMatched, setInjectMatched] = useState(null);
  const [kapakLotNoValue, setKapakLotNoValue] = useState('');
  const [etiketLotNoValue, setEtiketLotNoValue] = useState('');
  const [koliLotNo, setKoliLotNo] = useState('');
  const [hologramValue, setHologramValue] = useState('');
  const [hologramLotValue, setHologramLotValue] = useState('');
  const [operatorAdiValue, setOperatorAdiValue] = useState('');

  // Barkod
  const [etiketBarkodState, setEtiketBarkodState] = useState({ isMatched: false, isChecked: false, scannedValue: '' });
  const [koliBarkodState, setKoliBarkodState] = useState({ isMatched: false, isChecked: false, scannedValue: '' });
  const etiketBarkodStateRef = useRef({ isMatched: false, isChecked: false, scannedValue: '' });
  const koliBarkodStateRef = useRef({ isMatched: false, isChecked: false, scannedValue: '' });
  const isSubmittingRef = useRef(false);

  // Camera
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [currentScanType, setCurrentScanType] = useState('');
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraZoom, setCameraZoom] = useState(2);
  const [torchOn, setTorchOn] = useState(false);

  // Modals
  const [activeLotModal, setActiveLotModal] = useState(null); // null | 'kapak' | 'etiket' | 'koli' | 'hologram' | 'operator'
  const [showConfirmErrorDialog, setShowConfirmErrorDialog] = useState(false);
  const [tempLotInput, setTempLotInput] = useState('');
  const [validationModal, setValidationModal] = useState({ 
    visible: false, 
    success: false, 
    message: '', 
    type: '',
    scannedValue: '',
    expectedValue: '',
  });

  const scrollViewRef = useRef(null);
  const scrollPositionRef = useRef(0);
  const isScanningRef = useRef(false);
  const viewDataRef = useRef(null);
  const currentScanTypeRef = useRef('');
  const isCameraOpenRef = useRef(false);
  const lastScanTimeRef = useRef(0);
  const [scanFeedback, setScanFeedback] = useState('');

  useEffect(() => { viewDataRef.current = viewData; }, [viewData]);
  useEffect(() => { currentScanTypeRef.current = currentScanType; }, [currentScanType]);
  useEffect(() => { isCameraOpenRef.current = isCameraOpen; }, [isCameraOpen]);
  useEffect(() => { etiketBarkodStateRef.current = etiketBarkodState; }, [etiketBarkodState]);
  useEffect(() => { koliBarkodStateRef.current = koliBarkodState; }, [koliBarkodState]);

  // Camera setup
  const devices = useCameraDevices();
  const device = devices.find(d => d.position === 'back');

  const closeCamera = useCallback(() => {
    isScanningRef.current = true;
    isCameraOpenRef.current = false;
    currentScanTypeRef.current = '';
    setIsCameraOpen(false);
    setCurrentScanType('');
    setTorchOn(false);
    setCameraZoom(2);
  }, []);

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useFocusEffect(useCallback(() => {
    const onBack = () => {
      if (isCameraOpenRef.current) { closeCamera(); return true; }
      navigation.goBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [navigation, closeCamera]));

  // Load data
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!ficheno || !oncuToken) { setIsLoading(false); setError('Fiş numarası bulunamadı'); return; }
      setIsLoading(true); setError(null);
      try {
        const data = await getKaliteDetayData(oncuToken, ficheno, hatName);
        if (mounted) setViewData(data);
      } catch (err) {
        if (mounted) setError(err.message || 'Veri yüklenemedi');
      } finally { if (mounted) setIsLoading(false); }
    };
    load();
    return () => { mounted = false; };
  }, [ficheno, oncuToken]);

  const updateCheckboxState = (key, isGreen, isRed) => setCheckboxStates(prev => ({ ...prev, [key]: { isGreen, isRed } }));
  const getCheckboxState = (key) => checkboxStates[key] || { isGreen: false, isRed: false };

  // Inject comparison — robust normalization
  const normalizeInject = (s) => {
    if (!s) return '';
    let v = s.trim();
    // Unicode dashes → ASCII hyphen
    v = v.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-');
    // Unicode whitespace → regular space
    v = v.replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ');
    // Remove parentheses (handles dates wrapped in parens)
    v = v.replace(/[()]/g, '');
    // Normalize date separators: dd/MM/yyyy or dd-MM-yyyy → dd.MM.yyyy
    v = v.replace(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/g, '$1.$2.$3');
    // Collapse multiple spaces
    v = v.replace(/\s+/g, ' ');
    return v.trim();
  };
  const extractInjectTime = (s) => {
    // Try /HH:MM- first, then fallback to standalone HH:MM
    const m = s.match(/\/\s*(\d{1,2}):(\d{2})\s*-/) || s.match(/\b(\d{1,2}):(\d{2})\b/);
    return m ? { hours: parseInt(m[1], 10), minutes: parseInt(m[2], 10) } : null;
  };
  const removeInjectTime = (s) => s.replace(/\/\s*\d{1,2}:\d{2}\s*-/, '/ XX:XX -').replace(/\b\d{1,2}:\d{2}\b/, 'XX:XX');
  const timeToMinutes = (t) => t.hours * 60 + t.minutes;
  const INJECT_TIME_TOLERANCE_MINUTES = 30;
  const compareInject = (actual, expected) => {
    if (!actual || !expected) return false;
    const aN = normalizeInject(actual);
    const eN = normalizeInject(expected);
    if (aN === eN) return true;
    if (removeInjectTime(aN) !== removeInjectTime(eN)) return false;
    const aT = extractInjectTime(aN); const eT = extractInjectTime(eN);
    if (!aT || !eT) return false;
    return Math.abs(timeToMinutes(aT) - timeToMinutes(eT)) <= INJECT_TIME_TOLERANCE_MINUTES;
  };
  const compareBarkod = (scanned, expected) => {
    const s = (scanned || '').trim(); const e = (expected || '').trim();
    return s.length > 0 && e.length > 0 && s === e;
  };

  // Code scanner
  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'ean-8', 'code-128', 'code-39', 'upc-a', 'upc-e', 'codabar', 'itf'],
    onCodeScanned: async (codes) => {
      if (codes.length === 0 || isScanningRef.current || !isCameraOpenRef.current) return;
      const now = Date.now();
      if (now - lastScanTimeRef.current < 300) return;
      lastScanTimeRef.current = now;
      const scanType = currentScanTypeRef.current;
      const currentViewData = viewDataRef.current;
      const text = codes.map(c => (c.value || '').trim()).filter(v => v.length > 0).sort((a, b) => b.length - a.length)[0] || '';
      if (scanType === 'inject' ? text.length < 1 : text.length < 4) return;
      if (!scanType) return;

      switch (scanType) {
        case 'etiket': {
          const match = compareBarkod(text, currentViewData?.etiketBarkod);
          isScanningRef.current = true;
          setScanFeedback('');
          setEtiketBarkodState({ isMatched: match, isChecked: true, scannedValue: text });
          setValidationModal({
            visible: true, 
            success: match, 
            type: 'etiket',
            scannedValue: text,
            expectedValue: currentViewData?.etiketBarkod || '',
            message: match ? (isKolileme ? 'Ürün barkodu doğrulandı!' : 'Etiket barkodu doğrulandı!')
              : ((isKolileme ? 'Ürün barkodu' : 'Etiket barkodu') + ' eşleşmedi!'),
          });
          break;
        }
        case 'koli': {
          const match = compareBarkod(text, currentViewData?.koliBarkod);
          isScanningRef.current = true;
          setScanFeedback('');
          setKoliBarkodState({ isMatched: match, isChecked: true, scannedValue: text });
          setValidationModal({
            visible: true, 
            success: match, 
            type: 'koli',
            scannedValue: text,
            expectedValue: currentViewData?.koliBarkod || '',
            message: match ? 'Koli barkodu doğrulandı!' : 'Koli barkodu eşleşmedi!',
          });
          break;
        }
        case 'inject': {
          isScanningRef.current = true;
          isCameraOpenRef.current = false; currentScanTypeRef.current = '';
          setIsCameraOpen(false); setCurrentScanType(''); setScanFeedback('');
          const expectedInject = currentViewData?.injectlemeKodu || '';
          setValidationModal({ 
            visible: true, 
            success: true, 
            message: 'İnjectleme alınıyor...', 
            type: 'inject',
            scannedValue: '',
            expectedValue: expectedInject,
          });
          try {
            const resp = await getInject(text.trim(), oncuToken);
            const actualInject = resp.inject || '';
            setInjectlemeValue(actualInject);
            if (!expectedInject) {
              setInjectMatched(null);
              setValidationModal({ 
                visible: true, 
                success: false, 
                message: 'İnjectleme alındı ancak beklenen değer tanımsız.', 
                type: 'inject',
                scannedValue: actualInject,
                expectedValue: '',
              });
            } else {
              const isMatch = compareInject(actualInject, expectedInject);
              setInjectMatched(isMatch);
              setValidationModal({
                visible: true, 
                success: isMatch, 
                type: 'inject',
                scannedValue: actualInject,
                expectedValue: expectedInject,
                message: isMatch ? 'İnjectleme doğrulandı!' : 'İnjectleme eşleşmedi!',
              });
            }
          } catch (e) {
            setInjectMatched(false);
            setValidationModal({ 
              visible: true, 
              success: false, 
              message: 'İnjectleme Alınmadı! Hatalı QR', 
              type: 'inject',
              scannedValue: text || '',
              expectedValue: expectedInject,
            });
          }
          break;
        }
      }
    },
  });

  const openCamera = (scanType) => {
    if (hasPermission) {
      isScanningRef.current = true;
      currentScanTypeRef.current = scanType;
      isCameraOpenRef.current = true;
      lastScanTimeRef.current = 0;
      setCurrentScanType(scanType); setIsCameraOpen(true); setScanFeedback('');
      setTimeout(() => { isScanningRef.current = false; }, 600);
    } else { Alert.alert('Uyarı', 'Kamera izni gerekli'); }
  };

  // Derived values
  const kod = viewData?.kod || viewData?.detay?.kod || '';
  const urunAdi = viewData?.urunAdi || viewData?.detay?.urunAdi || viewData?.detay?.ad || '';
  const tett = viewData?.tett || viewData?.detay?.tett || '';
  const uretimTarihi = viewData?.uretimTarihiFormatted || '';
  const pnoValue = viewData?.pno || '';
  const ambalaj = viewData?.ambalaj || '';
  const kapak = viewData?.kapak || '';
  const etiketAdi = viewData?.etiketAdi || '';
  const koliAdi = viewData?.koliAdi || '';
  const koliBarkod = viewData?.koliBarkod || '';

  const isKarma = urunAdi.includes('KARMA');
  const isYRM = kod.toUpperCase().includes('YRM');
  const effectiveFactoryCode = stationFactoryCode || '';
  const isFactory2 = effectiveFactoryCode === '2';
  const hatNameUpper = hatName.toUpperCase().replace(/İ/g, 'I');
  const isDolum = isFactory2 && hatNameUpper.includes('DOLUM');
  const isKolileme = isFactory2 && !hatNameUpper.includes('DOLUM');
  const hideHologram = isFactory2;
  const f2HidePno = isFactory2 && !viewData?.pno;
  const f2HideUretimTarihi = isFactory2 && !uretimTarihi;
  const f2HideTett = isFactory2 && !tett;
  const f2HideAmbalaj = isFactory2 && !viewData?.ambalaj;
  const f2HideKapak = isFactory2 && !viewData?.kapak;
  const f2HideEtiket = isFactory2 && !viewData?.etiketAdi;
  const f2HideEtiketBarkod = isFactory2 && !viewData?.etiketBarkod;
  const f2HideKoli = isFactory2 && !viewData?.koliAdi;
  const f2HideKoliBarkod = isFactory2 && !viewData?.koliBarkod;

  // Submit
  const handleSubmit = async () => {
    if (isSubmittingRef.current || !viewData) return;
    isSubmittingRef.current = true; setIsSubmitting(true);
    const requiredKeys = [
      ...(isFactory2 ? [] : ['fis_no']), 'kod', 'urun_adi',
      ...(uretimTarihi ? ['uretim_tarihi'] : []),
      ...(tett ? ['tett'] : []),
      ...(pnoValue ? ['pno'] : []),
      'uretim_hatti',
      ...(isKarma ? [] : [
        ...(ambalaj ? ['ambalaj_adi'] : []),
        ...(kapak ? ['kapak_adi'] : []),
        ...(hideHologram ? [] : ['hologram']),
        ...(etiketAdi ? ['etiket_adi'] : []),
      ]),
      ...((isYRM || isDolum) ? [] : [...(koliAdi ? ['koli_adi'] : [])]),
    ];
    const keyLabels = {
      fis_no: 'Fiş No', kod: 'Kod', urun_adi: 'Ürün Adı', uretim_tarihi: 'Üretim Tarihi',
      tett: 'TETT', pno: 'PNO', uretim_hatti: 'Üretim Hattı', ambalaj_adi: 'Ambalaj Adı',
      kapak_adi: 'Kapak Adı', hologram: 'Hologram',
      etiket_adi: isKolileme ? 'Ürün Adı (Etiket)' : 'Etiket Adı', koli_adi: 'Koli Adı',
    };
    const missingKey = requiredKeys.find(key => { const s = getCheckboxState(key); return !s.isGreen && !s.isRed; });
    if (missingKey) { Alert.alert('Uyarı', `${keyLabels[missingKey]} için seçim yapınız.`); isSubmittingRef.current = false; setIsSubmitting(false); return; }
    if (!isKarma && !f2HideKapak && kapak && !kapakLotNoValue.trim()) { Alert.alert('Uyarı', 'Kapak Lot-No boş olamaz.'); isSubmittingRef.current = false; setIsSubmitting(false); return; }
    const eS = etiketBarkodStateRef.current; const kS = koliBarkodStateRef.current;
    if (!isKarma && !f2HideEtiketBarkod && !eS.scannedValue) { Alert.alert('Uyarı', isKolileme ? 'Ürün barkodunu okutunuz.' : 'Etiket barkodunu okutunuz.'); isSubmittingRef.current = false; setIsSubmitting(false); return; }
    if (!isYRM && !isDolum && !f2HideKoliBarkod && !kS.scannedValue) { Alert.alert('Uyarı', 'Koli barkodunu okutunuz.'); isSubmittingRef.current = false; setIsSubmitting(false); return; }
    if (!isKarma && !f2HideEtiketBarkod && !eS.isMatched) { Alert.alert('Uyarı', isKolileme ? 'Ürün barkodu eşleşmiyor!' : 'Etiket barkodu eşleşmiyor!'); isSubmittingRef.current = false; setIsSubmitting(false); return; }
    if (!isYRM && !isDolum && !f2HideKoliBarkod && !kS.isMatched) { Alert.alert('Uyarı', 'Koli barkodu eşleşmiyor!'); isSubmittingRef.current = false; setIsSubmitting(false); return; }
    const redKey = requiredKeys.find(k => getCheckboxState(k).isRed);
    if (redKey) { Alert.alert('Uyarı', `${keyLabels[redKey]} alanında uyuşmazlık var! Hatalı Ürün Bildirin!`); isSubmittingRef.current = false; setIsSubmitting(false); return; }

    const payload = {
      fisNo: ficheno,
      kapakBarkod: isKarma ? '0' : kapakLotNoValue,
      hologram: hideHologram ? '0' : (isKarma ? '0' : hologramValue),
      hologramLot: hideHologram ? '0' : (isKarma ? '0' : (hologramLotValue || undefined)),
      operatorAdi: operatorAdiValue || undefined,
      etiketLot: isKarma ? '0' : (etiketLotNoValue || undefined),
      koliLot: (isYRM || isDolum) ? undefined : (koliLotNo || undefined),
    };
    const displayData = {
      fisNo: ficheno, kod: viewData?.kod || '', urunAdi: viewData?.urunAdi || '',
      uretimTarihi: viewData?.uretimTarihiFormatted || '', tett: viewData?.tett || '',
      pNo: viewData?.pno || '', injectleme: (isKarma || isKolileme) ? '0' : injectlemeValue,
      uretimHatti: hatName, ambalajAdi: isKarma ? '0' : (viewData?.ambalaj || ''),
      kapakAdi: isKarma ? '0' : (viewData?.kapak || ''),
      hologram: hideHologram ? '0' : (isKarma ? '0' : hologramValue),
      hologramLot: hideHologram ? '0' : (isKarma ? '0' : hologramLotValue),
      operatorAdi: operatorAdiValue,
      etiketAdi: isKarma ? '0' : (viewData?.etiketAdi || ''),
      etiketBarkod: isKarma ? '0' : (eS.scannedValue || ''),
      etiketLot: isKarma ? '0' : etiketLotNoValue,
      koliAdi: (isYRM || isDolum) ? '' : (viewData?.koliAdi || ''),
      koliBarkod: (isYRM || isDolum) ? '' : (kS.scannedValue || ''),
      koliLot: (isYRM || isDolum) ? '' : koliLotNo,
      kapakBarkod: kapakLotNoValue, stationFactoryCode: stationFactoryCode || undefined,
    };
    navigation.navigate('KaliteKontrolOnizleme', { payload, displayData });
    setTimeout(() => { isSubmittingRef.current = false; setIsSubmitting(false); }, 500);
  };

  const handleReportError = () => {
    const requiredKeys = [
      ...(isFactory2 ? [] : ['fis_no']), 'kod', 'urun_adi',
      ...(f2HideUretimTarihi ? [] : ['uretim_tarihi']), ...(f2HideTett ? [] : ['tett']),
      ...(f2HidePno ? [] : ['pno']), 'uretim_hatti',
      ...(isKarma ? [] : [...(f2HideAmbalaj ? [] : ['ambalaj_adi']), ...(f2HideKapak ? [] : ['kapak_adi']),
        ...(hideHologram ? [] : ['hologram']), ...(f2HideEtiket ? [] : ['etiket_adi'])]),
      ...((isYRM || isDolum) ? [] : [...(f2HideKoli ? [] : ['koli_adi'])]),
    ];
    const redKeys = requiredKeys.filter(k => getCheckboxState(k).isRed);
    if (redKeys.length === 0) { Alert.alert('Uyarı', 'Kırmızı (uyuşmaz) seçili alan yok.'); return; }
    setShowConfirmErrorDialog(true);
  };

  // Components
  const KkInfoRowCheck = ({ label, values, stateKey, onCameraClick, buttonState, onClearClick, hideCheckboxes }) => {
    const state = getCheckboxState(stateKey);
    const displayValue = values.join(', ') || '';
    if (!displayValue && !onCameraClick) return null;
    let cardBgColor = Colors.bgSurface;
    if (buttonState?.scannedValue) cardBgColor = buttonState.isMatched ? successColor : errorColorBtn;
    return (
      <View style={styles.kkRow}>
        <Text style={styles.kkLabel}>{label}</Text>
        <View style={styles.kkRowContent}>
          <View style={[styles.kkValueCard, { backgroundColor: buttonState ? cardBgColor : Colors.bgSurface }]}>
            <Text style={[styles.kkValue, buttonState?.scannedValue && { color: '#000' }]} numberOfLines={2}>
              {buttonState?.scannedValue || displayValue}
            </Text>
          </View>
          {onCameraClick && (
            buttonState?.scannedValue ? (
              <TouchableOpacity style={styles.kkCameraBtn} onPress={onClearClick}><SimpleIcon name="close" size={22} color={Colors.textSecondary} /></TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.kkCameraBtn} onPress={onCameraClick}><SimpleIcon name="photo_camera" size={22} color={Colors.textSecondary} /></TouchableOpacity>
            )
          )}
          {!hideCheckboxes && (
            <View style={styles.kkCheckboxes}>
              <TouchableOpacity style={[styles.kkCb, state.isGreen && { backgroundColor: successColor }, { borderColor: successColor }]}
                onPress={() => updateCheckboxState(stateKey, true, false)}>
                <SimpleIcon name="check" size={18} color={state.isGreen ? '#FFF' : successColor} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.kkCb, state.isRed && { backgroundColor: errorColorBtn }, { borderColor: errorColorBtn }]}
                onPress={() => updateCheckboxState(stateKey, false, true)}>
                <SimpleIcon name="close" size={18} color={state.isRed ? '#FFF' : errorColorBtn} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const InputCard = ({ label, value, onPress, placeholder, onClear }) => (
    <View style={styles.inputSection}>
      <Text style={styles.kkLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TouchableOpacity style={[styles.inputCard, value && { backgroundColor: successColor }]} onPress={onPress}>
          <Text style={[styles.inputValue, value && { color: '#000' }]}>{value || placeholder}</Text>
        </TouchableOpacity>
        {value ? <TouchableOpacity style={styles.inputBtn} onPress={onClear}><SimpleIcon name="close" size={22} color={Colors.textSecondary} /></TouchableOpacity> : null}
      </View>
    </View>
  );

  const injectBgColor = !injectlemeValue ? Colors.bgSurface : injectMatched === true ? successColor : injectMatched === false ? errorColorBtn : '#FFB74D';

  const lotModalTitle = activeLotModal === 'kapak' ? 'Kapak Lot-No Giriniz'
    : activeLotModal === 'etiket' ? 'Etiket Lot-No Giriniz'
    : activeLotModal === 'koli' ? 'Koli Lot-No Giriniz'
    : activeLotModal === 'hologram' ? 'Hologram Lot-No Giriniz'
    : activeLotModal === 'operator' ? 'Operatör Adı Giriniz' : '';
  const closeLotModal = () => { setActiveLotModal(null); setTempLotInput(''); };
  const confirmLotModal = () => {
    const val = tempLotInput;
    if (activeLotModal === 'kapak') setKapakLotNoValue(val);
    else if (activeLotModal === 'etiket') setEtiketLotNoValue(val);
    else if (activeLotModal === 'koli') setKoliLotNo(val);
    else if (activeLotModal === 'hologram') setHologramLotValue(val);
    else if (activeLotModal === 'operator') setOperatorAdiValue(val);
    setActiveLotModal(null); setTempLotInput('');
  };

  // Loading
  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.brandPrimary} />
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}><SimpleIcon name="arrow_back" size={24} color="#FFF" /></TouchableOpacity>
          <Text style={styles.headerTitle}>Kalite Kontrol Formu</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.centerContainer}><ActivityIndicator size="large" color={Colors.brandPrimary} /></View>
      </View>
    );
  }

  // Error
  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.brandPrimary} />
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}><SimpleIcon name="arrow_back" size={24} color="#FFF" /></TouchableOpacity>
          <Text style={styles.headerTitle}>Kalite Kontrol Formu</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.centerContainer}>
          <SimpleIcon name="error_outline" size={48} color={Colors.brandPrimary} />
          <Text style={{ color: Colors.danger, fontSize: 16, textAlign: 'center', marginTop: 12 }}>{error}</Text>
          <TouchableOpacity style={{ backgroundColor: Colors.brandPrimary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, marginTop: 16 }}
            onPress={() => { setIsLoading(true); setError(null); getKaliteDetayData(oncuToken, ficheno, hatName).then(d => { setViewData(d); setIsLoading(false); }).catch(e => { setError(e.message); setIsLoading(false); }); }}>
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Camera overlay
  if (isCameraOpen && device) {
    const scanTitle = currentScanType === 'etiket' ? (isKolileme ? 'Ürün Barkod Tara' : 'Etiket Barkod Tara')
      : currentScanType === 'koli' ? 'Koli Barkod Tara'
      : currentScanType === 'inject' ? 'İnjectleme QR Tara' : 'Barkod Tara';
    return (
      <View style={StyleSheet.absoluteFill}>
        <Camera style={StyleSheet.absoluteFill} device={device} isActive={true}
          codeScanner={codeScanner} zoom={cameraZoom} torch={torchOn ? 'on' : 'off'} enableZoomGesture={true} />
        <View style={[styles.cameraHeader, { paddingTop: insets.top }]}>
          <TouchableOpacity style={styles.cameraBackBtn} onPress={closeCamera}><SimpleIcon name="close" size={28} color="#FFF" /></TouchableOpacity>
          <Text style={styles.cameraTitleText}>{scanTitle}</Text>
          <TouchableOpacity style={styles.cameraBackBtn} onPress={() => setTorchOn(p => !p)}>
            <SimpleIcon name={torchOn ? 'flash_on' : 'flash_off'} size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.cameraZoomRow}>
          {[1, 2, 3].map(z => (
            <TouchableOpacity key={z} style={[styles.zoomBtn, cameraZoom === z && styles.zoomBtnActive]} onPress={() => setCameraZoom(z)}>
              <Text style={[styles.zoomBtnText, cameraZoom === z && styles.zoomBtnTextActive]}>{z}x</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.cameraScanFrame}>
          <View style={currentScanType === 'inject' ? styles.cameraScanBox : styles.cameraScanBoxWide} />
          <View style={styles.scanFeedbackContainer}><Text style={styles.scanInstructionText}>Barkodu çerçeveye tutun</Text></View>
        </View>
        <ValidationMismatchModal
          visible={validationModal.visible}
          success={validationModal.success}
          title={validationModal.success ? 'Doğrulama Başarılı' : 'Doğrulama Başarısız'}
          message={validationModal.message}
          scannedValue={validationModal.scannedValue}
          expectedValue={validationModal.expectedValue}
          type={validationModal.type}
          onDismiss={() => {
            setValidationModal({ visible: false, success: false, message: '', type: '', scannedValue: '', expectedValue: '' });
            closeCamera();
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.brandPrimary} />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}><SimpleIcon name="arrow_back" size={24} color="#FFF" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Kalite Kontrol Formu</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView ref={scrollViewRef} style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => { scrollPositionRef.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}>

        {!isFactory2 && <KkInfoRowCheck label="Üretim Emri" values={[ficheno]} stateKey="fis_no" />}
        <KkInfoRowCheck label="Ürün Kodu" values={[kod]} stateKey="kod" />
        <KkInfoRowCheck label="Ürün Adı" values={[urunAdi]} stateKey="urun_adi" />
        {!f2HidePno && <KkInfoRowCheck label="Parti Numarası" values={[pnoValue]} stateKey="pno" />}
        {!f2HideUretimTarihi && uretimTarihi ? <KkInfoRowCheck label="Üretim Tarihi" values={[uretimTarihi]} stateKey="uretim_tarihi" /> : null}
        {!f2HideTett && tett ? <KkInfoRowCheck label="TETT" values={[tett]} stateKey="tett" /> : null}

        {/* İnjectleme */}
        {!isKarma && (isFactory2 ? isDolum : true) && (
          <View style={styles.inputSection}>
            <Text style={styles.kkLabel}>İnjectleme</Text>
            <View style={styles.inputRow}>
              <View style={[styles.inputCard, { backgroundColor: injectBgColor }]}>
                <Text style={[styles.inputValue, injectlemeValue && { color: '#000' }]}>{injectlemeValue || 'QR okutunuz'}</Text>
              </View>
              {injectlemeValue ? (
                <TouchableOpacity style={styles.inputBtn} onPress={() => { setInjectlemeValue(''); setInjectMatched(null); }}>
                  <SimpleIcon name="close" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.inputBtn} onPress={() => openCamera('inject')}>
                  <SimpleIcon name="photo_camera" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <KkInfoRowCheck label="Üretim Hattı" values={[hatName]} stateKey="uretim_hatti" />
        {!isKarma && !f2HideAmbalaj && <KkInfoRowCheck label="Ambalaj Adı" values={[ambalaj]} stateKey="ambalaj_adi" />}
        {!isKarma && !f2HideKapak && <KkInfoRowCheck label="Kapak Adı" values={[kapak]} stateKey="kapak_adi" />}
        {!isKarma && !f2HideKapak && <InputCard label="Kapak Lot-No" value={kapakLotNoValue}
          onPress={() => { setTempLotInput(kapakLotNoValue); setActiveLotModal('kapak'); }}
          placeholder="Lot No giriniz" onClear={() => setKapakLotNoValue('')} />}

        {!hideHologram && !isKarma && (
          <View style={styles.inputSection}>
            <Text style={styles.kkLabel}>Hologram Seçiniz</Text>
            <View style={styles.hologramRow}>
              <TouchableOpacity style={[styles.hologramBtn, hologramValue === 'var' && { backgroundColor: successColor }]}
                onPress={() => { updateCheckboxState('hologram', true, false); setHologramValue('var'); }}>
                <Text style={{ color: hologramValue === 'var' ? '#000' : Colors.textSecondary }}>Var</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.hologramBtn, hologramValue === 'yok' && { backgroundColor: successColor }]}
                onPress={() => { updateCheckboxState('hologram', true, false); setHologramValue('yok'); }}>
                <Text style={{ color: hologramValue === 'yok' ? '#000' : Colors.textSecondary }}>Yok</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {!hideHologram && !isKarma && <InputCard label="Hologram Lot-No" value={hologramLotValue}
          onPress={() => { setTempLotInput(hologramLotValue); setActiveLotModal('hologram'); }}
          placeholder="Lot No giriniz" onClear={() => setHologramLotValue('')} />}

        <InputCard label="Operatör Adı" value={operatorAdiValue}
          onPress={() => { setTempLotInput(operatorAdiValue); setActiveLotModal('operator'); }}
          placeholder="Operatör adı giriniz" onClear={() => setOperatorAdiValue('')} />

        {!isKarma && !f2HideEtiket && <KkInfoRowCheck label={isKolileme ? 'Ürün Adı' : 'Etiket Adı'} values={[etiketAdi]} stateKey="etiket_adi" />}
        {!isKarma && !f2HideEtiketBarkod && (
          <KkInfoRowCheck label={isKolileme ? 'Ürün Barkod' : 'Etiket Barkod'} values={[viewData?.etiketBarkod || '']} stateKey="etiket_barkod"
            onCameraClick={() => openCamera('etiket')} buttonState={etiketBarkodState}
            onClearClick={() => setEtiketBarkodState({ isMatched: false, isChecked: false, scannedValue: '' })} hideCheckboxes />)}
        {!isKarma && !f2HideEtiket && <InputCard label={isKolileme ? 'Ürün Lot-No' : 'Etiket Lot-No'} value={etiketLotNoValue}
          onPress={() => { setTempLotInput(etiketLotNoValue); setActiveLotModal('etiket'); }}
          placeholder="Lot No giriniz" onClear={() => setEtiketLotNoValue('')} />}

        {!isYRM && !isDolum && !f2HideKoli && <KkInfoRowCheck label="Koli Adı" values={[koliAdi]} stateKey="koli_adi" />}
        {!isYRM && !isDolum && !f2HideKoliBarkod && (
          <KkInfoRowCheck label="Koli Barkod" values={[koliBarkod]} stateKey="koli_barkod"
            onCameraClick={() => openCamera('koli')} buttonState={koliBarkodState}
            onClearClick={() => setKoliBarkodState({ isMatched: false, isChecked: false, scannedValue: '' })} hideCheckboxes />)}
        {!isYRM && !isDolum && !f2HideKoli && <InputCard label="Koli Lot-No" value={koliLotNo}
          onPress={() => { setTempLotInput(koliLotNo); setActiveLotModal('koli'); }}
          placeholder="Lot No giriniz" onClear={() => setKoliLotNo('')} />}
      </ScrollView>

      {/* Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={[styles.bottomBtn, { backgroundColor: errorColorBtn }]} onPress={handleReportError}>
          <SimpleIcon name="warning" size={18} color="#000" />
          <Text style={styles.bottomBtnText}>Hatalı Bildir</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.bottomBtn, { backgroundColor: successColor }]} onPress={handleSubmit} disabled={isSubmitting}>
          <Text style={styles.bottomBtnText}>{isSubmitting ? 'Gönderiliyor...' : 'Rapor Gönder'}</Text>
          <SimpleIcon name="send" size={18} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Lot / Operatör Modal */}
      <Modal visible={!!activeLotModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{lotModalTitle}</Text>
            <TextInput style={styles.modalInput} value={tempLotInput} onChangeText={setTempLotInput}
              placeholder="Giriniz" placeholderTextColor={Colors.textSecondary} autoFocus />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: Colors.borderLight }]} onPress={closeLotModal}>
                <Text style={styles.modalBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: Colors.brandPrimary }]} onPress={confirmLotModal}>
                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Tamam</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Validation Modal - Using enhanced mismatch display */}
      <ValidationMismatchModal
        visible={validationModal.visible}
        success={validationModal.success}
        title={validationModal.success ? 'Doğrulama Başarılı' : 'Doğrulama Başarısız'}
        message={validationModal.message}
        scannedValue={validationModal.scannedValue}
        expectedValue={validationModal.expectedValue}
        type={validationModal.type}
        onDismiss={() => {
          setValidationModal({ visible: false, success: false, message: '', type: '', scannedValue: '', expectedValue: '' });
          closeCamera();
        }}
      />

      {/* Error Confirm Dialog */}
      <Modal visible={showConfirmErrorDialog} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <SimpleIcon name="warning" size={36} color={errorColorBtn} style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={[styles.modalTitle, { textAlign: 'center' }]}>Onay Gerekli</Text>
            <Text style={[styles.modalMessage, { textAlign: 'center' }]}>Hatalı ürün bildirmek üzeresiniz, Emin misiniz?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: Colors.borderLight }]} onPress={() => setShowConfirmErrorDialog(false)}>
                <Text style={styles.modalBtnText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: errorColorBtn }]}
                onPress={async () => {
                  setShowConfirmErrorDialog(false); setIsSubmitting(true);
                  try {
                    const payload = { fisNo: ficheno, kapakBarkod: 'HATA_BILDIRIM', hologram: hideHologram ? '0' : (hologramValue || 'yok'), etiketLot: etiketLotNoValue || undefined, koliLot: (isYRM || isDolum) ? undefined : (koliLotNo || undefined) };
                    const response = await createUretimKayit(oncuToken, payload);
                    if (response.success) { Alert.alert('Başarılı', 'Hata bildirimi gönderildi.', [{ text: 'Tamam', onPress: () => navigation.popToTop() }]); }
                    else { Alert.alert('Hata', response.message || 'Bildirim gönderilemedi.'); }
                  } catch (err) { Alert.alert('Hata', err.message || 'Bağlantı hatası.'); }
                  finally { setIsSubmitting(false); }
                }}>
                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Evet, Bildir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgApp },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 12, backgroundColor: Colors.brandPrimary, ...Shadows.md },
  headerBtn: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#FFF' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 12, paddingTop: 12, gap: 8 },
  kkRow: { borderRadius: 12, padding: 12, marginBottom: 4, backgroundColor: Colors.bgWhite },
  kkLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: Colors.brandPrimary, paddingLeft: 8 },
  kkRowContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kkValueCard: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8, minHeight: 44, justifyContent: 'center' },
  kkValue: { fontSize: 14, color: Colors.textPrimary },
  kkCameraBtn: { width: 44, height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bgSurface },
  kkCheckboxes: { flexDirection: 'row', gap: 8 },
  kkCb: { width: 36, height: 36, borderRadius: 8, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  inputSection: { marginBottom: 8 },
  inputRow: { flexDirection: 'row', gap: 8 },
  inputCard: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 8, minHeight: 48, justifyContent: 'center', backgroundColor: Colors.bgSurface },
  inputValue: { fontSize: 14, color: Colors.textSecondary },
  inputBtn: { width: 48, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bgSurface },
  hologramRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 8 },
  hologramBtn: { flex: 1, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bgSurface },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', paddingHorizontal: 12, paddingTop: 12, gap: 8, backgroundColor: Colors.bgWhite },
  bottomBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  bottomBtnText: { fontSize: 14, fontWeight: '600', color: '#000' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, borderRadius: 16, padding: 20, backgroundColor: Colors.bgWhite },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: Colors.textPrimary },
  modalMessage: { fontSize: 14, marginBottom: 20, color: Colors.textSecondary },
  modalInput: { borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, marginBottom: 20, color: Colors.textPrimary, backgroundColor: Colors.bgApp },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  modalBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  cameraHeader: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 12, backgroundColor: 'rgba(0,0,0,0.5)' },
  cameraBackBtn: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  cameraTitleText: { fontSize: 18, fontWeight: '600', color: '#FFF' },
  cameraScanFrame: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  cameraScanBox: { width: 250, height: 250, borderWidth: 2, borderColor: '#FFF', borderRadius: 16, backgroundColor: 'transparent' },
  cameraScanBoxWide: { width: 300, height: 150, borderWidth: 2, borderColor: '#FFF', borderRadius: 12, backgroundColor: 'transparent' },
  cameraZoomRow: { position: 'absolute', bottom: 120, alignSelf: 'center', flexDirection: 'row', gap: 12, zIndex: 10 },
  zoomBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  zoomBtnActive: { backgroundColor: '#FFF' },
  zoomBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  zoomBtnTextActive: { color: '#000' },
  scanFeedbackContainer: { marginTop: 24, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 8, maxWidth: 320 },
  scanInstructionText: { color: '#FFF', fontSize: 14, textAlign: 'center' },
});
