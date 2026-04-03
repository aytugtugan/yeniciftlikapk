import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Spacing, Radius, Shadows } from '../theme';
import SimpleIcon from '../components/SimpleIcon';
import { deleteGunlukRapor } from '../api/formsApi';

const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const formatTR = (dateStr) => {
  if (!dateStr) return '';
  const d = dateStr.split('T')[0];
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${TR_MONTHS[parseInt(m) - 1]} ${y}`;
};
const fmt = (v, unit) => {
  if (v === null || v === undefined || v === '' || v === 0 || v === '0') return null;
  const num = Number(v);
  if (isNaN(num) || num === 0) return null;
  return unit ? `${num.toLocaleString('tr-TR')} ${unit}` : num.toLocaleString('tr-TR');
};

const sections = [
  {
    title: 'Kullanılan Hammadde',
    color: '#E53E3E',
    bgColor: '#FFF5F5',
    rows: [
      { label: 'Domates', key: 'domateslKg', unit: 'kg' },
      { label: 'Biber', key: 'biberKg', unit: 'kg' },
    ],
  },
  {
    title: 'Tüketilen Enerji',
    color: '#D69E2E',
    bgColor: '#FFFFF0',
    rows: [
      { label: 'LNG Gelen', key: 'lngGelenKg', unit: 'kg' },
      { label: 'LNG Tüketim', key: 'lngTuketimKg', unit: 'kg' },
      { label: 'LNG Stok', key: 'lngStokKg', unit: 'kg' },
      { label: 'Elektrik', key: 'elektrikTuketimKw', unit: 'kWh' },
      { label: 'Su', key: 'suTuketimM3', unit: 'm³' },
    ],
  },
  {
    title: 'Kutu Üretim (Adet)',
    color: Colors.brandPrimary,
    bgColor: '#EBF5FF',
    rows: [
      { label: '1/1 28-30 ÖNCÜ İç Piyasa', key: 'kutu112830IcPiyasaAdet', unit: 'adet' },
      { label: '1/1 28-30 ÖNCÜ Tuzlu İhr.', key: 'kutu112830TuzluIhrAdet', unit: 'adet' },
      { label: '5/1 28-30 ÖNCÜ İç Piyasa', key: 'kutu512830IcPiyasaAdet', unit: 'adet' },
      { label: '5/1 28-30 ÖNCÜ Tuzlu İhr.', key: 'kutu512830TuzluIhrAdet', unit: 'adet' },
      { label: '10/1 28-30 ÖNCÜ', key: 'kutu1012830Adet', unit: 'adet' },
    ],
  },
  {
    title: 'Asp. Yarımamül Fıçı',
    color: '#718096',
    bgColor: '#F7FAFC',
    rows: [
      { label: 'Asp 32-34 brx', key: 'aspFici3234BrxKg', unit: 'kg' },
      { label: 'Asp 20-22 brx', key: 'aspFici2022BrxKg', unit: 'kg' },
      { label: 'Asp 28-30 brx KG', key: 'aspFici2830BrxKg', unit: 'kg' },
      { label: 'Asp 28-30 brx Fıçı', key: 'aspFici2830BrxAdet', unit: 'adet' },
    ],
  },
  {
    title: 'PET Üretim (Adet)',
    color: '#38A169',
    bgColor: '#F0FFF4',
    rows: [
      { label: '2/1 Öncü 32 brx', key: 'pet21Oncu32brxAdet', unit: 'adet' },
      { label: '1/1 28 Bx', key: 'pet1128bxAdet', unit: 'adet' },
    ],
  },
  {
    title: 'Aseptik Üretim',
    color: '#805AD5',
    bgColor: '#FAF5FF',
    rows: [
      { label: 'Asp 28-30 Metal Fıçı KG', key: 'aseptikDomateslMetalFiciKg', unit: 'kg' },
      { label: 'Asp 28-30 Metal Fıçı Adet', key: 'aseptikDomateslMetalFiciAdet', unit: 'adet' },
      { label: 'Asp 28-30 Plastik Fıçı', key: 'aseptikDomateslPlastikFiciKg', unit: 'kg' },
      { label: 'Asp 32-34 Domates Salçası', key: 'aseptik3234DomateslSalcasiKg', unit: 'kg' },
      { label: 'Asp 20-22 Domates Salçası', key: 'aseptik2022DomateslSalcasiKg', unit: 'kg' },
      { label: 'Asp 24-26 Biber Salçası', key: 'aseptik2426BiberSalcasiKg', unit: 'kg' },
      { label: 'Asp 24-26 Biber Salçası (Plastik)', key: 'aseptik2426BiberSalcasiPlastikKg', unit: 'kg' },
      { label: 'Domates Küspe', key: 'domateslKuspeKg', unit: 'kg' },
      { label: 'Biber Küspe', key: 'biberKuspeKg', unit: 'kg' },
      { label: 'Fire Miktarı', key: 'fireMiktariAdetGun', unit: 'adet/gün' },
      { label: 'Ambalaj Firesi', key: 'ambalajFiresiAdet', unit: 'adet' },
    ],
  },
  {
    title: 'Kalite Parametreleri',
    color: '#DD6B20',
    bgColor: '#FFFAF0',
    rows: [
      { label: 'Ortalama Renk', key: 'kutuOrtRenk', unit: '' },
      { label: 'Ortalama Kutu Brix', key: 'kutuOrtBrix', unit: '°Bx' },
      { label: 'Hammadde Ort. Brix', key: 'hammaddeOrtBrix', unit: '°Bx' },
    ],
  },
  {
    title: 'Onay Bilgileri',
    color: '#4A5568',
    bgColor: '#F7FAFC',
    rows: [
      { label: 'Hazırlayan', key: 'hazirlayan', unit: '' },
      { label: 'Kontrol Eden', key: 'kontrolEden', unit: '' },
      { label: 'Onaylayan', key: 'onaylayan', unit: '' },
    ],
  },
];

// ── Section Card ─────────────────────────────────────────────
function DetailSection({ title, color, bgColor, rows, data }) {
  const filledRows = rows.filter(r => {
    const v = data[r.key];
    if (v === null || v === undefined || v === '' || v === 0 || v === '0') return false;
    if (typeof v === 'string' && v.trim() === '') return false;
    const num = Number(v);
    return isNaN(num) || num !== 0 || typeof v === 'string';
  });
  if (filledRows.length === 0) return null;

  return (
    <View style={s.section}>
      <View style={[s.sectionHeader, { backgroundColor: bgColor }]}>  
        <View style={[s.sectionDot, { backgroundColor: color }]} />
        <Text style={[s.sectionTitle, { color }]}>{title}</Text>
        <Text style={s.sectionCount}>{filledRows.length}/{rows.length}</Text>
      </View>
      <View style={s.sectionBody}>
        {filledRows.map((row, i) => {
          const val = data[row.key];
          const display = row.unit
            ? fmt(val, row.unit) || String(val)
            : (val != null && val !== '' ? String(val) : '—');
          return (
            <View key={row.key} style={[s.fieldRow, i < filledRows.length - 1 && s.fieldRowBorder]}>
              <Text style={s.fieldLabel}>{row.label}</Text>
              <Text style={s.fieldValue}>{display}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────
export default function GunlukRaporDetayScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const rapor = route.params?.rapor;

  if (!rapor) {
    return (
      <View style={s.container}>
        <Text style={{ textAlign: 'center', marginTop: 60, color: Colors.textSecondary }}>Kayıt bulunamadı</Text>
      </View>
    );
  }

  const ham = (Number(rapor.domateslKg) || 0) + (Number(rapor.biberKg) || 0);
  const kutu = (Number(rapor.kutu112830IcPiyasaAdet) || 0) + (Number(rapor.kutu112830TuzluIhrAdet) || 0)
    + (Number(rapor.kutu512830IcPiyasaAdet) || 0) + (Number(rapor.kutu512830TuzluIhrAdet) || 0)
    + (Number(rapor.kutu1012830Adet) || 0);

  const handleEdit = () => {
    navigation.navigate('GunlukRaporForm', { rapor });
  };

  const handleDelete = () => {
    Alert.alert('Raporu Sil', `${formatTR(rapor.raporTarihi)} tarihli raporu silmek istediğinize emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive', onPress: async () => {
          try {
            await deleteGunlukRapor(rapor.id);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Hata', e.message);
          }
        },
      },
    ]);
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <SimpleIcon name="chevron-left" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerTextWrap}>
          <Text style={s.headerTitle}>Rapor #{rapor.id}</Text>
          <Text style={s.headerSubtitle}>{formatTR(rapor.raporTarihi)}</Text>
        </View>
        <TouchableOpacity style={s.editHeaderBtn} onPress={handleEdit} activeOpacity={0.7}>
          <Text style={s.editHeaderBtnText}>Düzenle</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View style={s.summaryRow}>
          <View style={[s.summaryCard, { borderLeftColor: '#E53E3E' }]}>
            <Text style={s.summaryLabel}>Hammadde</Text>
            <Text style={s.summaryValue}>{ham ? `${ham.toLocaleString('tr-TR')} kg` : '—'}</Text>
          </View>
          <View style={[s.summaryCard, { borderLeftColor: Colors.brandPrimary }]}>
            <Text style={s.summaryLabel}>Kutu</Text>
            <Text style={s.summaryValue}>{kutu ? kutu.toLocaleString('tr-TR') : '—'}</Text>
          </View>
          <View style={[s.summaryCard, { borderLeftColor: '#D69E2E' }]}>
            <Text style={s.summaryLabel}>Elektrik</Text>
            <Text style={s.summaryValue}>{rapor.elektrikTuketimKw ? `${Number(rapor.elektrikTuketimKw).toLocaleString('tr-TR')} kWh` : '—'}</Text>
          </View>
          <View style={[s.summaryCard, { borderLeftColor: '#805AD5' }]}>
            <Text style={s.summaryLabel}>Kutu Brix</Text>
            <Text style={s.summaryValue}>{rapor.kutuOrtBrix ? `${rapor.kutuOrtBrix} °Bx` : '—'}</Text>
          </View>
        </View>

        {/* Sections */}
        {sections.map(sec => (
          <DetailSection
            key={sec.title}
            title={sec.title}
            color={sec.color}
            bgColor={sec.bgColor}
            rows={sec.rows}
            data={rapor}
          />
        ))}

        {/* Delete button at bottom */}
        <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} activeOpacity={0.7}>
          <Text style={s.deleteBtnText}>Raporu Sil</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgApp },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingTop: (StatusBar.currentHeight || 50) + Spacing.sm,
    backgroundColor: Colors.bgWhite,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.bgSurface, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm,
  },
  backBtnText: { fontSize: 22, fontWeight: '600', color: Colors.textPrimary, marginTop: -2 },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  headerSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  editHeaderBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.sm,
    backgroundColor: Colors.brandPrimary,
  },
  editHeaderBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  content: { padding: Spacing.lg },

  // Summary cards
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
    ...Shadows.sm,
  },
  summaryLabel: { fontSize: 11, fontWeight: '600', color: Colors.textTertiary, textTransform: 'uppercase' },
  summaryValue: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginTop: 4 },

  // Section
  section: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sectionDot: {
    width: 8, height: 8, borderRadius: 4, marginRight: Spacing.sm,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', flex: 1, textTransform: 'uppercase', letterSpacing: 0.3 },
  sectionCount: { fontSize: 11, fontWeight: '600', color: Colors.textTertiary },
  sectionBody: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },

  // Field
  fieldRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10,
  },
  fieldRowBorder: {
    borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  fieldLabel: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  fieldValue: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },

  // Delete
  deleteBtn: {
    marginTop: Spacing.md,
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
  },
  deleteBtnText: { fontSize: 15, fontWeight: '700', color: Colors.danger },
});
