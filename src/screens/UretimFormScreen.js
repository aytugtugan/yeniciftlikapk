import React, { useState, useEffect, useCallback, useContext } from 'react';
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
  getGunlukUretilenUrunler,
  getUretimeVerilenCikis,
  getStokHareketVardiyaOzet,
  getFireKayitlariFormsApi,
  getVardiyaRaporListV1,
  getVardiyaPaketlemeList,
  getVardiyaHammaddeListV1,
} from '../api/formsApi';
import { AppDataContext } from '../context/AppDataContext';
import {
  toNum, toNumField, toIntField, avg, firstOf, asList, norm,
  getPaketCode, detectPaketFieldByCode, detectPaketFieldByName, detectPaketField,
  vardiyaFromBaslangic, fireTotalsForDate,
  mapUretimeVerilenFromCikis, mapUretilenFromRows,
} from '../utils/productMatcher';
import { toLocalDateStr, todayStr } from '../utils/dateUtils';

const today = () => todayStr();

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

function buildPayload(form, childLists) {
  const payload = {};
  const base = emptyForm();
  const toN = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) || String(v).trim() === '' ? null : n; };
  const toInt = (v) => { const n = toN(v); return n !== null ? Math.round(n) : null; };
  for (const key of Object.keys(base)) {
    const val = form[key];
    if (key === 'raporTarihi') {
      payload[key] = val ? `${val.split('T')[0]}T00:00:00` : val;
    } else if (['hazirlayan', 'kontrolEden', 'onaylayan'].includes(key)) {
      payload[key] = val || '';
    } else {
      payload[key] = toN(val);
    }
  }
  // Override asp* fields from uretimVerilen child list (matches web toPayload)
  const uretimVerilenList = childLists?.uretimVerilen || [];
  uretimVerilenList.forEach(p => {
    if (p.urunAdi === 'aspFici3234BrxKg')  payload.aspFici3234BrxKg  = toN(p.deger);
    if (p.urunAdi === 'aspFici2022BrxKg')  payload.aspFici2022BrxKg  = toN(p.deger);
    if (p.urunAdi === 'aspFici2830BrxKg')  payload.aspFici2830BrxKg  = toN(p.deger);
    if (p.urunAdi === 'aspFici2830BrxAdet') payload.aspFici2830BrxAdet = toInt(p.deger);
  });
  // Override aseptik* fields from uretilen child list (matches web toPayload)
  const uretilenList = childLists?.uretilen || [];
  uretilenList.forEach(p => {
    if (p.urunAdi === 'aseptik3234DomateslSalcasiKg')     payload.aseptik3234DomateslSalcasiKg     = toN(p.deger);
    if (p.urunAdi === 'aseptik2022DomateslSalcasiKg')     payload.aseptik2022DomateslSalcasiKg     = toN(p.deger);
    if (p.urunAdi === 'aseptik2426BiberSalcasiKg')        payload.aseptik2426BiberSalcasiKg        = toN(p.deger);
    if (p.urunAdi === 'aseptik2426BiberSalcasiPlastikKg') payload.aseptik2426BiberSalcasiPlastikKg = toN(p.deger);
    if (p.urunAdi === 'aseptikDomateslMetalFiciKg')       payload.aseptikDomateslMetalFiciKg       = toN(p.deger);
    if (p.urunAdi === 'aseptikDomateslMetalFiciAdet')     payload.aseptikDomateslMetalFiciAdet     = toInt(p.deger);
    if (p.urunAdi === 'aseptikDomateslPlastikFiciKg')     payload.aseptikDomateslPlastikFiciKg     = toN(p.deger);
  });
  // Attach child lists (API only accepts urunAdi + deger)
  payload.uretimVerilen = uretimVerilenList.map(item => ({
    urunAdi: item.urunAdi || '',
    deger: Number(item.deger) || 0,
  }));
  payload.uretilen = uretilenList.map(item => ({
    urunAdi: item.urunAdi || '',
    deger: Number(item.deger) || 0,
  }));
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

