import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Alert,
  StatusBar,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';
import SimpleIcon from '../components/SimpleIcon';
import { Chip, Banner, SectionCard, StatCard } from '../components/ui';
import { CalendarIcon, ProduceIcon, BoltIcon, BoxIcon, FlaskIcon, BarrelIcon, BottleIcon, FactoryIcon, PenIcon, CheckIcon } from '../components/Icons';
import {
  getGunlukRaporByTarih,
  createGunlukRapor,
  updateGunlukRapor,
  deleteGunlukRapor,
} from '../api/formsApi';

const today = () => new Date().toISOString().split('T')[0];

const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const formatTR = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d)} ${TR_MONTHS[parseInt(m) - 1]} ${y}`;
};

const emptyForm = () => ({
  raporTarihi: today(),
  domateslKg: '', biberKg: '',
  lngGelenKg: '', lngTuketimKg: '', lngStokKg: '', elektrikTuketimKw: '', suTuketimM3: '',
  kutu112830IcPiyasaAdet: '', kutu112830TuzluIhrAdet: '',
  kutu512830IcPiyasaAdet: '', kutu512830TuzluIhrAdet: '', kutu1012830Adet: '',
  aspFici3234BrxKg: '', aspFici2022BrxKg: '', aspFici2830BrxKg: '', aspFici2830BrxAdet: '',
  pet21Oncu32brxAdet: '', pet1128bxAdet: '',
  aseptikDomateslMetalFiciKg: '', aseptikDomateslMetalFiciAdet: '',
  aseptikDomateslPlastikFiciKg: '',
  aseptik3234DomateslSalcasiKg: '', aseptik2022DomateslSalcasiKg: '',
  aseptik2426BiberSalcasiKg: '', aseptik2426BiberSalcasiPlastikKg: '',
  domateslKuspeKg: '', biberKuspeKg: '',
  fireMiktariAdetGun: '', ambalajFiresiAdet: '',
  kutuOrtRenk: '', kutuOrtBrix: '', hammaddeOrtBrix: '',
  hazirlayan: '', kontrolEden: '', onaylayan: '',
});

function normalizeForm(data) {
  const base = emptyForm();
  const out = {};
  for (const key of Object.keys(base)) {
    if (key === 'raporTarihi') {
      out.raporTarihi = data.raporTarihi ? data.raporTarihi.split('T')[0] : base.raporTarihi;
    } else {
      const val = data[key];
      out[key] = val === null || val === undefined ? '' : String(val);
    }
  }
  return out;
}

function buildPayload(form) {
  const payload = {};
  const base = emptyForm();
  for (const key of Object.keys(base)) {
    const val = form[key];
    if (key === 'raporTarihi') {
      payload[key] = val;
    } else if (['hazirlayan', 'kontrolEden', 'onaylayan'].includes(key)) {
      payload[key] = val || '';
    } else {
      const n = parseFloat(String(val).replace(',', '.'));
      payload[key] = isNaN(n) ? 0 : n;
    }
  }
  return payload;
}

function validate(form) {
  const errors = {};
  if (!form.raporTarihi) errors['raporTarihi'] = 'Tarih zorunludur';
  const { lngTuketimKg, lngGelenKg } = form;
  if (lngTuketimKg !== '' && lngGelenKg !== '' && Number(lngTuketimKg) > Number(lngGelenKg)) {
    errors['lngTuketimKg'] = 'Tüketim, gelen miktarı geçemez';
  }
  if (form.kutuOrtBrix !== '' && form.kutuOrtBrix !== '0' && form.kutuOrtBrix !== '0.00') {
    const b = Number(form.kutuOrtBrix);
    if (b !== 0 && (b < 20 || b > 40)) errors['kutuOrtBrix'] = 'Brix değeri 20–40 arasında olmalı';
  }
  return errors;
}

function calcTotal(form) {
  const ignore = ['raporTarihi'];
  const keys = Object.keys(form).filter(k => !ignore.includes(k));
  let total = keys.length, filled = 0;
  keys.forEach(k => {
    const v = form[k];
    if (v !== '' && v !== null && v !== undefined && v !== '0' && v !== '0.000' && v !== '0.00') filled++;
  });
  return total > 0 ? Math.round((filled / total) * 100) : 0;
}

function buildSummary(form) {
  const ham = (Number(form.domateslKg) || 0) + (Number(form.biberKg) || 0);
  const kutu = (Number(form.kutu112830IcPiyasaAdet) || 0) + (Number(form.kutu112830TuzluIhrAdet) || 0)
    + (Number(form.kutu512830IcPiyasaAdet) || 0) + (Number(form.kutu512830TuzluIhrAdet) || 0)
    + (Number(form.kutu1012830Adet) || 0);
  return [
    { label: 'Toplam Hammadde', value: ham ? `${ham.toLocaleString('tr-TR')} kg` : '—', icon: <ProduceIcon size={16} color={Colors.danger} />, color: Colors.danger },
    { label: 'Elektrik', value: form.elektrikTuketimKw ? `${Number(form.elektrikTuketimKw).toLocaleString('tr-TR')} kWh` : '—', icon: <BoltIcon size={16} color={Colors.warning} />, color: Colors.warning },
    { label: 'Toplam Kutu', value: kutu ? `${kutu.toLocaleString('tr-TR')}` : '—', icon: <BoxIcon size={16} color={Colors.brandPrimary} />, color: Colors.brandPrimary },
    { label: 'Ort. Kutu Brix', value: form.kutuOrtBrix ? `${form.kutuOrtBrix} °Bx` : '—', icon: <FlaskIcon size={16} color={Colors.purple} />, color: Colors.purple },
  ];
}

const sectionIcons = {
  'KULLANILAN HAMMADDE': <ProduceIcon size={16} color={Colors.danger} />,
  'TÜKETİLEN ENERJİ': <BoltIcon size={16} color={Colors.warning} />,
  'KUTU ÜRETİM (Adet)': <BoxIcon size={16} color={Colors.brandPrimary} />,
  'KULLANILAN ASP. YARIMAMÜL FIÇI (Kg)': <BarrelIcon size={16} color={Colors.textSecondary} />,
  'PET ÜRETİM (Adet)': <BottleIcon size={16} color={Colors.textSecondary} />,
  'ASEPTİK ÜRETİM': <FactoryIcon size={16} color={Colors.textSecondary} />,
  'KALİTE PARAMETRELERİ': <FlaskIcon size={16} color={Colors.purple} />,
  'ONAY BİLGİLERİ': <PenIcon size={16} color={Colors.textSecondary} />,
};

const sections = [
  {
    title: 'KULLANILAN HAMMADDE',
    rows: [
      { label: 'Domates', key: 'domateslKg', unit: 'kg', type: 'number' },
      { label: 'Biber', key: 'biberKg', unit: 'kg', type: 'number' },
    ],
  },
  {
    title: 'TÜKETİLEN ENERJİ',
    rows: [
      { label: 'LNG Gelen', key: 'lngGelenKg', unit: 'kg', type: 'number' },
      { label: 'LNG Tüketim', key: 'lngTuketimKg', unit: 'kg', type: 'number' },
      { label: 'LNG Stok', key: 'lngStokKg', unit: 'kg', type: 'number' },
      { label: 'Elektrik', key: 'elektrikTuketimKw', unit: 'kWh', type: 'number' },
      { label: 'Su', key: 'suTuketimM3', unit: 'm³', type: 'number' },
    ],
  },
  {
    title: 'KUTU ÜRETİM (Adet)',
    rows: [
      { label: '1/1 28-30 ÖNCÜ İç Piyasa', key: 'kutu112830IcPiyasaAdet', unit: 'adet', type: 'number' },
      { label: '1/1 28-30 ÖNCÜ Tuzlu İhr.', key: 'kutu112830TuzluIhrAdet', unit: 'adet', type: 'number' },
      { label: '5/1 28-30 ÖNCÜ İç Piyasa', key: 'kutu512830IcPiyasaAdet', unit: 'adet', type: 'number' },
      { label: '5/1 28-30 ÖNCÜ Tuzlu İhr.', key: 'kutu512830TuzluIhrAdet', unit: 'adet', type: 'number' },
      { label: '10/1 28-30 ÖNCÜ', key: 'kutu1012830Adet', unit: 'adet', type: 'number' },
    ],
  },
  {
    title: 'KULLANILAN ASP. YARIMAMÜL FIÇI (Kg)',
    rows: [
      { label: 'Asp Öncü Domates Salçası (32-34 brx)', key: 'aspFici3234BrxKg', unit: 'kg', type: 'number' },
      { label: 'Asp Öncü Domates Salçası (20-22 brx)', key: 'aspFici2022BrxKg', unit: 'kg', type: 'number' },
      { label: 'Asp Öncü Domates Salçası (28-30 brx) KG', key: 'aspFici2830BrxKg', unit: 'kg', type: 'number' },
      { label: 'Asp Öncü Domates Salçası (28-30 brx) Fıçı', key: 'aspFici2830BrxAdet', unit: 'adet', type: 'number' },
    ],
  },
  {
    title: 'PET ÜRETİM (Adet)',
    rows: [
      { label: '2/1 Öncü Domates Salçası (32 brx)', key: 'pet21Oncu32brxAdet', unit: 'adet', type: 'number' },
      { label: '1/1 28 Bx', key: 'pet1128bxAdet', unit: 'adet', type: 'number' },
    ],
  },
  {
    title: 'ASEPTİK ÜRETİM',
    rows: [
      { label: 'Asp 28-30 Metal Fıçı KG', key: 'aseptikDomateslMetalFiciKg', unit: 'kg', type: 'number' },
      { label: 'Asp 28-30 Metal Fıçı Adeti', key: 'aseptikDomateslMetalFiciAdet', unit: 'adet', type: 'number' },
      { label: 'Asp 28-30 Plastik Fıçı', key: 'aseptikDomateslPlastikFiciKg', unit: 'kg', type: 'number' },
      { label: 'Asp 32-34 Domates Salçası', key: 'aseptik3234DomateslSalcasiKg', unit: 'kg', type: 'number' },
      { label: 'Asp 20-22 Domates Salçası', key: 'aseptik2022DomateslSalcasiKg', unit: 'kg', type: 'number' },
      { label: 'Asp 24-26 Biber Salçası', key: 'aseptik2426BiberSalcasiKg', unit: 'kg', type: 'number' },
      { label: 'Asp 24-26 Biber Salçası (Plastik)', key: 'aseptik2426BiberSalcasiPlastikKg', unit: 'kg', type: 'number' },
      { label: 'Domates Küspe Miktarı', key: 'domateslKuspeKg', unit: 'kg', type: 'number' },
      { label: 'Biber Küspe Miktarı', key: 'biberKuspeKg', unit: 'kg', type: 'number' },
      { label: 'Fire Miktarları Adet / Gün', key: 'fireMiktariAdetGun', unit: 'adet', type: 'number' },
      { label: 'Ambalaj Firesi Adet', key: 'ambalajFiresiAdet', unit: 'adet', type: 'number' },
    ],
  },
  {
    title: 'KALİTE PARAMETRELERİ',
    rows: [
      { label: 'Ortalama Renk', key: 'kutuOrtRenk', unit: '', type: 'number' },
      { label: 'Ortalama Kutu Brix', key: 'kutuOrtBrix', unit: '°Bx', type: 'number' },
      { label: 'Hammadde Ort. Brix', key: 'hammaddeOrtBrix', unit: '°Bx', type: 'number' },
    ],
  },
  {
    title: 'ONAY BİLGİLERİ',
    rows: [
      { label: 'Hazırlayan', key: 'hazirlayan', type: 'text' },
      { label: 'Kontrol Eden', key: 'kontrolEden', type: 'text' },
      { label: 'Onaylayan', key: 'onaylayan', type: 'text' },
    ],
  },
];

function FormField({ row, value, error, isReadOnly, onChangeText }) {
  return (
    <View style={[fieldStyles.container, error && fieldStyles.containerError]}>
      <View style={fieldStyles.labelRow}>
        <Text style={fieldStyles.label}>{row.label}</Text>
        {row.unit ? <Text style={fieldStyles.unit}>{row.unit}</Text> : null}
      </View>
      <View style={[fieldStyles.inputWrap, error && fieldStyles.inputError]}>
        <TextInput
          style={fieldStyles.input}
          value={String(value)}
          onChangeText={onChangeText}
          placeholder={row.type === 'number' ? '0' : 'Yazınız...'}
          placeholderTextColor={Colors.textTertiary}
          keyboardType={row.type === 'number' ? 'decimal-pad' : 'default'}
          editable={!isReadOnly}
        />
      </View>
      {error && <Text style={fieldStyles.error}>{error}</Text>}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  containerError: {
    backgroundColor: Colors.dangerBg,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    flex: 1,
  },
  unit: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    backgroundColor: Colors.bgSurface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  inputWrap: {
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  input: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    padding: Spacing.md,
    textAlign: 'right',
  },
  error: {
    fontSize: 11,
    color: Colors.danger,
    fontWeight: '500',
    marginTop: 4,
  },
});

export default function UretimFormScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const editRapor = route.params?.rapor || null;

  const [form, setForm] = useState(emptyForm());
  const [recordId, setRecordId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState('edit');
  const [isExistingRecord, setIsExistingRecord] = useState(false);
  const [errors, setErrors] = useState({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [serverErrMsg, setServerErrMsg] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingDate, setPendingDate] = useState(null);

  const loadReport = useCallback((dateStr) => {
    setIsLoading(true);
    setIsExistingRecord(false);
    setRecordId(null);
    setMode('edit');
    setErrors({});
    setHasSubmitted(false);
    setServerErrMsg('');
    getGunlukRaporByTarih(dateStr)
      .then(data => {
        setForm(normalizeForm(data));
        setRecordId(data.id);
        setIsExistingRecord(true);
      })
      .catch(() => {
        setForm({ ...emptyForm(), raporTarihi: dateStr });
        setIsExistingRecord(false);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (editRapor) {
      // Editing an existing record passed from list
      setForm(normalizeForm(editRapor));
      setRecordId(editRapor.id);
      setIsExistingRecord(true);
    } else {
      // New record
      setForm(emptyForm());
      setRecordId(null);
      setIsExistingRecord(false);
    }
  }, [editRapor]);
  useEffect(() => { if (hasSubmitted) setErrors(validate(form)); }, [form, hasSubmitted]);

  const updateField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (isSaving || isLoading || mode !== 'edit') return;
    setHasSubmitted(true);
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setIsSaving(true);
    setServerErrMsg('');
    try {
      const payload = buildPayload(form);
      if (isExistingRecord && recordId) {
        await updateGunlukRapor(recordId, payload);
      } else {
        try {
          const result = await createGunlukRapor(payload);
          setRecordId(result.id);
          setIsExistingRecord(true);
        } catch (postErr) {
          // If duplicate date error, fetch existing record and update instead
          if (postErr.message && postErr.message.includes('zaten mevcut')) {
            const existing = await getGunlukRaporByTarih(form.raporTarihi);
            if (existing && existing.id) {
              await updateGunlukRapor(existing.id, payload);
              setRecordId(existing.id);
              setIsExistingRecord(true);
            } else {
              throw postErr;
            }
          } else {
            throw postErr;
          }
        }
      }
      setMode('saved');
    } catch (e) {
      setMode('server-error');
      setServerErrMsg(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetry = async () => {
    setIsSaving(true);
    setServerErrMsg('');
    try {
      const payload = buildPayload(form);
      if (isExistingRecord && recordId) {
        await updateGunlukRapor(recordId, payload);
      } else {
        try {
          const result = await createGunlukRapor(payload);
          setRecordId(result.id);
          setIsExistingRecord(true);
        } catch (postErr) {
          if (postErr.message && postErr.message.includes('zaten mevcut')) {
            const existing = await getGunlukRaporByTarih(form.raporTarihi);
            if (existing && existing.id) {
              await updateGunlukRapor(existing.id, payload);
              setRecordId(existing.id);
              setIsExistingRecord(true);
            } else {
              throw postErr;
            }
          } else {
            throw postErr;
          }
        }
      }
      setMode('saved');
    } catch (e) {
      setServerErrMsg(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!isExistingRecord || !recordId) return;
    Alert.alert('Rapor Sil', 'Bu günlük raporu silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive', onPress: async () => {
          setIsSaving(true);
          try {
            await deleteGunlukRapor(recordId);
            setForm({ ...emptyForm(), raporTarihi: form.raporTarihi });
            setRecordId(null);
            setIsExistingRecord(false);
            setMode('edit');
          } catch (e) {
            Alert.alert('Hata', e.message);
          } finally {
            setIsSaving(false);
          }
        },
      },
    ]);
  };

  const handleEdit = () => { setMode('edit'); setHasSubmitted(false); setErrors({}); };
  const handleNewEntry = () => {
    setForm(emptyForm());
    setRecordId(null);
    setIsExistingRecord(false);
    setMode('edit');
    setHasSubmitted(false);
    setErrors({});
  };
  const handleReset = () => {
    setForm({ ...emptyForm(), raporTarihi: form.raporTarihi });
    setIsExistingRecord(false);
    setRecordId(null);
    setHasSubmitted(false);
    setErrors({});
    setServerErrMsg('');
    setMode('edit');
  };
  const handleDatePickerChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'set' && date) {
        setPendingDate(null);
        loadReport(date.toISOString().split('T')[0]);
      }
      return;
    }
    if (date) setPendingDate(date);
  };

  const handleDateConfirm = () => {
    if (pendingDate) {
      loadReport(pendingDate.toISOString().split('T')[0]);
    }
    setShowDatePicker(false);
    setPendingDate(null);
  };

  const handleDateCancel = () => {
    setShowDatePicker(false);
    setPendingDate(null);
  };

  const openDatePicker = () => {
    setPendingDate(new Date(form.raporTarihi));
    setShowDatePicker(true);
  };

  const isReadOnly = mode === 'saved';
  const isBusy = isSaving || isLoading;
  const progress = calcTotal(form);
  const errorCount = Object.keys(errors).length;
  const summary = buildSummary(form);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.backBtn}
              >
                <SimpleIcon name="chevron-left" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
              <View>
                <Text style={styles.pageTitle}>{isExistingRecord ? 'Rapor Düzenle' : 'Yeni Rapor'}</Text>
                <Text style={styles.pageSubtitle}>Üretim veri girişi</Text>
              </View>
            </View>
            <Chip
              label={mode === 'saved' ? 'Kaydedildi' : 'Düzenleniyor'}
              color={mode === 'saved' ? Colors.success : Colors.brandPrimary}
              bgColor={mode === 'saved' ? Colors.successLight : Colors.brandPrimaryLight}
              size="sm"
              icon={mode === 'saved' ? <CheckIcon size={10} color={Colors.success} /> : null}
            />
          </View>
        </View>

        {/* Banners */}
        {!isLoading && isExistingRecord && mode === 'edit' && !hasSubmitted && (
          <Banner type="info" message="Bu tarih için kayıt mevcut — güncelleme yapılacak" />
        )}
        {hasSubmitted && errorCount > 0 && mode === 'edit' && (
          <Banner type="warning" message={`${errorCount} alanda hata var — lütfen kontrol edin`} />
        )}
        {mode === 'saved' && (
          <Banner type="success" message={`${formatTR(form.raporTarihi)} raporu başarıyla kaydedildi`} />
        )}
        {mode === 'server-error' && (
          <Banner type="error" message={`Sunucuya bağlanılamadı${serverErrMsg ? ` (${serverErrMsg})` : ''}`} />
        )}

        {/* Summary Cards when saved */}
        {mode === 'saved' && (
          <View style={styles.summaryRow}>
            {summary.map(s => (
              <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} color={s.color} />
            ))}
          </View>
        )}

        {/* Form Body */}
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Date & Progress Bar */}
          <View style={styles.controlBar}>
            <TouchableOpacity
              style={styles.dateSelector}
              onPress={() => !isBusy && !isReadOnly && openDatePicker()}
              disabled={isBusy || isReadOnly}
              activeOpacity={0.7}
            >
              <CalendarIcon size={20} color={Colors.brandPrimary} />
              <View>
                <Text style={styles.dateSelectorLabel}>RAPOR TARİHİ</Text>
                <Text style={styles.dateSelectorValue}>{formatTR(form.raporTarihi)}</Text>
              </View>
            </TouchableOpacity>

            {showDatePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={pendingDate || new Date(form.raporTarihi)}
                mode="date"
                display="default"
                onChange={handleDatePickerChange}
              />
            )}
            {showDatePicker && Platform.OS === 'ios' && (
              <Modal visible={true} transparent animationType="fade">
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ backgroundColor: Colors.bgWhite, borderRadius: Radius.lg, padding: Spacing.lg, width: '85%', maxWidth: 360 }}>
              <DateTimePicker
                value={pendingDate || new Date(form.raporTarihi)}
                mode="date"
                display="spinner"
                themeVariant="light"
                locale="tr"
                onChange={handleDatePickerChange}
                style={{ height: 180 }}
              />
              <View style={styles.datePickerActions}>
                <TouchableOpacity style={styles.datePickerCancel} onPress={handleDateCancel}>
                  <Text style={styles.datePickerCancelText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.datePickerConfirm} onPress={handleDateConfirm}>
                  <Text style={styles.datePickerConfirmText}>Seç</Text>
                </TouchableOpacity>
              </View>
              </View>
              </View>
              </Modal>
            )}

            <View style={styles.progressWrap}>
              <View style={styles.progressInfo}>
                <Text style={styles.progressLabel}>Tamamlanma</Text>
                <Text style={[styles.progressPercent, progress === 100 && { color: Colors.success }]}>
                  %{progress}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[
                  styles.progressFill,
                  { width: `${progress}%` },
                  progress === 100 && { backgroundColor: Colors.success },
                ]} />
              </View>
            </View>
          </View>

          {/* Status Action Bar */}
          {mode === 'saved' && (
            <View style={styles.actionBar}>
              <TouchableOpacity style={styles.ghostBtn} onPress={handleEdit}>
                <Text style={styles.ghostBtnText}>Düzenle</Text>
              </TouchableOpacity>
              {isExistingRecord && recordId && (
                <TouchableOpacity style={[styles.ghostBtn, { borderWidth: 1, borderColor: Colors.danger }]} onPress={handleDelete}>
                  <Text style={[styles.ghostBtnText, { color: Colors.danger }]}>Sil</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
                <Text style={styles.primaryBtnText}>← Listeye Dön</Text>
              </TouchableOpacity>
            </View>
          )}
          {mode === 'server-error' && (
            <View style={styles.actionBar}>
              <TouchableOpacity style={styles.ghostBtn} onPress={() => setMode('edit')} disabled={isBusy}>
                <Text style={styles.ghostBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, isBusy && { opacity: 0.5 }]}
                onPress={handleRetry}
                disabled={isBusy}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Tekrar Dene</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={Colors.brandPrimary} />
              <Text style={styles.loadingText}>Rapor yükleniyor...</Text>
            </View>
          ) : (
            <>
              {sections.map(section => (
                <SectionCard key={section.title} title={section.title}>
                  {section.rows.map(row => {
                    const value = form[row.key] ?? '';
                    const error = errors[row.key];
                    return (
                      <FormField
                        key={row.key}
                        row={row}
                        value={value}
                        error={error}
                        isReadOnly={isReadOnly}
                        onChangeText={v => updateField(row.key, v)}
                      />
                    );
                  })}
                </SectionCard>
              ))}

              {/* Bottom Save & Reset */}
              {mode === 'edit' && !isLoading && (
                <View style={styles.bottomSave}>
                  <Text style={styles.bottomHint}>
                    Tüm veriler hazır olduğunda raporu kaydedin
                  </Text>
                  <View style={styles.bottomBtnRow}>
                    <TouchableOpacity
                      style={styles.bottomResetBtn}
                      onPress={handleReset}
                      disabled={isBusy}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.bottomResetBtnText}>Sıfırla</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveBtnLg, (isSaving || isReadOnly) && { opacity: 0.5 }]}
                      onPress={handleSave}
                      disabled={isSaving || isReadOnly}
                      activeOpacity={0.8}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.saveBtnLgText}>
                          {isExistingRecord ? 'Raporu Güncelle' : 'Raporu Kaydet'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgApp },

  // Header
  header: {
    backgroundColor: Colors.bgWhite,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
    paddingTop: (StatusBar.currentHeight || 50) + Spacing.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  pageTitle: { ...Typography.title1 },
  pageSubtitle: { ...Typography.subhead, marginTop: 2 },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { fontSize: 22, fontWeight: '600', color: Colors.textPrimary, marginTop: -2 },

  // Control Bar - moved inside ScrollView
  controlBar: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  dateIcon: { fontSize: 20 },
  dateSelectorLabel: { ...Typography.caption1, fontSize: 9, marginBottom: 1 },
  dateSelectorValue: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },

  // Date Picker Actions
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  datePickerCancel: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgSurface,
  },
  datePickerCancelText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
  datePickerConfirm: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: Radius.sm,
    backgroundColor: Colors.brandPrimary,
  },
  datePickerConfirmText: { color: Colors.textWhite, fontWeight: '600', fontSize: 14 },

  progressWrap: {},
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressLabel: { ...Typography.caption1, fontSize: 10 },
  progressPercent: { fontSize: 13, fontWeight: '700', color: Colors.brandPrimary },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.round,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.brandPrimary,
    borderRadius: Radius.round,
  },

  // Actions
  actionBar: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  ghostBtn: {
    flex: 1,
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.sm,
    paddingVertical: 11,
    alignItems: 'center',
  },
  ghostBtnText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
  primaryBtn: {
    flex: 1,
    backgroundColor: Colors.brandPrimary,
    borderRadius: Radius.sm,
    paddingVertical: 11,
    alignItems: 'center',
  },
  primaryBtnText: { color: Colors.textWhite, fontWeight: '600', fontSize: 14 },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },

  // Body
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 80 },

  // Loading
  loadingWrap: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  loadingText: { ...Typography.subhead, color: Colors.brandPrimary },

  // Bottom Save
  bottomSave: {
    backgroundColor: Colors.brandPrimaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginTop: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.brandPrimary,
    borderStyle: 'dashed',
  },
  bottomHint: {
    ...Typography.callout,
    textAlign: 'center',
    marginBottom: Spacing.md,
    color: Colors.brandPrimaryDark,
  },
  bottomBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  bottomResetBtn: {
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  bottomResetBtnText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
  saveBtnLg: {
    backgroundColor: Colors.brandPrimary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    flex: 1,
    ...Shadows.md,
  },
  saveBtnLgText: { color: Colors.textWhite, fontWeight: '700', fontSize: 16 },
});