// ── Tab definitions ──────────────────────────────────────────
const TAB_KEYS = ['hammaddeEnerji', 'tuketilenHYM', 'uretilen', 'fire', 'kalite', 'imzalar'];
const TAB_LABELS = {
  hammaddeEnerji: 'Hammadde & Enerji',
  tuketilenHYM: 'Tüketilen H-YM',
  uretilen: 'Üretilen',
  fire: 'Fire',
  kalite: 'Kalite',
  imzalar: 'İmzalar',
};

const tabSections = {
  hammaddeEnerji: [
    {
      title: 'KULLANILAN HAMMADDE',
      rows: [
        { label: 'Domates', key: 'domateslKg', unit: 'kg', type: 'number' },
        { label: 'Biber', key: 'biberKg', unit: 'kg', type: 'number' },
      ],
    },
    {
      title: 'KÜSPE',
      rows: [
        { label: 'Domates Küspe', key: 'domateslKuspeKg', unit: 'kg', type: 'number' },
        { label: 'Biber Küspe', key: 'biberKuspeKg', unit: 'kg', type: 'number' },
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
  ],
  // Üretilen tab: only shows child list (read-only), no scalar fields.
  // Scalar production fields (kutu*, asp*, pet*, aseptik*) are auto-filled
  // and saved in the payload but not shown as editable form fields.
  // They appear in Excel export and Detail view only.
  fire: [
    {
      title: 'FİRE',
      rows: [
        { label: 'Fire Miktarı (adet/gün)', key: 'fireMiktariAdetGun', unit: 'adet', type: 'number' },
        { label: 'Ambalaj Firesi', key: 'ambalajFiresiAdet', unit: 'adet', type: 'number' },
      ],
    },
  ],
  kalite: [
    {
      title: 'KALİTE PARAMETRELERİ',
      rows: [
        { label: 'Ortalama Renk', key: 'kutuOrtRenk', unit: '', type: 'number' },
        { label: 'Ortalama Kutu Brix', key: 'kutuOrtBrix', unit: '°Bx', type: 'number' },
        { label: 'Hammadde Ort. Brix', key: 'hammaddeOrtBrix', unit: '°Bx', type: 'number' },
      ],
    },
  ],
  imzalar: [
    {
      title: 'ONAY BİLGİLERİ',
      rows: [
        { label: 'Hazırlayan', key: 'hazirlayan', type: 'text', readOnly: true },
        { label: 'Kontrol Eden', key: 'kontrolEden', type: 'text' },
        { label: 'Onaylayan', key: 'onaylayan', type: 'text' },
      ],
    },
  ],
};

function FormField({ row, value, error, isReadOnly, onChangeText }) {
  const fieldReadOnly = isReadOnly || row.readOnly;
  return (
    <View style={[fieldStyles.container, error && fieldStyles.containerError]}>
      <View style={fieldStyles.labelRow}>
        <Text style={fieldStyles.label}>{row.label}</Text>
        {row.readOnly && <Text style={fieldStyles.readOnlyBadge}>Otomatik</Text>}
        {row.unit ? <Text style={fieldStyles.unit}>{row.unit}</Text> : null}
      </View>
      <View style={[fieldStyles.inputWrap, error && fieldStyles.inputError, fieldReadOnly && fieldStyles.inputReadOnly]}>
        <TextInput
          style={[fieldStyles.input, fieldReadOnly && fieldStyles.inputTextReadOnly]}
          value={String(value)}
          onChangeText={onChangeText}
          placeholder={row.type === 'number' ? '0' : 'Yazınız...'}
          placeholderTextColor={Colors.textTertiary}
          keyboardType={row.type === 'number' ? 'decimal-pad' : 'default'}
          editable={!fieldReadOnly}
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
  readOnlyBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textTertiary,
    backgroundColor: Colors.bgSurface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  inputReadOnly: {
    backgroundColor: Colors.bgSurface,
    borderColor: Colors.borderLight,
    opacity: 0.7,
  },
  inputTextReadOnly: {
    color: Colors.textSecondary,
  },
});

// ── Child List Section ───────────────────────────────────────
function ChildListSection({ title, items, color, isReadOnly, onChange }) {
  return (
    <View style={childStyles.container}>
      <View style={[childStyles.header, { borderLeftColor: color }]}>  
        <Text style={[childStyles.title, { color }]}>{title}</Text>
        <Text style={childStyles.count}>{items.length} kalem</Text>
      </View>
      {items.map((item, idx) => (
        <View key={idx} style={[childStyles.row, idx < items.length - 1 && childStyles.rowBorder]}>
          <View style={childStyles.rowLeft}>
            {item.stokKodu ? (
              <View style={childStyles.codeBadge}>
                <Text style={childStyles.codeText}>{item.stokKodu}</Text>
              </View>
            ) : null}
            <Text style={childStyles.itemName} numberOfLines={2}>{item.urunAdi}</Text>
          </View>
          <TextInput
            style={childStyles.valueInput}
            value={String(item.deger || '')}
            onChangeText={(v) => {
              if (isReadOnly) return;
              const updated = [...items];
              updated[idx] = { ...updated[idx], deger: v };
              onChange(updated);
            }}
            keyboardType="decimal-pad"
            editable={!isReadOnly}
            placeholder="0"
            placeholderTextColor={Colors.textTertiary}
          />
        </View>
      ))}
      {items.length === 0 && (
        <Text style={childStyles.empty}>Veri yok</Text>
      )}
    </View>
  );
}

const childStyles = StyleSheet.create({
  container: { backgroundColor: Colors.bgWhite, borderRadius: Radius.lg, marginBottom: Spacing.md, overflow: 'hidden', ...Shadows.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderLeftWidth: 4, backgroundColor: Colors.bgSurface },
  title: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  count: { fontSize: 11, fontWeight: '600', color: Colors.textTertiary },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  rowBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  rowLeft: { flex: 1, marginRight: 12 },
  codeBadge: { backgroundColor: Colors.brandPrimaryLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 2 },
  codeText: { fontSize: 9, fontWeight: '700', color: Colors.brandPrimary, letterSpacing: 0.3 },
  itemName: { fontSize: 12, fontWeight: '500', color: Colors.textPrimary },
  valueInput: { width: 90, fontSize: 15, fontWeight: '700', color: Colors.textPrimary, backgroundColor: Colors.bgSurface, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 6, textAlign: 'right', borderWidth: 1, borderColor: Colors.borderLight },
  empty: { fontSize: 13, color: Colors.textTertiary, textAlign: 'center', paddingVertical: 20 },
});

// ── Main Screen ──────────────────────────────────────────────
export default function UretimFormScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { selectedFabrika, loggedInUser } = useContext(AppDataContext);
  const editRapor = route.params?.rapor || null;

  const [form, setForm] = useState(emptyForm());
  const [recordId, setRecordId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState('edit');
  const [isExistingRecord, setIsExistingRecord] = useState(false);
  const [errors, setErrors] = useState({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [serverErrMsg, setServerErrMsg] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingDate, setPendingDate] = useState(null);
  // Child lists
  const [uretimVerilen, setUretimVerilen] = useState([]);
  const [uretilen, setUretilen] = useState([]);
  // Active tab
  const [activeTab, setActiveTab] = useState('hammaddeEnerji');

  // ── Auto-fill from ERP APIs (matches web GunlukRaporlar.jsx exactly) ──
  const autoFillFromAPI = useCallback(async (dateStr, existingForm) => {
    if (!dateStr) return;
    setAutoFillLoading(true);
    try {
      // ── Pipeline 1: Child lists (UretimeVerilen + Uretilen) ──
      const [cikisRaw, uretilenRaw] = await Promise.all([
        getUretimeVerilenCikis({ tarih: dateStr, factoryCode: 2 }).catch(() => []),
        getGunlukUretilenUrunler({ tarih: dateStr, factoryCode: 2 }).catch(() => []),
      ]);
      const cikisRows = asList(cikisRaw);
      const uretilenApiRows = asList(uretilenRaw);
      const uretimVerilenMapped = mapUretimeVerilenFromCikis(cikisRows);
      const uretilenMapped = mapUretilenFromRows(uretilenApiRows);

      // ── Pipeline 2: Domates tüketim from VardiyaRaporOzet ──
      let domatesTuketim = 0;
      try {
        const rawOzet = await getStokHareketVardiyaOzet({ factoryNo: 2, tarih: dateStr });
        const ozetRows = Array.isArray(rawOzet) ? rawOzet : (rawOzet ? [rawOzet] : []);
        domatesTuketim = ozetRows.reduce((acc, r) => {
          const v = toNum(firstOf(r, ['tuketilenDomatesHammadde', 'domatesTuketim', 'TUKETILEN_DOMATES_HAMMADDE'])) || 0;
          return acc + v;
        }, 0);
      } catch (_) {}

      // ── Pipeline 3: Fire kayıtları ──
      let fireResult = { fireToplam: 0, ambalajToplam: 0 };
      try {
        let fireRows = await getFireKayitlariFormsApi({ factoryNo: 2 }).catch(() => []);
        if (asList(fireRows).length === 0) {
          fireRows = await getFireKayitlariFormsApi().catch(() => []);
        }
        fireResult = fireTotalsForDate(fireRows, dateStr);
      } catch (_) {}

      // ── Pipeline 4: Vardiya toplam (VardiyaRapor + Paketleme + Hammadde) ──
      let paketToplam = {
        kutu112830IcPiyasaAdet: 0, kutu112830TuzluIhrAdet: 0,
        kutu512830IcPiyasaAdet: 0, kutu512830TuzluIhrAdet: 0,
        kutu1012830Adet: 0,
        pet21Oncu32brxAdet: 0, pet1128bxAdet: 0,
        aspFici3234BrxKg: 0, aspFici2022BrxKg: 0,
        aspFici2830BrxKg: 0, aspFici2830BrxAdet: 0,
        aseptikDomateslMetalFiciKg: 0, aseptikDomateslMetalFiciAdet: 0,
        aseptikDomateslPlastikFiciKg: 0,
        aseptik3234DomateslSalcasiKg: 0, aseptik2022DomateslSalcasiKg: 0,
        aseptik2426BiberSalcasiKg: 0, aseptik2426BiberSalcasiPlastikKg: 0,
      };
      let sonBrixVals = [], sonRenkVals = [], uretimBrixVals = [];
      let biberHm = 0, biberKuspe = 0, fireToplamHm = 0;

      try {
        const raporRaw = await getVardiyaRaporListV1({ tarih: dateStr });
        const vardiyaRows = asList(raporRaw).filter(r => String(r?.tarih || '').substring(0, 10) === dateStr);

        if (vardiyaRows.length > 0) {
          // Extract brix/renk averages from vardiya rows
          vardiyaRows.forEach((r) => {
            const sb = toNum(r?.sonBrix);
            const sr = toNum(r?.sonRenk);
            const ub = toNum(r?.uretimBrix);
            if (sb !== null) sonBrixVals.push(sb);
            if (sr !== null) sonRenkVals.push(sr);
            if (ub !== null) uretimBrixVals.push(ub);
          });

          // VardiyaPaketleme for each vardiya row
          const paketResponses = await Promise.all(
            vardiyaRows.map(r => getVardiyaPaketlemeList({ raporId: r.id }).catch(() => []))
          );
          const paketRows = paketResponses.flatMap(x => asList(x));

          paketRows.forEach((p) => {
            const m = detectPaketFieldByCode(getPaketCode(p))
              || detectPaketFieldByName(p)
              || detectPaketField(p?.calisillanUrunAdi, p?.urunTipi);
            if (!m || !Object.prototype.hasOwnProperty.call(paketToplam, m.key)) return;
            const adet = toNum(p?.miktarAdet ?? p?.adet ?? p?.kutuAdet ?? p?.miktaradet) || 0;
            const kg = toNum(p?.toplamKg ?? p?.kg ?? p?.miktarKg ?? p?.miktar ?? p?.quantity) || 0;
            if (m.kind === 'adet') paketToplam[m.key] += adet;
            else paketToplam[m.key] += kg;
          });

          // VardiyaHammadde for each vardiya row → biber, biberKüspe
          const hammaddeResponses = await Promise.all(
            vardiyaRows.map(async (r) => {
              const tarih = String(r?.tarih || '').substring(0, 10) || dateStr;
              const hat = r?.calismaHat || undefined;
              const vardiya = String(r?.vardiya || '').trim().toUpperCase() || vardiyaFromBaslangic(r?.calismaSaatiBas);
              const firstTry = await getVardiyaHammaddeListV1({ tarih, vardiya: vardiya || undefined, hat, calismaHat: hat }).catch(() => []);
              const firstRows = asList(firstTry);
              if (firstRows.length > 0 || vardiya) return firstRows;
              const fallback = [];
              for (const v of ['A', 'B', 'C']) {
                const res = await getVardiyaHammaddeListV1({ tarih, vardiya: v, hat, calismaHat: hat }).catch(() => []);
                const list = asList(res);
                if (list.length > 0) { fallback.push(...list); break; }
              }
              return fallback;
            })
          );
          const hammaddeRows = hammaddeResponses.flat();

          hammaddeRows.forEach((h) => {
            const adi = h?.adi || h?.hammaddeAdi || h?.stokAdi || '';
            const miktar = toNum(h?.miktar) || 0;
            const fire = toNum(h?.fireAdedi) || 0;
            const n = norm(adi);
            if (n.includes('kuspe') && n.includes('biber')) biberKuspe += miktar;
            else if (n.includes('biber')) biberHm += miktar;
            fireToplamHm += fire;
          });
        }
      } catch (_) {}

      // ── Üretilen final toplam: API'den gelen > paket'den gelen ──
      const uretilenFinalToplam = {
        aseptik3234DomateslSalcasiKg: paketToplam.aseptik3234DomateslSalcasiKg,
        aseptik2022DomateslSalcasiKg: paketToplam.aseptik2022DomateslSalcasiKg,
        aseptik2426BiberSalcasiKg: paketToplam.aseptik2426BiberSalcasiKg,
        aseptik2426BiberSalcasiPlastikKg: paketToplam.aseptik2426BiberSalcasiPlastikKg,
        aseptikDomateslMetalFiciKg: paketToplam.aseptikDomateslMetalFiciKg,
        aseptikDomateslMetalFiciAdet: paketToplam.aseptikDomateslMetalFiciAdet,
        aseptikDomateslPlastikFiciKg: paketToplam.aseptikDomateslPlastikFiciKg,
      };
      if (uretilenMapped.length > 0) {
        Object.keys(uretilenFinalToplam).forEach(k => { uretilenFinalToplam[k] = 0; });
        uretilenMapped.forEach(x => {
          const key = x?.urunAdi;
          const n = toNum(x?.deger) || 0;
          if (Object.prototype.hasOwnProperty.call(uretilenFinalToplam, key)) {
            uretilenFinalToplam[key] += n;
          }
        });
      }

      // ── Combine fire: prefer fire page over hammadde ──
      const fireToplam = fireResult.fireToplam > 0 ? fireResult.fireToplam : fireToplamHm;
      const ambalajFiresi = fireResult.ambalajToplam || 0;

      // ── Build final form ──
      const kutuOrtBrix = avg(sonBrixVals);
      const kutuOrtRenk = avg(sonRenkVals);
      const hammaddeOrtBrix = avg(uretimBrixVals);

      const updatedForm = { ...existingForm };
      updatedForm.domateslKg = toNumField(domatesTuketim);
      updatedForm.biberKg = toNumField(biberHm > 0 ? biberHm : 0);
      updatedForm.biberKuspeKg = toNumField(biberKuspe);
      updatedForm.fireMiktariAdetGun = toIntField(fireToplam);
      updatedForm.ambalajFiresiAdet = toIntField(ambalajFiresi);
      updatedForm.kutuOrtRenk = toNumField(kutuOrtRenk);
      updatedForm.kutuOrtBrix = toNumField(kutuOrtBrix);
      updatedForm.hammaddeOrtBrix = toNumField(hammaddeOrtBrix);
      // Kutu/PET scalars from paketleme
      updatedForm.kutu112830IcPiyasaAdet = toIntField(paketToplam.kutu112830IcPiyasaAdet);
      updatedForm.kutu112830TuzluIhrAdet = toIntField(paketToplam.kutu112830TuzluIhrAdet);
      updatedForm.kutu512830IcPiyasaAdet = toIntField(paketToplam.kutu512830IcPiyasaAdet);
      updatedForm.kutu512830TuzluIhrAdet = toIntField(paketToplam.kutu512830TuzluIhrAdet);
      updatedForm.kutu1012830Adet = toIntField(paketToplam.kutu1012830Adet);
      updatedForm.pet21Oncu32brxAdet = toIntField(paketToplam.pet21Oncu32brxAdet);
      updatedForm.pet1128bxAdet = toIntField(paketToplam.pet1128bxAdet);
      // ASP scalars from paketleme
      updatedForm.aspFici3234BrxKg = toNumField(paketToplam.aspFici3234BrxKg);
      updatedForm.aspFici2022BrxKg = toNumField(paketToplam.aspFici2022BrxKg);
      updatedForm.aspFici2830BrxKg = toNumField(paketToplam.aspFici2830BrxKg);
      updatedForm.aspFici2830BrxAdet = toIntField(paketToplam.aspFici2830BrxAdet);
      // Aseptik scalars from üretilen final
      updatedForm.aseptikDomateslMetalFiciKg = toNumField(uretilenFinalToplam.aseptikDomateslMetalFiciKg);
      updatedForm.aseptikDomateslMetalFiciAdet = toIntField(uretilenFinalToplam.aseptikDomateslMetalFiciAdet);
      updatedForm.aseptikDomateslPlastikFiciKg = toNumField(uretilenFinalToplam.aseptikDomateslPlastikFiciKg);
      updatedForm.aseptik3234DomateslSalcasiKg = toNumField(uretilenFinalToplam.aseptik3234DomateslSalcasiKg);
      updatedForm.aseptik2022DomateslSalcasiKg = toNumField(uretilenFinalToplam.aseptik2022DomateslSalcasiKg);
      updatedForm.aseptik2426BiberSalcasiKg = toNumField(uretilenFinalToplam.aseptik2426BiberSalcasiKg);
      updatedForm.aseptik2426BiberSalcasiPlastikKg = toNumField(uretilenFinalToplam.aseptik2426BiberSalcasiPlastikKg);

      // Hazırlayan from logged in user
      if (!updatedForm.hazirlayan && loggedInUser?.firstName) {
        updatedForm.hazirlayan = loggedInUser.firstName + (loggedInUser.lastName ? ' ' + loggedInUser.lastName : '');
      }

      setForm(updatedForm);
      setUretimVerilen(uretimVerilenMapped);
      setUretilen(uretilenMapped);
    } catch (_) {}
    finally { setAutoFillLoading(false); }
  }, [loggedInUser]);

  const loadReport = useCallback((dateStr) => {
    setIsLoading(true);
    setIsExistingRecord(false);
    setRecordId(null);
    setMode('edit');
    setErrors({});
    setHasSubmitted(false);
    setServerErrMsg('');
    setUretimVerilen([]);
    setUretilen([]);
    getGunlukRaporByTarih(dateStr)
      .then(data => {
        const normalized = normalizeForm(data);
        setForm(normalized);
        setRecordId(data.id);
        setIsExistingRecord(true);
        setUretimVerilen(Array.isArray(data.uretimVerilen) ? data.uretimVerilen : []);
        setUretilen(Array.isArray(data.uretilen) ? data.uretilen : []);
        autoFillFromAPI(dateStr, normalized);
      })
      .catch(() => {
        const freshForm = { ...emptyForm(), raporTarihi: dateStr };
        setForm(freshForm);
        setIsExistingRecord(false);
        autoFillFromAPI(dateStr, freshForm);
      })
      .finally(() => setIsLoading(false));
  }, [autoFillFromAPI]);

  useEffect(() => {
    if (editRapor) {
      const normalized = normalizeForm(editRapor);
      setForm(normalized);
      setRecordId(editRapor.id);
      setIsExistingRecord(true);
      setUretimVerilen(Array.isArray(editRapor.uretimVerilen) ? editRapor.uretimVerilen : []);
      setUretilen(Array.isArray(editRapor.uretilen) ? editRapor.uretilen : []);
      autoFillFromAPI(normalized.raporTarihi, normalized);
    } else {
      loadReport(today());
    }
  }, []);
  useEffect(() => { if (hasSubmitted) setErrors(validate(form)); }, [form, hasSubmitted]);

  const updateField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const doSave = async () => {
    const payload = buildPayload(form, { uretimVerilen, uretilen });
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
          } else { throw postErr; }
        } else { throw postErr; }
      }
    }
  };

  const handleSave = async () => {
    if (isSaving || isLoading || autoFillLoading || mode !== 'edit') return;
    setHasSubmitted(true);
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setIsSaving(true);
    setServerErrMsg('');
    try { await doSave(); setMode('saved'); }
    catch (e) { setMode('server-error'); setServerErrMsg(e.message); }
    finally { setIsSaving(false); }
  };

  const handleRetry = async () => {
    setIsSaving(true);
    setServerErrMsg('');
    try { await doSave(); setMode('saved'); }
    catch (e) { setServerErrMsg(e.message); }
    finally { setIsSaving(false); }
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
            setUretimVerilen([]);
            setUretilen([]);
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
  const handleReset = () => {
    setForm({ ...emptyForm(), raporTarihi: form.raporTarihi });
    setIsExistingRecord(false);
    setRecordId(null);
    setHasSubmitted(false);
    setErrors({});
    setServerErrMsg('');
    setMode('edit');
    setUretimVerilen([]);
    setUretilen([]);
  };
  const handleDatePickerChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'set' && date) {
        setPendingDate(null);
        loadReport(toLocalDateStr(date));
      }
      return;
    }
    if (date) setPendingDate(date);
  };

  const handleDateConfirm = () => {
    if (pendingDate) {
      loadReport(toLocalDateStr(pendingDate));
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
              label={mode === 'saved' ? 'Kaydedildi' : autoFillLoading ? 'Yükleniyor...' : 'Düzenleniyor'}
              color={mode === 'saved' ? Colors.success : Colors.brandPrimary}
              bgColor={mode === 'saved' ? Colors.successLight : Colors.brandPrimaryLight}
              size="sm"
              icon={mode === 'saved' ? <CheckIcon size={10} color={Colors.success} /> : null}
            />
          </View>
        </View>

        {/* Banners */}
        {autoFillLoading && <Banner type="info" message="ERP'den veriler otomatik dolduruluyor..." />}
        {!isLoading && isExistingRecord && mode === 'edit' && !hasSubmitted && !autoFillLoading && (
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
              {/* ── Tab Bar ──────────────────────────────── */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBarScroll} contentContainerStyle={styles.tabBarContent}>
                {TAB_KEYS.map(key => {
                  const isActive = activeTab === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.tabItem, isActive && styles.tabItemActive]}
                      onPress={() => setActiveTab(key)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{TAB_LABELS[key]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* ── Tab Content ───────────────────────────── */}

              {/* Child list tabs */}
              {activeTab === 'tuketilenHYM' && (
                <ChildListSection title="Tüketilen Hammadde-Yarı Mamul" items={uretimVerilen} color={Colors.orange} isReadOnly={true} onChange={setUretimVerilen} />
              )}

              {activeTab === 'uretilen' && (
                <ChildListSection title="Üretilen Ürünler" items={uretilen} color={Colors.success} isReadOnly={true} onChange={setUretilen} />
              )}

              {/* Scalar field tabs */}
              {activeTab !== 'tuketilenHYM' && activeTab !== 'uretilen' && (tabSections[activeTab] || []).map(section => (
                <SectionCard key={section.title} title={section.title}>
                  {section.rows.map(row => (
                    <FormField key={row.key} row={row} value={form[row.key] ?? ''} error={errors[row.key]} isReadOnly={isReadOnly} onChangeText={v => updateField(row.key, v)} />
                  ))}
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
                      style={[styles.saveBtnLg, (isSaving || isReadOnly || autoFillLoading) && { opacity: 0.5 }]}
                      onPress={handleSave}
                      disabled={isSaving || isReadOnly || autoFillLoading}
                      activeOpacity={0.8}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : autoFillLoading ? (
                        <Text style={styles.saveBtnLgText}>Veriler Yükleniyor...</Text>
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

  // Tab Bar
  tabBarScroll: {
    marginBottom: Spacing.md,
    flexGrow: 0,
  },
  tabBarContent: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 2,
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.round,
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  tabItemActive: {
    backgroundColor: Colors.brandPrimary,
    borderColor: Colors.brandPrimary,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabLabelActive: {
    color: '#fff',
  },
});