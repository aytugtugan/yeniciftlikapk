import React, { useState, useCallback, useRef, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Radius, Shadows } from '../theme';
import {
  getVardiyaRaporList, createVardiyaRapor, updateVardiyaRapor, deleteVardiyaRapor,
  getVardiyaHatDurumList, createVardiyaHatDurum, updateVardiyaHatDurum, deleteVardiyaHatDurum,
  getVardiyaPaketlemeList, createVardiyaPaketleme, updateVardiyaPaketleme, deleteVardiyaPaketleme,
  getVardiyaHammaddeList, createVardiyaHammadde, updateVardiyaHammadde, deleteVardiyaHammadde,
  getMamulKpcList, getUretimKontrolList,
  FORM_DEFINITIONS,
} from '../api/formsApi';
import { getUretimEmirleri, getGunlukUretimler, getTuketimler, getUretimOzeti, getTuketimOzeti } from '../api/apiService';
import { getKaliteProsesKontrol } from '../api/oncuApi';
import { AppDataContext } from '../context/AppDataContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from '../components/SimpleIcon';
import { VARDIYA_OPTIONS, VARDIYA_DEFS, getVardiyaTimes, getCurrentVardiya } from '../utils/vardiya';

const INDIGO = '#6366F1';
const today = () => new Date().toISOString().split('T')[0];
const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const formatTR = (d) => {
  if (!d) return '';
  const s = d.split('T')[0];
  const [y, m, dd] = s.split('-');
  return `${dd}.${m}.${y}`;
};

// Safe numeric pick: returns first valid number from the list of values
const numOr = (...vals) => { for (const v of vals) { if (v != null && v !== '') { const n = Number(v); if (!isNaN(n)) return n; } } return 0; };

// Build datetime range for a given tarih + vardiya times
const buildVardiyaDT = (tarih, vardiyaTimes) => {
  if (!vardiyaTimes) {
    return { startDT: new Date(`${tarih}T00:00:00`).toISOString(), endDT: new Date(`${tarih}T23:59:59`).toISOString(), startTime: null, endTime: null };
  }
  const bas = vardiyaTimes.baslangic; // "08:00", "16:00", "00:00"
  const bit = vardiyaTimes.bitis;     // "16:00", "00:00", "08:00"
  let endDateStr = tarih;
  let endTimeStr = bit;
  if (bit <= bas) {
    // crosses midnight (e.g. B: 16:00→00:00) → end date = next day
    const nd = new Date(tarih);
    nd.setDate(nd.getDate() + 1);
    endDateStr = nd.toISOString().split('T')[0];
  }
  const startDT = new Date(`${tarih}T${bas}:00`).toISOString();
  const endDT = new Date(`${endDateStr}T${endTimeStr}:00`).toISOString();
  return { startDT, endDT, startTime: bas, endTime: bit === '00:00' ? '23:59' : bit };
};

// Form defs from FORM_DEFINITIONS
const RAPOR_DEF = FORM_DEFINITIONS.find(f => f.key === 'vardiyaRapor');
const HAT_DEF = FORM_DEFINITIONS.find(f => f.key === 'vardiyaHatDurum');
const PAKET_DEF = FORM_DEFINITIONS.find(f => f.key === 'vardiyaPaketleme');
const HAMMADDE_DEF = FORM_DEFINITIONS.find(f => f.key === 'vardiyaHammadde');

// Sub-section config
const SUB_SECTIONS = [
  {
    key: 'hatDurum',
    title: 'Çalışılan Hatlar',
    color: '#0891B2',
    bgColor: '#ECFEFF',
    fields: HAT_DEF.fields.filter(f => f.key !== 'raporId'),
    listFn: getVardiyaHatDurumList,
    createFn: createVardiyaHatDurum,
    updateFn: updateVardiyaHatDurum,
    deleteFn: deleteVardiyaHatDurum,
  },
  {
    key: 'paketleme',
    title: 'Günlük Üretim',
    color: '#D97706',
    bgColor: '#FFFBEB',
    fields: PAKET_DEF.fields.filter(f => f.key !== 'raporId'),
    listFn: getVardiyaPaketlemeList,
    createFn: createVardiyaPaketleme,
    updateFn: updateVardiyaPaketleme,
    deleteFn: deleteVardiyaPaketleme,
  },
  {
    key: 'hammadde',
    title: 'Hammadde Detay',
    color: '#16A34A',
    bgColor: '#F0FDF4',
    fields: HAMMADDE_DEF.fields.filter(f => f.key !== 'raporId'),
    listFn: getVardiyaHammaddeList,
    createFn: createVardiyaHammadde,
    updateFn: updateVardiyaHammadde,
    deleteFn: deleteVardiyaHammadde,
  },
];

// ── Helpers ──────────────────────────────────────────────────
function buildPayload(fields, data) {
  const payload = {};
  fields.forEach(f => {
    const val = data[f.key];
    if (val === '' || val == null) { payload[f.key] = null; return; }
    if (f.type === 'number') {
      const n = parseFloat(String(val).replace(',', '.'));
      payload[f.key] = isNaN(n) ? null : n;
    } else if (f.type === 'integer') {
      const n = parseInt(String(val), 10);
      payload[f.key] = isNaN(n) ? null : n;
    } else if (f.type === 'date') {
      payload[f.key] = val;
    } else if (f.type === 'time') {
      payload[f.key] = val;
    } else { payload[f.key] = val; }
  });
  return payload;
}

function prefill(fields, item) {
  const d = {};
  fields.forEach(f => {
    const v = item[f.key];
    if (f.type === 'date' && v) { d[f.key] = v.split('T')[0]; }
    else { d[f.key] = v != null ? String(v) : ''; }
  });
  return d;
}

// ── RaporCard (expandable) ───────────────────────────────────
function RaporCard({ rapor, subData, onEdit, onDelete, onAddSub, onEditSub, onDeleteSub }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.raporCard}>
      <TouchableOpacity activeOpacity={0.7} onPress={() => setExpanded(!expanded)}>
        <View style={styles.raporHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.raporTitle}>
              {rapor.calismaHat || 'Hat ?'} — #{rapor.id}
              {rapor.vardiya ? ` (${rapor.vardiya})` : ''}
            </Text>
            <Text style={styles.raporDate}>
              {formatTR(rapor.tarih)}
              {rapor.calismaSaatiBas ? ` ${rapor.calismaSaatiBas}` : ''}
              {rapor.calismaSaatiBit ? ` - ${rapor.calismaSaatiBit}` : ''}
            </Text>
          </View>
          <View style={styles.raporActions}>
            <TouchableOpacity onPress={() => onEdit(rapor)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="edit" size={18} color={Colors.brandPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Alert.alert('Sil', 'Bu raporu ve tüm alt kayıtlarını silmek istediğinize emin misiniz?', [
                  { text: 'İptal', style: 'cancel' },
                  { text: 'Sil', style: 'destructive', onPress: () => onDelete(rapor) },
                ]);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="close" size={18} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          {rapor.girenHammaddeMiktari != null && (
            <View style={styles.statChip}><Text style={styles.statLabel}>Hammadde</Text><Text style={styles.statVal}>{rapor.girenHammaddeMiktari}</Text></View>
          )}
          {rapor.toplamUretimMiktari != null && (
            <View style={styles.statChip}><Text style={styles.statLabel}>Üretim</Text><Text style={styles.statVal}>{rapor.toplamUretimMiktari}</Text></View>
          )}
          {rapor.sonBrix != null && (
            <View style={styles.statChip}><Text style={styles.statLabel}>Brix</Text><Text style={styles.statVal}>{rapor.sonBrix}</Text></View>
          )}
          {rapor.kamyonSayisi != null && (
            <View style={styles.statChip}><Text style={styles.statLabel}>Kamyon</Text><Text style={styles.statVal}>{rapor.kamyonSayisi}</Text></View>
          )}
        </View>

        {!expanded && <View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4,marginTop:8}}><Text style={styles.expandHint}>Detayları görmek için dokunun</Text><Icon name="expand-more" size={14} color={Colors.textTertiary} /></View>}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandedContent}>
          {/* ── Genel Bilgiler ── */}
          <Text style={styles.sectionLabel}>Genel</Text>
          <View style={styles.detailGrid}>
            <View style={styles.detailCell}>
              <Text style={styles.detailLabel}>Çalışma Hat</Text>
              <Text style={styles.detailValue}>{rapor.calismaHat || '-'}</Text>
            </View>
            <View style={styles.detailCell}>
              <Text style={styles.detailLabel}>Parti No</Text>
              <Text style={styles.detailValue}>{rapor.calisillanPartiNo || '-'}</Text>
            </View>
          </View>
          {rapor.injectlemeKodu ? (
            <View style={styles.detailGrid}>
              <View style={styles.detailCell}>
                <Text style={styles.detailLabel}>Inject</Text>
                <Text style={[styles.detailValue, { fontSize: 11 }]}>{rapor.injectlemeKodu}</Text>
              </View>
            </View>
          ) : null}
          <View style={styles.detailGrid}>
            <View style={styles.detailCell}>
              <Text style={styles.detailLabel}>Tarih</Text>
              <Text style={styles.detailValue}>{formatTR(rapor.tarih) || '-'}</Text>
            </View>
            <View style={styles.detailCell}>
              <Text style={styles.detailLabel}>Başlangıç</Text>
              <Text style={styles.detailValue}>{rapor.calismaSaatiBas || '-'}</Text>
            </View>
            <View style={styles.detailCell}>
              <Text style={styles.detailLabel}>Bitiş</Text>
              <Text style={styles.detailValue}>{rapor.calismaSaatiBit || '-'}</Text>
            </View>
          </View>
          <View style={styles.detailGrid}>
            <View style={styles.detailCell}>
              <Text style={styles.detailLabel}>Toplam Üretim</Text>
              <Text style={[styles.detailValue, { color: '#059669', fontWeight: '800' }]}>{rapor.toplamUretimMiktari ?? '-'}</Text>
            </View>
          </View>

          <View style={styles.detailDivider} />

          {/* ── Üretim ── */}
          <Text style={styles.sectionLabel}>Üretim</Text>
          <View style={styles.detailGrid}>
            <View style={styles.detailCell}>
              <Text style={styles.detailLabel}>Giren Hammadde</Text>
              <Text style={styles.detailValue}>{rapor.girenHammaddeMiktari ?? '-'}</Text>
            </View>
            <View style={styles.detailCell}>
              <Text style={styles.detailLabel}>Kamyon Sayısı</Text>
              <Text style={styles.detailValue}>{rapor.kamyonSayisi ?? '-'}</Text>
            </View>
            <View style={styles.detailCell}>
              <Text style={styles.detailLabel}>Toplam Üretim</Text>
              <Text style={styles.detailValue}>{rapor.toplamUretimMiktari ?? '-'}</Text>
            </View>
          </View>
          {rapor.arizaBildirimi ? (
            <View style={styles.detailGrid}>
              <View style={styles.detailCell}>
                <Text style={styles.detailLabel}>Arıza Bildirimi</Text>
                <Text style={styles.detailValue}>{rapor.arizaBildirimi}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.detailDivider} />

          {/* ── Kalite Değerleri ── */}
          <Text style={styles.sectionLabel}>Kalite Değerleri</Text>
          <View style={styles.qualityTable}>
            <View style={styles.qualityCol}>
              <Text style={styles.qualityHeader}>Son</Text>
              <View style={styles.qualityItem}><Text style={styles.qualityItemLabel}>Brix</Text><Text style={styles.qualityItemVal}>{rapor.sonBrix ?? '-'}</Text></View>
              <View style={styles.qualityItem}><Text style={styles.qualityItemLabel}>Bostwick</Text><Text style={styles.qualityItemVal}>{rapor.sonBost ?? '-'}</Text></View>
              <View style={styles.qualityItem}><Text style={styles.qualityItemLabel}>Renk</Text><Text style={styles.qualityItemVal}>{rapor.sonRenk ?? '-'}</Text></View>
            </View>
            <View style={styles.qualityVDivider} />
            <View style={styles.qualityCol}>
              <Text style={styles.qualityHeader}>Üretim</Text>
              <View style={styles.qualityItem}><Text style={styles.qualityItemLabel}>Brix</Text><Text style={styles.qualityItemVal}>{rapor.uretimBrix ?? '-'}</Text></View>
              <View style={styles.qualityItem}><Text style={styles.qualityItemLabel}>Bostwick</Text><Text style={styles.qualityItemVal}>{rapor.uretimBost ?? '-'}</Text></View>
              <View style={styles.qualityItem}><Text style={styles.qualityItemLabel}>Renk</Text><Text style={styles.qualityItemVal}>{rapor.uretimRenk ?? '-'}</Text></View>
            </View>
          </View>

          {/* ── Notlar ── */}
          {rapor.notlar ? (
            <>
              <View style={styles.detailDivider} />
              <Text style={styles.sectionLabel}>Notlar</Text>
              <Text style={styles.notlarText}>{rapor.notlar}</Text>
            </>
          ) : null}

          <View style={styles.detailDivider} />

          {/* ── Sub-sections ── */}
          {SUB_SECTIONS.map(sec => {
            const items = subData[sec.key] || [];
            return (
              <View key={sec.key} style={styles.subSection}>
                <View style={styles.subSectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.subBadge, { backgroundColor: sec.bgColor }]}>
                      <Text style={[styles.subBadgeText, { color: sec.color }]}>{sec.title} ({items.length})</Text>
                    </View>
                    {sec.key === 'paketleme' && items.length > 0 && (
                      <Text style={{ fontSize: 12, fontWeight: '700', color: sec.color }}>
                        Toplam: {items.reduce((s, i) => s + (Number(i.toplamKg) || 0), 0).toFixed(1)} kg
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.subAddBtn, { borderColor: sec.color }]}
                    onPress={() => onAddSub(sec.key, rapor.id)}
                  >
                    <Text style={[styles.subAddBtnText, { color: sec.color }]}>+ Ekle</Text>
                  </TouchableOpacity>
                </View>
                {sec.key === 'paketleme' ? (
                  items.map(item => (
                    <View key={item.id} style={[styles.subItem, { borderLeftColor: sec.color }]}>
                      <View style={styles.subItemHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.textPrimary }}>
                            {item.calisillanUrunAdi || 'Ürün ?'}
                          </Text>
                          {item.urunTipi ? <Text style={{ fontSize: 11, color: Colors.textTertiary }}>{item.urunTipi}</Text> : null}
                          <View style={{ flexDirection: 'row', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
                              Miktar: <Text style={{ fontWeight: '600', color: Colors.textPrimary }}>{item.miktarAdet ?? '-'}</Text>
                            </Text>
                            <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
                              Gramaj: <Text style={{ fontWeight: '600', color: Colors.textPrimary }}>{item.gramaj ?? '-'} g</Text>
                            </Text>
                            <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
                              Toplam: <Text style={{ fontWeight: '700', color: sec.color }}>{item.toplamKg ?? '-'} kg</Text>
                            </Text>
                          </View>
                        </View>
                        <View style={styles.subItemActions}>
                          <TouchableOpacity onPress={() => onEditSub(sec.key, item)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                            <Icon name="edit" size={16} color={sec.color} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => Alert.alert('Sil', 'Bu kaydı silmek istediğinize emin misiniz?', [{ text: 'İptal', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress: () => onDeleteSub(sec.key, item) }])} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                            <Icon name="close" size={16} color={Colors.danger} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))
                ) : sec.key === 'hammadde' ? (
                  items.map(item => (
                    <View key={item.id} style={[styles.subItem, { borderLeftColor: sec.color }]}>
                      <View style={styles.subItemHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.textPrimary }}>
                            {item.adi || 'Hammadde ?'}
                          </Text>
                          {item.partiSiparisNo ? <Text style={{ fontSize: 11, color: Colors.textTertiary }}>Parti: {item.partiSiparisNo}</Text> : null}
                          <View style={{ flexDirection: 'row', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
                              Miktar: <Text style={{ fontWeight: '600', color: Colors.textPrimary }}>{item.miktar ?? '-'}</Text>
                            </Text>
                            <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
                              Fire: <Text style={{ fontWeight: '600', color: Colors.textPrimary }}>{item.fireAdedi ?? '-'}</Text>
                            </Text>
                          </View>
                          {item.fireAciklama ? <Text style={{ fontSize: 11, color: Colors.textTertiary, marginTop: 2 }}>{item.fireAciklama}</Text> : null}
                        </View>
                        <View style={styles.subItemActions}>
                          <TouchableOpacity onPress={() => onEditSub(sec.key, item)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                            <Icon name="edit" size={16} color={sec.color} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => Alert.alert('Sil', 'Bu kaydı silmek istediğinize emin misiniz?', [{ text: 'İptal', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress: () => onDeleteSub(sec.key, item) }])} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                            <Icon name="close" size={16} color={Colors.danger} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))
                ) : (
                  items.map(item => (
                    <View key={item.id} style={[styles.subItem, { borderLeftColor: sec.color }]}>
                      <View style={styles.subItemHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.textPrimary }}>
                            {item.hatAdi || '-'} — {item.hatDurumu || '-'}
                          </Text>
                        </View>
                        <View style={styles.subItemActions}>
                          <TouchableOpacity onPress={() => onEditSub(sec.key, item)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                            <Icon name="edit" size={16} color={sec.color} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => Alert.alert('Sil', 'Bu kaydı silmek istediğinize emin misiniz?', [{ text: 'İptal', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress: () => onDeleteSub(sec.key, item) }])} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                            <Icon name="close" size={16} color={Colors.danger} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))
                )}
                {items.length === 0 && (
                  <Text style={styles.noSubText}>Henüz {sec.title.toLowerCase()} kaydı yok</Text>
                )}
              </View>
            );
          })}
          <TouchableOpacity onPress={() => setExpanded(false)} activeOpacity={0.7}>
            <View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4}}><Text style={styles.expandHint}>Daralt</Text><Icon name="expand-less" size={14} color={Colors.textTertiary} /></View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────
export default function VardiyaRaporScreen() {
  const navigation = useNavigation();
  const { oncuToken } = useContext(AppDataContext);

  const [raporlar, setRaporlar] = useState([]);
  const [subDataMap, setSubDataMap] = useState({}); // { raporId: { hatDurum: [], paketleme: [], hammadde: [] } }
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Date filter
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [showDatePicker, setShowDatePicker] = useState(null); // 'start' | 'end' | null
  const [pendingDate, setPendingDate] = useState(new Date());

  // Form modal (wizard)
  const [modalVisible, setModalVisible] = useState(false);
  const [modalEditId, setModalEditId] = useState(null); // for editing existing rapor
  const [saving, setSaving] = useState(false);
  const [wizStep, setWizStep] = useState(0); // 0-4
  // Wizard data
  const [wizGenel, setWizGenel] = useState({});
  const [wizHatlar, setWizHatlar] = useState([{ hatAdi: '', hatDurumu: '' }]);
  const [wizPaketler, setWizPaketler] = useState([{ calisillanUrunAdi: '', urunTipi: '', miktarAdet: '', gramaj: '', toplamKg: '' }]);
  const [wizHammaddeler, setWizHammaddeler] = useState([{ adi: '', partiSiparisNo: '', miktar: '', fireAdedi: '', fireAciklama: '' }]);
  const [wizDegerler, setWizDegerler] = useState({});
  // Also keep old sub-modal for editing individual sub-items from cards
  const [subModalVisible, setSubModalVisible] = useState(false);
  const [subModalMode, setSubModalMode] = useState('hatDurum');
  const [subModalEditId, setSubModalEditId] = useState(null);
  const [subModalRaporId, setSubModalRaporId] = useState(null);
  const [subFormData, setSubFormData] = useState({});
  const [subSaving, setSubSaving] = useState(false);
  // Date picker for wizard
  const [wizDatePicker, setWizDatePicker] = useState(null); // field key or null
  const [wizPendingDate, setWizPendingDate] = useState(new Date());
  // Time picker for wizard
  const [wizTimePicker, setWizTimePicker] = useState(null); // field key or null
  const [wizPendingTime, setWizPendingTime] = useState(new Date());
  // Auto-fill state
  const [autoFilling, setAutoFilling] = useState(false);
  const [hatOptions, setHatOptions] = useState([]); // [{label, value, istasyonKodu}]
  const [partiOptions, setPartiOptions] = useState([]); // [{label, value, fisNo}]
  const [showHatPicker, setShowHatPicker] = useState(false);
  const [showPartiPicker, setShowPartiPicker] = useState(false);
  const [activeEmirler, setActiveEmirler] = useState([]); // cached for auto-fill
  const [selectedVardiya, setSelectedVardiya] = useState(null); // 'A' | 'B' | 'C'
  const [perHatData, setPerHatData] = useState([]);
  const [activeHatIdx, setActiveHatIdx] = useState(0);

  // ── Load data ──────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const params = startDate === endDate ? { tarih: startDate } : {};
      const list = await getVardiyaRaporList(params);
      let items = Array.isArray(list) ? list : [];
      if (startDate !== endDate) {
        items = items.filter(r => {
          const d = (r.tarih || '').split('T')[0];
          return d >= startDate && d <= endDate;
        });
      }
      items.sort((a, b) => (b.id || 0) - (a.id || 0));
      setRaporlar(items);

      // Use inline sub-items from rapor response; fallback to separate API calls if null
      const subMap = {};
      await Promise.all(items.map(async (r) => {
        const [hatDurum, paketleme, hammadde] = await Promise.all([
          Array.isArray(r.hatDurumlar) ? r.hatDurumlar : getVardiyaHatDurumList({ raporId: r.id }).catch(() => []),
          Array.isArray(r.paketlemeler) ? r.paketlemeler : getVardiyaPaketlemeList({ raporId: r.id }).catch(() => []),
          Array.isArray(r.hammaddeDetaylar) ? r.hammaddeDetaylar : getVardiyaHammaddeList({ raporId: r.id }).catch(() => []),
        ]);
        subMap[r.id] = {
          hatDurum: Array.isArray(hatDurum) ? hatDurum : [],
          paketleme: Array.isArray(paketleme) ? paketleme : [],
          hammadde: Array.isArray(hammadde) ? hammadde : [],
        };
      }));
      setSubDataMap(subMap);
    } catch (err) {
      setError(err.message);
    }
  }, [startDate, endDate]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }, [loadData]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData().finally(() => setRefreshing(false));
  }, [loadData]);

  // ── Wizard steps config ────────────────────────────────────
  const WIZ_STEPS = [
    { key: 'genel', label: 'Genel' },
    { key: 'hatDurum', label: 'Çalışılan Hatlar' },
    { key: 'paketleme', label: 'Günlük Üretim' },
    { key: 'hammadde', label: 'Hammadde' },
    { key: 'degerler', label: 'Değerler' },
  ];

  // ── Fetch active emirler for hat/parti pickers ─────────────
  const fetchEmirlerForPickers = useCallback(async () => {
    try {
      const emirler = await getUretimEmirleri({ factoryCode: 2 });
      const arr = Array.isArray(emirler) ? emirler : [];
      setActiveEmirler(arr);
      // Extract unique hat (istasyon) options
      const hatMap = {};
      arr.forEach(e => {
        if (e.istasyonKodu && !hatMap[e.istasyonKodu]) {
          hatMap[e.istasyonKodu] = { label: `${e.istasyonAdi || e.istasyonKodu}`, value: e.istasyonAdi || e.istasyonKodu, istasyonKodu: e.istasyonKodu };
        }
      });
      const opts = Object.values(hatMap);
      setHatOptions(opts);
      return { emirler: arr, hatOpts: opts };
    } catch (err) {
      console.warn('Emir fetch for pickers failed:', err.message);
      return { emirler: [], hatOpts: [] };
    }
  }, []);

  // Update parti options when hat changes
  const updatePartiOptions = useCallback((selectedHat) => {
    if (!selectedHat || activeEmirler.length === 0) {
      setPartiOptions([]);
      return;
    }
    const matching = activeEmirler.filter(e =>
      (e.istasyonAdi || '').toLowerCase().includes(selectedHat.toLowerCase()) ||
      (e.istasyonKodu || '').toLowerCase().includes(selectedHat.toLowerCase())
    );
    const partiMap = {};
    matching.forEach(e => {
      const parti = e.fisNo || e.partiNo;
      if (parti && !partiMap[parti]) {
        partiMap[parti] = { label: parti, value: parti, fisNo: e.fisNo, urunler: [] };
      }
      if (parti && e.urunAdi) {
        partiMap[parti].urunler.push({ urunAdi: e.urunAdi, urunKodu: e.urunKodu, planMiktar: e.planMiktar });
      }
    });
    const opts = Object.values(partiMap);
    setPartiOptions(opts);
  }, [activeEmirler]);

  // ── Auto-fill: fetch production data and populate all fields ──
  const handleAutoFill = useCallback(async (hatName) => {
    const hat = hatName || wizGenel.calismaHat;
    if (!hat) return;

    const tarih = wizGenel.tarih || today();
    const vTimes = getVardiyaTimes(selectedVardiya);
    const vdt = buildVardiyaDT(tarih, vTimes);

    setAutoFilling(true);
    try {
      // Find istasyonKodu from hat name
      const matchingEmir = activeEmirler.find(e =>
        (e.istasyonAdi || '').toLowerCase().includes(hat.toLowerCase()) ||
        (e.istasyonKodu || '').toLowerCase().includes(hat.toLowerCase())
      );
      const istasyonKodu = matchingEmir?.istasyonKodu || hat;

      // 1. Günlük üretimler — filtered by vardiya time range
      const gunlukParams = {
        fabrikaNo: 2,
        istasyonKodu: istasyonKodu,
        startDate: tarih,
        endDate: tarih,
        pageSize: 1000,
      };
      if (vdt.startTime) gunlukParams.startTime = vdt.startTime;
      if (vdt.endTime) gunlukParams.endTime = vdt.endTime;
      const gunlukRes = await getGunlukUretimler(gunlukParams).catch(() => []);
      const gunlukRows = Array.isArray(gunlukRes) ? gunlukRes : (gunlukRes?.items || gunlukRes?.data || []);

      // Group by product for totals
      const urunGrp = {};
      gunlukRows.forEach(r => {
        const key = r.urunKodu || r.stokKodu || r.urunAdi || 'bilinmeyen';
        if (!urunGrp[key]) {
          urunGrp[key] = { urunAdi: r.urunAdi || r.stokAdi || key, urunKodu: key, toplamMiktar: 0 };
        }
        urunGrp[key].toplamMiktar += numOr(r.miktar, r.miktari);
      });
      let uretimRows = Object.values(urunGrp);

      // Fallback to UretimOzeti if gunlukUretimler returned nothing
      if (uretimRows.length === 0) {
        const uretimOzet = await getUretimOzeti({
          factoryNo: 2,
          startDateTime: vdt.startDT,
          endDateTime: vdt.endDT,
          hatKodu: istasyonKodu,
        }).catch(() => []);
        const ozRows = Array.isArray(uretimOzet) ? uretimOzet : [];
        uretimRows = ozRows.map(r => ({
          urunAdi: r.urunAdi || r.urunKodu || '',
          urunKodu: r.urunKodu || '',
          toplamMiktar: numOr(r.toplamUretimMiktari),
        }));
      }

      // Total production
      let toplamUretim = uretimRows.reduce((s, r) => s + r.toplamMiktar, 0);

      // 2. Paketleme from production data (ürün adı + toplam kilo)
      const partiNo = wizGenel.calisillanPartiNo;
      const paketArr = uretimRows
        .filter(r => r.toplamMiktar > 0)
        .map(r => ({
          calisillanUrunAdi: r.urunAdi || r.urunKodu || '',
          urunTipi: '',
          miktarAdet: '',
          gramaj: '',
          toplamKg: r.toplamMiktar ? String(parseFloat(r.toplamMiktar.toFixed(2))) : '',
        }));

      // 3. TuketimOzeti — for girenHammaddeMiktari + hammaddeDetaylar
      const tuketimOzet = await getTuketimOzeti({
        factoryNo: 2,
        startDateTime: vdt.startDT,
        endDateTime: vdt.endDT,
        hatKodu: istasyonKodu,
      }).catch(() => []);
      const tuketimRows = Array.isArray(tuketimOzet) ? tuketimOzet : [];

      let girenHammadde = 0;
      tuketimRows.forEach(r => {
        girenHammadde += Number(r.toplamTuketimMiktari) || 0;
      });

      // Fallback: if TuketimOzeti is empty, try per-fis Tuketimler
      let hammaddeRows = tuketimRows;
      if (tuketimRows.length === 0) {
        const fisNolar = [...new Set(
          activeEmirler
            .filter(e =>
              ((e.istasyonAdi || '').toLowerCase().includes(hat.toLowerCase()) ||
               (e.istasyonKodu || '').toLowerCase().includes(hat.toLowerCase())) &&
              (!partiNo || e.fisNo === partiNo)
            )
            .map(e => e.fisNo)
            .filter(Boolean)
        )];
        let fallbackRows = [];
        for (const fisNo of fisNolar) {
          try {
            const tuk = await getTuketimler(2, fisNo);
            fallbackRows = fallbackRows.concat(Array.isArray(tuk) ? tuk : []);
          } catch (_) {}
        }
        if (fallbackRows.length > 0) {
          hammaddeRows = fallbackRows;
          fallbackRows.forEach(h => {
            girenHammadde += numOr(h.miktar, h.miktari, h.kg, h.qty, h.quantity, h.toplam);
          });
        }
      }

      // Resolve parti/sipariş no from emirler for this hat + KPC pno
      const hatEmirFisNo = activeEmirler
        .filter(e =>
          (e.istasyonAdi || '').toLowerCase().includes(hat.toLowerCase()) ||
          (e.istasyonKodu || '').toLowerCase().includes(hat.toLowerCase())
        )
        .map(e => e.fisNo)
        .filter(Boolean);
      const ficheno = partiNo || hatEmirFisNo[0] || '';

      let kpcPno = '';
      let kpcInject = '';
      if (ficheno && oncuToken) {
        try {
          const kpcData = await getKaliteProsesKontrol(oncuToken, ficheno);
          if (kpcData) {
            kpcPno = kpcData.pno || kpcData.Pno || '';
            kpcInject = kpcData.injectlemeKodu || kpcData.InjectlemeKodu || '';
          }
        } catch (_) {}
      }

      // Group hammadde
      const hamGrp = {};
      hammaddeRows.forEach(h => {
        const key = h.stokKodu || h.stokAdi || h.malzemeAdi || h.adi || 'Bilinmeyen';
        if (!hamGrp[key]) {
          hamGrp[key] = {
            adi: h.stokAdi || h.malzemeAdi || h.adi || key,
            miktar: 0,
            partiSiparisNo: h.uretimEmriNo || h.partiSiparisNo || h.fisNo || '',
          };
        }
        hamGrp[key].miktar += numOr(h.toplamTuketimMiktari, h.miktar, h.miktari);
      });
      const hamArr = Object.values(hamGrp).map(h => ({
        adi: h.adi,
        partiSiparisNo: '',
        miktar: h.miktar ? String(parseFloat(h.miktar.toFixed(2))) : '',
        fireAdedi: '',
        fireAciklama: '',
      }));

      // 4. Hat durumlar fallback from emirler
      const hatSet = {};
      uretimRows.forEach(r => {
        const hKey = r.hatKodu || istasyonKodu;
        if (!hatSet[hKey]) {
          hatSet[hKey] = { hatAdi: r.hatAdi || r.hatKodu || hat, hatDurumu: 'Çalışıyor' };
        }
      });
      if (Object.keys(hatSet).length === 0) {
        hatSet[istasyonKodu] = { hatAdi: matchingEmir?.istasyonAdi || hat, hatDurumu: 'Çalışıyor' };
      }
      const hatArr = Object.values(hatSet);

      // 5. Kalite değerleri — MamulKpcKontrol → Son Brix/Bostwick/Renk
      const vardiyaForQuery = selectedVardiya || '';
      const kpcParams = { tarih };
      if (vardiyaForQuery) kpcParams.vardiya = vardiyaForQuery;
      const mamulKpcRows = await getMamulKpcList(kpcParams).catch(() => []);
      const kpcArr = Array.isArray(mamulKpcRows) ? mamulKpcRows : [];
      // Take last (most recent) entry
      const lastKpc = kpcArr.length > 0 ? kpcArr[kpcArr.length - 1] : null;

      // 6. Kalite değerleri — UretimKontrolNumune → Üretim Brix/Bostwick/Renk
      const uknParams = { tarih };
      if (vardiyaForQuery) uknParams.vardiya = vardiyaForQuery;
      const uretimKontrolRows = await getUretimKontrolList(uknParams).catch(() => []);
      const uknArr = Array.isArray(uretimKontrolRows) ? uretimKontrolRows : [];
      const lastUkn = uknArr.length > 0 ? uknArr[uknArr.length - 1] : null;

      // ── Apply to wizard state ──
      setWizGenel(p => ({
        ...p,
        calisillanPartiNo: kpcPno || p.calisillanPartiNo,
        injectlemeKodu: kpcInject || p.injectlemeKodu,
        toplamUretimMiktari: toplamUretim ? String(parseFloat(toplamUretim.toFixed(2))) : p.toplamUretimMiktari,
        girenHammaddeMiktari: girenHammadde ? String(parseFloat(girenHammadde.toFixed(2))) : p.girenHammaddeMiktari,
      }));

      // Apply quality values
      setWizDegerler(p => ({
        ...p,
        sonBrix: lastKpc?.brix != null ? String(lastKpc.brix) : p.sonBrix,
        sonBost: lastKpc?.bostwick != null ? String(lastKpc.bostwick) : p.sonBost,
        sonRenk: lastKpc?.colorAb != null ? String(lastKpc.colorAb) : (lastKpc?.renkL != null ? String(lastKpc.renkL) : p.sonRenk),
        uretimBrix: lastUkn?.brixMinLab != null ? String(lastUkn.brixMinLab) : (lastUkn?.brixMinEvap != null ? String(lastUkn.brixMinEvap) : (lastUkn?.siraBrix != null ? String(lastUkn.siraBrix) : p.uretimBrix)),
        uretimBost: lastUkn?.bost != null ? String(lastUkn.bost) : p.uretimBost,
        uretimRenk: lastUkn?.renkAb != null ? String(lastUkn.renkAb) : (lastUkn?.renkL != null ? String(lastUkn.renkL) : p.uretimRenk),
      }));

      if (paketArr.length > 0) setWizPaketler(paketArr);
      if (hamArr.length > 0) setWizHammaddeler(hamArr);
      if (hatArr.length > 0) setWizHatlar(hatArr);
    } catch (err) {
      console.warn('AutoFill error:', err);
    } finally {
      setAutoFilling(false);
    }
  }, [wizGenel, activeEmirler, selectedVardiya, oncuToken]);

  // ── Auto-fill ALL active hats (sum across all lines) ──
  const handleAutoFillAll = useCallback(async (tarih, emirlerData, hatOptsData, vardiya) => {
    if (!hatOptsData || hatOptsData.length === 0) return;
    setAutoFilling(true);
    const vTimes = getVardiyaTimes(vardiya);
    const vdt = buildVardiyaDT(tarih, vTimes);
    try {
      let totalUretim = 0;
      let totalHammadde = 0;
      const allPaketGrp = {};
      const allHamGrp = {};
      const allHatlar = [];

      for (const hatOpt of hatOptsData) {
        const hat = hatOpt.value;
        const istasyonKodu = hatOpt.istasyonKodu || hat;
        allHatlar.push({ hatAdi: hatOpt.label || hat, hatDurumu: 'Çalışıyor' });

        // 1. Günlük üretimler
        const gunlukParams = { fabrikaNo: 2, istasyonKodu, startDate: tarih, endDate: tarih, pageSize: 1000 };
        if (vdt.startTime) gunlukParams.startTime = vdt.startTime;
        if (vdt.endTime) gunlukParams.endTime = vdt.endTime;
        const gunlukRes = await getGunlukUretimler(gunlukParams).catch(() => []);
        const gunlukRows = Array.isArray(gunlukRes) ? gunlukRes : (gunlukRes?.items || gunlukRes?.data || []);
        const urunGrp = {};
        gunlukRows.forEach(r => {
          const key = r.urunKodu || r.stokKodu || r.urunAdi || 'bilinmeyen';
          if (!urunGrp[key]) urunGrp[key] = { urunAdi: r.urunAdi || r.stokAdi || key, urunKodu: key, toplamMiktar: 0 };
          urunGrp[key].toplamMiktar += numOr(r.miktar, r.miktari);
        });
        let uretimRows = Object.values(urunGrp);

        if (uretimRows.length === 0) {
          const uretimOzet = await getUretimOzeti({ factoryNo: 2, startDateTime: vdt.startDT, endDateTime: vdt.endDT, hatKodu: istasyonKodu }).catch(() => []);
          const ozRows = Array.isArray(uretimOzet) ? uretimOzet : [];
          uretimRows = ozRows.map(r => ({ urunAdi: r.urunAdi || r.urunKodu || '', urunKodu: r.urunKodu || '', toplamMiktar: numOr(r.toplamUretimMiktari) }));
        }

        totalUretim += uretimRows.reduce((s, r) => s + r.toplamMiktar, 0);
        uretimRows.filter(r => r.toplamMiktar > 0).forEach(r => {
          const key = r.urunAdi || r.urunKodu || 'bilinmeyen';
          if (!allPaketGrp[key]) allPaketGrp[key] = { calisillanUrunAdi: key, urunTipi: '', miktarAdet: '', gramaj: '', toplamKg: 0 };
          allPaketGrp[key].toplamKg += r.toplamMiktar;
        });

        // 2. TuketimOzeti
        const tuketimOzet = await getTuketimOzeti({ factoryNo: 2, startDateTime: vdt.startDT, endDateTime: vdt.endDT, hatKodu: istasyonKodu }).catch(() => []);
        const tuketimRows = Array.isArray(tuketimOzet) ? tuketimOzet : [];
        tuketimRows.forEach(r => { totalHammadde += numOr(r.toplamTuketimMiktari); });

        let hammaddeRows = tuketimRows;
        if (tuketimRows.length === 0) {
          const fisNolar = [...new Set(emirlerData
            .filter(e => (e.istasyonAdi || '').toLowerCase().includes(hat.toLowerCase()) || (e.istasyonKodu || '').toLowerCase().includes(hat.toLowerCase()))
            .map(e => e.fisNo).filter(Boolean))];
          let fallbackRows = [];
          for (const fisNo of fisNolar) { try { const tuk = await getTuketimler(2, fisNo); fallbackRows = fallbackRows.concat(Array.isArray(tuk) ? tuk : []); } catch (_) {} }
          if (fallbackRows.length > 0) {
            hammaddeRows = fallbackRows;
            fallbackRows.forEach(h => { totalHammadde += numOr(h.miktar, h.miktari, h.kg, h.qty, h.quantity, h.toplam); });
          }
        }

        hammaddeRows.forEach(h => {
          const key = h.stokKodu || h.stokAdi || h.malzemeAdi || h.adi || 'Bilinmeyen';
          if (!allHamGrp[key]) allHamGrp[key] = { adi: h.stokAdi || h.malzemeAdi || h.adi || key, miktar: 0 };
          allHamGrp[key].miktar += numOr(h.toplamTuketimMiktari, h.miktar, h.miktari);
        });
      }

      // 3. Kalite değerleri (hat-bağımsız)
      const mamulKpcRows = await getMamulKpcList({ tarih }).catch(() => []);
      const kpcArr = Array.isArray(mamulKpcRows) ? mamulKpcRows : [];
      const lastKpc = kpcArr.length > 0 ? kpcArr[kpcArr.length - 1] : null;
      const uretimKontrolRows = await getUretimKontrolList({ tarih }).catch(() => []);
      const uknArr = Array.isArray(uretimKontrolRows) ? uretimKontrolRows : [];
      const lastUkn = uknArr.length > 0 ? uknArr[uknArr.length - 1] : null;

      setWizGenel(p => ({
        ...p,
        calismaHat: 'Tüm Hatlar',
        toplamUretimMiktari: totalUretim ? String(parseFloat(totalUretim.toFixed(2))) : p.toplamUretimMiktari,
        girenHammaddeMiktari: totalHammadde ? String(parseFloat(totalHammadde.toFixed(2))) : p.girenHammaddeMiktari,
      }));
      setWizDegerler(p => ({
        ...p,
        sonBrix: lastKpc?.brix != null ? String(lastKpc.brix) : p.sonBrix,
        sonBost: lastKpc?.bostwick != null ? String(lastKpc.bostwick) : p.sonBost,
        sonRenk: lastKpc?.colorAb != null ? String(lastKpc.colorAb) : (lastKpc?.renkL != null ? String(lastKpc.renkL) : p.sonRenk),
        uretimBrix: lastUkn?.brixMinLab != null ? String(lastUkn.brixMinLab) : (lastUkn?.brixMinEvap != null ? String(lastUkn.brixMinEvap) : (lastUkn?.siraBrix != null ? String(lastUkn.siraBrix) : p.uretimBrix)),
        uretimBost: lastUkn?.bost != null ? String(lastUkn.bost) : p.uretimBost,
        uretimRenk: lastUkn?.renkAb != null ? String(lastUkn.renkAb) : (lastUkn?.renkL != null ? String(lastUkn.renkL) : p.uretimRenk),
      }));

      const paketArr = Object.values(allPaketGrp).map(p => ({ ...p, toplamKg: p.toplamKg ? String(parseFloat(p.toplamKg.toFixed(2))) : '' }));
      if (paketArr.length > 0) setWizPaketler(paketArr);
      const hamArr = Object.values(allHamGrp).map(h => ({ adi: h.adi, partiSiparisNo: '', miktar: h.miktar ? String(parseFloat(h.miktar.toFixed(2))) : '', fireAdedi: '', fireAciklama: '' }));
      if (hamArr.length > 0) setWizHammaddeler(hamArr);
      if (allHatlar.length > 0) setWizHatlar(allHatlar);
    } catch (err) {
      console.warn('AutoFillAll error:', err);
    } finally {
      setAutoFilling(false);
    }
  }, []);

  // ── Auto-fill per hat (populates perHatData + loads first hat into wiz*) ──
  const autoFillPerHat = useCallback(async (tarih, emirlerData, hatOptsData, vardiya) => {
    if (!hatOptsData || hatOptsData.length === 0) return;
    setAutoFilling(true);
    try {
      const times = getVardiyaTimes(vardiya);
      const vdt = buildVardiyaDT(tarih, times);

      // ── Fetch ALL data once (no istasyonKodu filter) ──
      const gunlukParams = { fabrikaNo: 2, startDate: tarih, endDate: tarih, pageSize: 5000 };
      if (vdt.startTime) gunlukParams.startTime = vdt.startTime;
      if (vdt.endTime) gunlukParams.endTime = vdt.endTime;
      const gunlukRes = await getGunlukUretimler(gunlukParams).catch(() => []);
      const allGunluk = Array.isArray(gunlukRes) ? gunlukRes : (Array.isArray(gunlukRes?.items) ? gunlukRes.items : (Array.isArray(gunlukRes?.data) ? gunlukRes.data : []));
      console.warn('[autoFillPerHat] gunluk rows:', allGunluk.length, allGunluk.length > 0 ? JSON.stringify(Object.keys(allGunluk[0])) : 'empty');

      const uretimOzetRes = await getUretimOzeti({ factoryNo: 2, startDateTime: vdt.startDT, endDateTime: vdt.endDT }).catch(() => []);
      const allUretimOzet = Array.isArray(uretimOzetRes) ? uretimOzetRes : [];
      console.warn('[autoFillPerHat] uretimOzet rows:', allUretimOzet.length);

      const tuketimOzetRes = await getTuketimOzeti({ factoryNo: 2, startDateTime: vdt.startDT, endDateTime: vdt.endDT }).catch(() => []);
      const allTuketimOzet = Array.isArray(tuketimOzetRes) ? tuketimOzetRes : [];
      console.warn('[autoFillPerHat] tuketimOzet rows:', allTuketimOzet.length);

      // Kalite (hat-bağımsız, tek sefer)
      const kpcRows = await getMamulKpcList({ tarih }).catch(() => []);
      const lastKpc = Array.isArray(kpcRows) && kpcRows.length > 0 ? kpcRows[kpcRows.length - 1] : null;
      const uknRows = await getUretimKontrolList({ tarih }).catch(() => []);
      const lastUkn = Array.isArray(uknRows) && uknRows.length > 0 ? uknRows[uknRows.length - 1] : null;

      // ── Helper: match station ──
      const matchesHat = (row, istasyonKodu, hatLabel) => {
        const rowHat = (row.istasyonKodu || row.hatKodu || row.istasyonAdi || '').toLowerCase();
        const rowHat2 = (row.stationCode || row.hatAdi || '').toLowerCase();
        const code = istasyonKodu.toLowerCase();
        const label = (hatLabel || '').toLowerCase();
        return rowHat === code || rowHat2 === code || rowHat.includes(code) || rowHat2.includes(code) ||
               (label && (rowHat.includes(label) || rowHat2.includes(label)));
      };

      const results = [];

      for (const hatOpt of hatOptsData) {
        const hat = hatOpt.value;
        const istasyonKodu = hatOpt.istasyonKodu || hat;

        // ── Filter production data for this hat ──
        const hatGunluk = allGunluk.filter(r => matchesHat(r, istasyonKodu, hat));
        const urunGrp = {};
        hatGunluk.forEach(r => {
          const key = r.urunKodu || r.stokKodu || r.urunAdi || 'bilinmeyen';
          if (!urunGrp[key]) urunGrp[key] = { urunAdi: r.urunAdi || r.stokAdi || key, urunKodu: key, toplamMiktar: 0 };
          urunGrp[key].toplamMiktar += numOr(r.miktar, r.miktari);
        });
        let uretimRows = Object.values(urunGrp);

        // Fallback: UretimOzeti filtered by hat
        if (uretimRows.length === 0) {
          const hatOzet = allUretimOzet.filter(r => matchesHat(r, istasyonKodu, hat));
          uretimRows = hatOzet.map(r => ({
            urunAdi: r.urunAdi || r.urunKodu || '', urunKodu: r.urunKodu || '',
            toplamMiktar: numOr(r.toplamUretimMiktari, r.toplamMiktar),
          }));
        }

        // Fallback 2: if only 1 hat option and all data returned without hat info
        if (uretimRows.length === 0 && hatOptsData.length === 1) {
          allGunluk.forEach(r => {
            const key = r.urunKodu || r.stokKodu || r.urunAdi || 'bilinmeyen';
            if (!urunGrp[key]) urunGrp[key] = { urunAdi: r.urunAdi || r.stokAdi || key, urunKodu: key, toplamMiktar: 0 };
            urunGrp[key].toplamMiktar += numOr(r.miktar, r.miktari);
          });
          uretimRows = Object.values(urunGrp);
          if (uretimRows.length === 0) {
            uretimRows = allUretimOzet.map(r => ({
              urunAdi: r.urunAdi || r.urunKodu || '', urunKodu: r.urunKodu || '',
              toplamMiktar: numOr(r.toplamUretimMiktari, r.toplamMiktar),
            }));
          }
        }

        console.warn(`[autoFillPerHat] hat=${hat} istasyon=${istasyonKodu} gunlukFiltered=${hatGunluk.length} uretimRows=${uretimRows.length}`);

        const toplamUretim = uretimRows.reduce((s, r) => s + r.toplamMiktar, 0);
        const paketArr = uretimRows.filter(r => r.toplamMiktar > 0).map(r => ({
          calisillanUrunAdi: r.urunAdi || r.urunKodu || '', urunTipi: '', miktarAdet: '', gramaj: '',
          toplamKg: r.toplamMiktar ? String(parseFloat(r.toplamMiktar.toFixed(2))) : '',
        }));

        // ── Filter tuketim data for this hat ──
        const hatTuketim = allTuketimOzet.filter(r => matchesHat(r, istasyonKodu, hat));
        let girenHammadde = 0;
        hatTuketim.forEach(r => { girenHammadde += numOr(r.toplamTuketimMiktari); });

        let hammaddeRows = hatTuketim;
        if (hatTuketim.length === 0 && hatOptsData.length === 1) {
          hammaddeRows = allTuketimOzet;
          allTuketimOzet.forEach(r => { girenHammadde += numOr(r.toplamTuketimMiktari); });
        }

        // Fallback: Tuketimler per fiş
        if (hammaddeRows.length === 0) {
          const fisNolar = [...new Set(emirlerData
            .filter(e => (e.istasyonAdi || '').toLowerCase().includes(hat.toLowerCase()) || (e.istasyonKodu || '').toLowerCase().includes(hat.toLowerCase()))
            .map(e => e.fisNo).filter(Boolean))];
          let fallbackRows = [];
          for (const fisNo of fisNolar) { try { const tuk = await getTuketimler(2, fisNo); fallbackRows = fallbackRows.concat(Array.isArray(tuk) ? tuk : []); } catch (_) {} }
          if (fallbackRows.length > 0) {
            hammaddeRows = fallbackRows;
            fallbackRows.forEach(h => { girenHammadde += numOr(h.miktar, h.miktari); });
          }
        }

        const hamGrp = {};
        hammaddeRows.forEach(h => {
          const key = h.stokKodu || h.stokAdi || h.malzemeAdi || h.adi || 'Bilinmeyen';
          if (!hamGrp[key]) hamGrp[key] = { adi: h.stokAdi || h.malzemeAdi || h.adi || key, miktar: 0 };
          hamGrp[key].miktar += numOr(h.toplamTuketimMiktari, h.miktar, h.miktari);
        });
        const hamArr = Object.values(hamGrp).map(h => ({
          adi: h.adi, partiSiparisNo: '', miktar: h.miktar ? String(parseFloat(h.miktar.toFixed(2))) : '', fireAdedi: '', fireAciklama: '',
        }));

        // Parti no + inject from KaliteProsesKontrol
        const hatEmirFisNo = emirlerData
          .filter(e => (e.istasyonAdi || '').toLowerCase().includes(hat.toLowerCase()) || (e.istasyonKodu || '').toLowerCase().includes(hat.toLowerCase()))
          .map(e => e.fisNo).filter(Boolean);

        let kpcPno = '';
        let kpcInject = '';
        if (hatEmirFisNo.length > 0 && oncuToken) {
          try {
            const kpcData = await getKaliteProsesKontrol(oncuToken, hatEmirFisNo[0]);
            if (kpcData) {
              kpcPno = kpcData.pno || kpcData.Pno || '';
              kpcInject = kpcData.injectlemeKodu || kpcData.InjectlemeKodu || '';
            }
          } catch (_) {}
        }

        results.push({
          hatKey: istasyonKodu,
          hatLabel: hatOpt.label || hat,
          istasyonKodu,
          genel: {
            calismaHat: hatOpt.label || hat, tarih,
            calismaSaatiBas: times?.baslangic || '', calismaSaatiBit: times?.bitis || '',
            calisillanPartiNo: kpcPno || hatEmirFisNo[0] || '',
            injectlemeKodu: kpcInject,
            girenHammaddeMiktari: girenHammadde ? String(parseFloat(girenHammadde.toFixed(2))) : '',
            kamyonSayisi: '', toplamUretimMiktari: toplamUretim ? String(parseFloat(toplamUretim.toFixed(2))) : '',
            arizaBildirimi: '',
          },
          hatlar: [{ hatAdi: hatOpt.label || hat, hatDurumu: 'Çalışıyor' }],
          paketler: paketArr.length > 0 ? paketArr : [{ calisillanUrunAdi: '', urunTipi: '', miktarAdet: '', gramaj: '', toplamKg: '' }],
          hammaddeler: hamArr.length > 0 ? hamArr : [{ adi: '', partiSiparisNo: '', miktar: '', fireAdedi: '', fireAciklama: '' }],
          degerler: {
            sonBrix: lastKpc?.brix != null ? String(lastKpc.brix) : '',
            sonBost: lastKpc?.bostwick != null ? String(lastKpc.bostwick) : '',
            sonRenk: lastKpc?.colorAb != null ? String(lastKpc.colorAb) : '',
            uretimBrix: lastUkn?.brixMinLab != null ? String(lastUkn.brixMinLab) : (lastUkn?.siraBrix != null ? String(lastUkn.siraBrix) : ''),
            uretimBost: lastUkn?.bost != null ? String(lastUkn.bost) : '',
            uretimRenk: lastUkn?.renkAb != null ? String(lastUkn.renkAb) : '',
            notlar: '',
          },
        });
      }

      console.warn('[autoFillPerHat] total hats:', results.length, results.map(r => `${r.hatLabel}: uretim=${r.genel.toplamUretimMiktari}, paket=${r.paketler.length}`));

      setPerHatData(results);
      if (results.length > 0) {
        const first = results[0];
        setWizGenel(first.genel);
        setWizHatlar(first.hatlar.map(x => ({ ...x })));
        setWizPaketler(first.paketler.map(x => ({ ...x })));
        setWizHammaddeler(first.hammaddeler.map(x => ({ ...x })));
        setWizDegerler({ ...first.degerler });
      }
      setActiveHatIdx(0);
    } catch (err) {
      console.warn('autoFillPerHat error:', err);
    } finally {
      setAutoFilling(false);
    }
  }, [oncuToken]);

  const GENEL_FIELDS = RAPOR_DEF.fields.filter(f =>
    ['calismaHat', 'tarih', 'calismaSaatiBas', 'calismaSaatiBit',
     'calisillanPartiNo', 'girenHammaddeMiktari', 'kamyonSayisi',
     'toplamUretimMiktari', 'arizaBildirimi'].includes(f.key)
  );
  const DEGER_FIELDS = RAPOR_DEF.fields.filter(f =>
    ['sonBrix', 'sonBost', 'sonRenk', 'uretimBrix', 'uretimBost', 'uretimRenk', 'notlar'].includes(f.key)
  );

  // ── CRUD handlers ──────────────────────────────────────────
  const handleVardiyaChange = (v) => {
    setSelectedVardiya(v);
    const times = getVardiyaTimes(v);
    if (times) {
      setWizGenel(p => ({
        ...p,
        calismaSaatiBas: times.baslangic,
        calismaSaatiBit: times.bitis,
      }));
    }
  };

  const switchHatTab = (newIdx) => {
    if (newIdx === activeHatIdx) return;
    setPerHatData(prev => prev.map((h, i) => i === activeHatIdx ? {
      ...h,
      genel: { ...wizGenel },
      hatlar: wizHatlar.map(x => ({ ...x })),
      paketler: wizPaketler.map(x => ({ ...x })),
      hammaddeler: wizHammaddeler.map(x => ({ ...x })),
      degerler: { ...wizDegerler },
    } : h));
    const newHat = perHatData[newIdx];
    if (newHat) {
      setWizGenel({ ...newHat.genel });
      setWizHatlar(newHat.hatlar.map(x => ({ ...x })));
      setWizPaketler(newHat.paketler.map(x => ({ ...x })));
      setWizHammaddeler(newHat.hammaddeler.map(x => ({ ...x })));
      setWizDegerler({ ...newHat.degerler });
    }
    setActiveHatIdx(newIdx);
  };

  const openNewRapor = async () => {
    setModalEditId(null);
    setWizStep(0);
    const currentV = getCurrentVardiya();
    const times = getVardiyaTimes(currentV);
    const g = {};
    GENEL_FIELDS.forEach(f => {
      if (f.type === 'date') g[f.key] = today();
      else if (f.key === 'calismaSaatiBas') g[f.key] = times?.baslangic || nowTime();
      else if (f.key === 'calismaSaatiBit') g[f.key] = times?.bitis || nowTime();
      else if (f.type === 'time') g[f.key] = nowTime();
      else g[f.key] = '';
    });
    g.calismaHat = '';
    setSelectedVardiya(currentV);
    setWizGenel(g);
    setWizHatlar([{ hatAdi: '', hatDurumu: '' }]);
    setWizPaketler([{ calisillanUrunAdi: '', urunTipi: '', miktarAdet: '', gramaj: '', toplamKg: '' }]);
    setWizHammaddeler([{ adi: '', partiSiparisNo: '', miktar: '', fireAdedi: '', fireAciklama: '' }]);
    const d = {};
    DEGER_FIELDS.forEach(f => { d[f.key] = ''; });
    setWizDegerler(d);
    setPerHatData([]);
    setActiveHatIdx(0);
    setModalVisible(true);
    const { emirler, hatOpts } = await fetchEmirlerForPickers();
    autoFillPerHat(g.tarih || today(), emirler, hatOpts, currentV);
  };

  const openEditRapor = (rapor) => {
    setModalEditId(rapor.id);
    setWizStep(0);
    const g = {};
    GENEL_FIELDS.forEach(f => {
      const v = rapor[f.key];
      if (f.type === 'date' && v) g[f.key] = v.split('T')[0];
      else g[f.key] = v != null ? String(v) : '';
    });
    // Detect vardiya from saved times
    const bas = g.calismaSaatiBas || '';
    let detectedV = null;
    Object.entries(VARDIYA_DEFS).forEach(([k, def]) => {
      if (bas === def.baslangic) detectedV = k;
    });
    setSelectedVardiya(detectedV);
    setWizGenel(g);
    // Populate sub-items from subDataMap
    const subs = subDataMap[rapor.id] || {};
    const hatItems = (subs.hatDurum || []).map(h => ({ id: h.id, hatAdi: h.hatAdi || '', hatDurumu: h.hatDurumu || '' }));
    setWizHatlar(hatItems.length ? hatItems : [{ hatAdi: '', hatDurumu: '' }]);
    const pakItems = (subs.paketleme || []).map(p => ({ id: p.id, calisillanUrunAdi: p.calisillanUrunAdi || '', urunTipi: p.urunTipi || '', miktarAdet: p.miktarAdet != null ? String(p.miktarAdet) : '', gramaj: p.gramaj != null ? String(p.gramaj) : '', toplamKg: p.toplamKg != null ? String(p.toplamKg) : '' }));
    setWizPaketler(pakItems.length ? pakItems : [{ calisillanUrunAdi: '', urunTipi: '', miktarAdet: '', gramaj: '', toplamKg: '' }]);
    const hamItems = (subs.hammadde || []).map(h => ({ id: h.id, adi: h.adi || '', partiSiparisNo: h.partiSiparisNo || '', miktar: h.miktar != null ? String(h.miktar) : '', fireAdedi: h.fireAdedi != null ? String(h.fireAdedi) : '', fireAciklama: h.fireAciklama || '' }));
    setWizHammaddeler(hamItems.length ? hamItems : [{ adi: '', partiSiparisNo: '', miktar: '', fireAdedi: '', fireAciklama: '' }]);
    const dd = {};
    DEGER_FIELDS.forEach(f => {
      const v = rapor[f.key];
      dd[f.key] = v != null ? String(v) : '';
    });
    setWizDegerler(dd);
    const editHatlar = hatItems.length ? hatItems : [{ hatAdi: '', hatDurumu: '' }];
    const editPaketler = pakItems.length ? pakItems : [{ calisillanUrunAdi: '', urunTipi: '', miktarAdet: '', gramaj: '', toplamKg: '' }];
    const editHammaddeler = hamItems.length ? hamItems : [{ adi: '', partiSiparisNo: '', miktar: '', fireAdedi: '', fireAciklama: '' }];
    setPerHatData([{
      hatKey: g.calismaHat || 'bilinmeyen',
      hatLabel: g.calismaHat || 'Düzenlenen Rapor',
      istasyonKodu: g.calismaHat || '',
      genel: { ...g },
      hatlar: editHatlar,
      paketler: editPaketler,
      hammaddeler: editHammaddeler,
      degerler: { ...dd },
    }]);
    setActiveHatIdx(0);
    setModalVisible(true);
    fetchEmirlerForPickers();
  };

  // Sub-item modal (from expanded cards)
  const openAddSub = (secKey, raporId) => {
    setSubModalMode(secKey);
    setSubModalEditId(null);
    setSubModalRaporId(raporId);
    const sec = SUB_SECTIONS.find(s => s.key === secKey);
    const d = {};
    sec.fields.forEach(f => { d[f.key] = ''; });
    setSubFormData(d);
    setSubModalVisible(true);
  };

  const openEditSub = (secKey, item) => {
    setSubModalMode(secKey);
    setSubModalEditId(item.id);
    setSubModalRaporId(item.raporId);
    const sec = SUB_SECTIONS.find(s => s.key === secKey);
    setSubFormData(prefill(sec.fields, item));
    setSubModalVisible(true);
  };

  const handleSubSave = async () => {
    setSubSaving(true);
    try {
      const sec = SUB_SECTIONS.find(s => s.key === subModalMode);
      const payload = buildPayload(sec.fields, subFormData);
      payload.raporId = subModalRaporId;
      if (subModalEditId) await sec.updateFn(subModalEditId, payload);
      else await sec.createFn(payload);
      setSubModalVisible(false);
      await loadData();
    } catch (err) {
      Alert.alert('Hata', err.message);
    } finally { setSubSaving(false); }
  };

  // Wizard save (final step)
  const handleWizardSave = async () => {
    setSaving(true);
    try {
      // Build rapor payload from genel + degerler
      const raporPayload = {};
      // Add vardiya from selector
      raporPayload.vardiya = selectedVardiya || null;
      GENEL_FIELDS.forEach(f => {
        const val = wizGenel[f.key];
        if (val === '' || val == null) { raporPayload[f.key] = null; return; }
        if (f.type === 'number') { const n = parseFloat(String(val).replace(',', '.')); raporPayload[f.key] = isNaN(n) ? null : n; }
        else if (f.type === 'integer') { const n = parseInt(val, 10); raporPayload[f.key] = isNaN(n) ? null : n; }
        else raporPayload[f.key] = val;
      });
      DEGER_FIELDS.forEach(f => {
        const val = wizDegerler[f.key];
        if (val === '' || val == null) { raporPayload[f.key] = null; return; }
        if (f.type === 'number') { const n = parseFloat(String(val).replace(',', '.')); raporPayload[f.key] = isNaN(n) ? null : n; }
        else raporPayload[f.key] = val;
      });

      let raporId;
      if (modalEditId) {
        await updateVardiyaRapor(modalEditId, raporPayload);
        raporId = modalEditId;
        // Delete old sub-items then re-create
        const oldSubs = subDataMap[raporId] || {};
        for (const h of (oldSubs.hatDurum || [])) await deleteVardiyaHatDurum(h.id).catch(() => {});
        for (const p of (oldSubs.paketleme || [])) await deleteVardiyaPaketleme(p.id).catch(() => {});
        for (const m of (oldSubs.hammadde || [])) await deleteVardiyaHammadde(m.id).catch(() => {});
      } else {
        const created = await createVardiyaRapor(raporPayload);
        raporId = created.id;
      }

      // Save hat durumlar
      for (const h of wizHatlar) {
        if (!h.hatAdi && !h.hatDurumu) continue;
        await createVardiyaHatDurum({ raporId, hatAdi: h.hatAdi || null, hatDurumu: h.hatDurumu || null });
      }
      // Save paketlemeler
      for (const p of wizPaketler) {
        if (!p.calisillanUrunAdi && !p.miktarAdet) continue;
        await createVardiyaPaketleme({
          raporId,
          calisillanUrunAdi: p.calisillanUrunAdi || null,
          urunTipi: p.urunTipi || null,
          miktarAdet: p.miktarAdet ? parseInt(p.miktarAdet, 10) : null,
          gramaj: p.gramaj ? parseFloat(String(p.gramaj).replace(',', '.')) : null,
          toplamKg: p.toplamKg ? parseFloat(String(p.toplamKg).replace(',', '.')) : null,
        });
      }
      // Save hammaddeler
      for (const m of wizHammaddeler) {
        if (!m.adi && !m.miktar) continue;
        await createVardiyaHammadde({
          raporId,
          adi: m.adi || null,
          partiSiparisNo: m.partiSiparisNo || null,
          miktar: m.miktar ? parseFloat(String(m.miktar).replace(',', '.')) : null,
          fireAdedi: m.fireAdedi ? parseInt(m.fireAdedi, 10) : null,
          fireAciklama: m.fireAciklama || null,
        });
      }

      setModalVisible(false);
      await loadData();
    } catch (err) {
      console.warn('WizardSave error:', err);
      Alert.alert('Hata', String(err?.message || err));
    } finally { setSaving(false); }
  };

  const handleDeleteRapor = async (rapor) => {
    try {
      // Delete all sub-items first
      const subs = subDataMap[rapor.id] || {};
      for (const item of (subs.hatDurum || [])) { await deleteVardiyaHatDurum(item.id).catch(() => {}); }
      for (const item of (subs.paketleme || [])) { await deleteVardiyaPaketleme(item.id).catch(() => {}); }
      for (const item of (subs.hammadde || [])) { await deleteVardiyaHammadde(item.id).catch(() => {}); }
      await deleteVardiyaRapor(rapor.id);
      await loadData();
    } catch (err) {
      Alert.alert('Hata', err.message);
    }
  };

  const handleDeleteSub = async (secKey, item) => {
    try {
      const sec = SUB_SECTIONS.find(s => s.key === secKey);
      await sec.deleteFn(item.id);
      await loadData();
    } catch (err) {
      Alert.alert('Hata', err.message);
    }
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="chevron-left" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={[styles.headerIcon, { backgroundColor: '#EEF2FF' }]}>
          <Text style={{ fontSize: 18, color: INDIGO, fontWeight: '700' }}>V</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Vardiya Raporu</Text>
          <Text style={styles.headerSubtitle}>
            {loading ? 'Yükleniyor...' : `${raporlar.length} rapor`}
          </Text>
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: INDIGO }]} onPress={openNewRapor} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>+ Yeni</Text>
        </TouchableOpacity>
      </View>

      {/* Date filter */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={styles.filterDateBtn}
          onPress={() => { setPendingDate(new Date(startDate + 'T00:00:00')); setShowDatePicker('start'); }}
          activeOpacity={0.7}
        >
          <Text style={styles.filterDateLabel}>BAŞLANGIÇ</Text>
          <Text style={styles.filterDateText}>{formatTR(startDate)}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.filterDateBtn}
          onPress={() => { setPendingDate(new Date(endDate + 'T00:00:00')); setShowDatePicker('end'); }}
          activeOpacity={0.7}
        >
          <Text style={styles.filterDateLabel}>BİTİŞ</Text>
          <Text style={styles.filterDateText}>{formatTR(endDate)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterTodayBtn} onPress={() => { setStartDate(today()); setEndDate(today()); }} activeOpacity={0.7}>
          <Text style={[styles.filterTodayText, { color: INDIGO }]}>Bugün</Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={pendingDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            if (event.type === 'dismissed' || !date) {
              setShowDatePicker(null);
              return;
            }
            const val = date.toISOString().split('T')[0];
            if (showDatePicker === 'start') { setStartDate(val); if (val > endDate) setEndDate(val); }
            else { setEndDate(val); if (val < startDate) setStartDate(val); }
            setShowDatePicker(null);
          }}
        />
      )}
      {showDatePicker && Platform.OS === 'ios' && (
        <Modal visible={true} transparent animationType="fade">
        <View style={styles.pickerPopupOverlay}>
          <View style={styles.pickerModalSheet}>
            <Text style={styles.datePickerTitle}>{showDatePicker === 'start' ? 'Başlangıç Tarihi' : 'Bitiş Tarihi'}</Text>
            <DateTimePicker
              value={pendingDate} mode="date" display="spinner"
              themeVariant="light"
              locale="tr"
              onChange={(e, d) => { if (d) setPendingDate(d); }}
              style={{ height: 180 }}
            />
            <View style={styles.datePickerActions}>
              <TouchableOpacity style={styles.datePickerCancel} onPress={() => setShowDatePicker(null)}>
                <Text style={styles.datePickerCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.datePickerConfirm, { backgroundColor: INDIGO }]}
                onPress={() => {
                  const val = pendingDate.toISOString().split('T')[0];
                  if (showDatePicker === 'start') { setStartDate(val); if (val > endDate) setEndDate(val); }
                  else { setEndDate(val); if (val < startDate) setStartDate(val); }
                  setShowDatePicker(null);
                }}
              >
                <Text style={styles.datePickerConfirmText}>Seç</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </Modal>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={INDIGO} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
            <Text style={styles.retryBtnText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={INDIGO} />}
        >
          {raporlar.length === 0 && (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Henüz rapor yok</Text>
              <Text style={styles.emptySubtext}>Yeni rapor eklemek için "+ Yeni" butonuna basın</Text>
            </View>
          )}
          {raporlar.map(rapor => (
            <RaporCard
              key={rapor.id}
              rapor={rapor}
              subData={subDataMap[rapor.id] || { hatDurum: [], paketleme: [], hammadde: [] }}
              onEdit={openEditRapor}
              onDelete={handleDeleteRapor}
              onAddSub={openAddSub}
              onEditSub={openEditSub}
              onDeleteSub={handleDeleteSub}
            />
          ))}
        </ScrollView>
      )}

      {/* Wizard Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bgApp }}>
          {/* Wizard header */}
          <View style={formStyles.header}>
            <Text style={formStyles.headerTitle}>{modalEditId ? 'Rapor Düzenle' : 'Yeni Vardiya Raporu'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Vardiya banner */}
          {selectedVardiya && (() => {
            const def = VARDIYA_DEFS[selectedVardiya];
            return (
              <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, backgroundColor: Colors.bgWhite }}>
                <View style={[formStyles.vardiyaBanner, { borderColor: def.color, backgroundColor: def.bgColor }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[formStyles.vardiyaBadge, { backgroundColor: def.color }]}>
                      <Text style={formStyles.vardiyaBadgeText}>{selectedVardiya}</Text>
                    </View>
                    <View>
                      <Text style={[formStyles.vardiyaBannerTitle, { color: def.color }]}>Vardiya {selectedVardiya}</Text>
                      <Text style={[formStyles.vardiyaBannerTime, { color: def.color }]}>{def.baslangic} – {def.bitis}</Text>
                    </View>
                  </View>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: def.color }}>OTOMATİK</Text>
                  </View>
                </View>
              </View>
            );
          })()}

          {/* Hat tabs */}
          {perHatData.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: Colors.bgWhite, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight, maxHeight: 52 }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
              {perHatData.map((h, i) => (
                <TouchableOpacity key={i} onPress={() => switchHatTab(i)} activeOpacity={0.7}
                  style={[formStyles.hatTab, activeHatIdx === i && formStyles.hatTabActive]}>
                  <Text style={[formStyles.hatTabText, activeHatIdx === i && formStyles.hatTabTextActive]}>{h.hatLabel}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {autoFilling && (
            <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EEF2FF' }}>
              <ActivityIndicator size="small" color={INDIGO} />
              <Text style={{ fontSize: 13, color: INDIGO, fontWeight: '600' }}>Veriler yükleniyor...</Text>
            </View>
          )}

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={{ padding: Spacing.lg }} keyboardShouldPersistTaps="handled">

              {/* ═══ SECTION: Genel ═══ */}
              <View style={formStyles.sectionHeaderRow}>
                <View style={[formStyles.sectionDot, { backgroundColor: INDIGO }]} />
                <Text style={[formStyles.sectionHeaderLabel, { color: INDIGO }]}>GENEL</Text>
              </View>

                <View style={formStyles.fieldRow}>
                    <View style={formStyles.fieldHalf}>
                      <Text style={formStyles.fieldLabel}>ÇALIŞMA HAT</Text>
                      <View style={[formStyles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F3F4F6' }]}>
                        <Text style={{ flex: 1, fontSize: 15, color: Colors.textPrimary, fontWeight: '600' }}>
                          {wizGenel.calismaHat || '—'}
                        </Text>
                        {autoFilling && <ActivityIndicator size="small" color={INDIGO} />}
                        <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: INDIGO }}>OTOMATİK</Text>
                        </View>
                      </View>
                    </View>
                    {/* Tarih — otomatik */}
                    <View style={formStyles.fieldHalf}>
                      <Text style={formStyles.fieldLabel}>TARİH</Text>
                      <View style={[formStyles.input, { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6' }]}>
                        <Text style={{ fontSize: 15, color: Colors.textPrimary, flex: 1 }}>{wizGenel.tarih ? formatTR(wizGenel.tarih) : formatTR(today())}</Text>
                        <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: INDIGO }}>OTOMATİK</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={formStyles.fieldRow}>
                    {GENEL_FIELDS.filter(f => f.key === 'calismaSaatiBas' || f.key === 'calismaSaatiBit').map(f => (
                      <View key={f.key} style={formStyles.fieldHalf}>
                        <Text style={formStyles.fieldLabel}>{f.key === 'calismaSaatiBas' ? 'BAŞLANGIÇ SAATİ' : 'BİTİŞ SAATİ'}</Text>
                        <View
                          style={[formStyles.input, { flexDirection: 'row', alignItems: 'center' }, selectedVardiya && { backgroundColor: '#F3F4F6' }]}
                        >
                          <Text style={{ fontSize: 15, color: wizGenel[f.key] ? Colors.textPrimary : Colors.textTertiary, flex: 1 }}>
                            {wizGenel[f.key] || '--:--'}
                          </Text>
                          {selectedVardiya && (
                            <View style={{ backgroundColor: VARDIYA_DEFS[selectedVardiya]?.bgColor, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: VARDIYA_DEFS[selectedVardiya]?.color }}>OTOMATİK</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                  <View style={formStyles.fieldRow}>
                    {/* Parti No — plain text input */}
                    <View style={formStyles.fieldHalf}>
                      <Text style={formStyles.fieldLabel}>ÇALIŞILAN PARTİ NO</Text>
                      <TextInput
                        style={formStyles.input}
                        value={wizGenel.calisillanPartiNo || ''}
                        onChangeText={t => setWizGenel(p => ({ ...p, calisillanPartiNo: t }))}
                        placeholder="Parti no girin"
                        placeholderTextColor={Colors.textTertiary}
                      />
                    </View>
                    {/* Giren Hammadde */}
                    {GENEL_FIELDS.filter(f => f.key === 'girenHammaddeMiktari').map(f => (
                      <View key={f.key} style={formStyles.fieldHalf}>
                        <Text style={formStyles.fieldLabel}>GİREN HAMMADDE (KG)</Text>
                        <TextInput style={formStyles.input} value={wizGenel[f.key] || ''} onChangeText={t => setWizGenel(p => ({ ...p, [f.key]: t.replace(/[^0-9.,-]/g, '') }))} keyboardType="decimal-pad" placeholderTextColor={Colors.textTertiary} />
                      </View>
                    ))}
                  </View>
                  {/* Inject */}
                  {wizGenel.injectlemeKodu ? (
                    <View style={formStyles.fieldWrap}>
                      <Text style={formStyles.fieldLabel}>INJECT</Text>
                      <View style={[formStyles.input, { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6' }]}>
                        <Text style={{ fontSize: 13, color: Colors.textPrimary, flex: 1 }}>{wizGenel.injectlemeKodu}</Text>
                        <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: INDIGO }}>OTOMATİK</Text>
                        </View>
                      </View>
                    </View>
                  ) : null}
                  <View style={formStyles.fieldRow}>
                    {GENEL_FIELDS.filter(f => f.key === 'kamyonSayisi' || f.key === 'toplamUretimMiktari').map(f => (
                      <View key={f.key} style={formStyles.fieldHalf}>
                        <Text style={formStyles.fieldLabel}>{f.label.toUpperCase()}</Text>
                        <TextInput style={formStyles.input} value={wizGenel[f.key] || ''} onChangeText={t => setWizGenel(p => ({ ...p, [f.key]: t.replace(/[^0-9.,-]/g, '') }))} keyboardType="decimal-pad" placeholderTextColor={Colors.textTertiary} />
                      </View>
                    ))}
                  </View>
                  {GENEL_FIELDS.filter(f => f.key === 'arizaBildirimi').map(f => (
                    <View key={f.key} style={formStyles.fieldWrap}>
                      <Text style={formStyles.fieldLabel}>ARIZA BİLDİRİMİ</Text>
                      <TextInput style={formStyles.input} value={wizGenel[f.key] || ''} onChangeText={t => setWizGenel(p => ({ ...p, [f.key]: t }))} placeholder="Arıza yoksa boş bırakın" placeholderTextColor={Colors.textTertiary} />
                    </View>
                  ))}


              {/* ═══ SECTION: Günlük Üretim ═══ */}
              <View style={[formStyles.sectionHeaderRow, { marginTop: Spacing.xl }]}>
                <View style={[formStyles.sectionDot, { backgroundColor: '#D97706' }]} />
                <Text style={[formStyles.sectionHeaderLabel, { color: '#D97706' }]}>GÜNLÜK ÜRETİM</Text>
              </View>

                  {wizPaketler.map((pak, idx) => (
                    <View key={idx} style={formStyles.multiCard}>
                      <View style={formStyles.multiCardHeader}>
                        <Text style={formStyles.multiCardTitle}>Paket #{idx + 1}</Text>
                        <TouchableOpacity style={formStyles.rowDeleteBtn} onPress={() => setWizPaketler(p => p.length > 1 ? p.filter((_, i) => i !== idx) : p)}>
                          <Icon name="delete-outline" size={20} color={Colors.danger} />
                        </TouchableOpacity>
                      </View>
                      <View style={formStyles.fieldRow}>
                        <View style={formStyles.fieldHalf}>
                          <Text style={formStyles.fieldLabel}>ÜRÜN ADI</Text>
                          <TextInput style={formStyles.input} value={pak.calisillanUrunAdi} onChangeText={t => setWizPaketler(p => p.map((x, i) => i === idx ? { ...x, calisillanUrunAdi: t } : x))} placeholderTextColor={Colors.textTertiary} />
                        </View>
                        <View style={formStyles.fieldHalf}>
                          <Text style={formStyles.fieldLabel}>TİP</Text>
                          <TextInput style={formStyles.input} value={pak.urunTipi} onChangeText={t => setWizPaketler(p => p.map((x, i) => i === idx ? { ...x, urunTipi: t } : x))} placeholderTextColor={Colors.textTertiary} />
                        </View>
                      </View>
                      <View style={formStyles.fieldRow}>
                        <View style={formStyles.fieldHalf}>
                          <Text style={formStyles.fieldLabel}>ADET</Text>
                          <TextInput style={formStyles.input} value={pak.miktarAdet} keyboardType="number-pad" onChangeText={t => { const v = t.replace(/[^0-9]/g, ''); setWizPaketler(p => p.map((x, i) => { if (i !== idx) return x; const g = parseFloat(String(x.gramaj).replace(',','.')) || 0; return { ...x, miktarAdet: v, toplamKg: v && g ? ((parseInt(v,10) * g) / 1000).toFixed(2) : x.toplamKg }; })); }} placeholderTextColor={Colors.textTertiary} />
                        </View>
                        <View style={formStyles.fieldHalf}>
                          <Text style={formStyles.fieldLabel}>GRAMAJ</Text>
                          <TextInput style={formStyles.input} value={pak.gramaj} keyboardType="decimal-pad" onChangeText={t => { const v = t.replace(/[^0-9.,]/g, ''); setWizPaketler(p => p.map((x, i) => { if (i !== idx) return x; const m = parseInt(x.miktarAdet, 10) || 0; const g = parseFloat(v.replace(',','.')) || 0; return { ...x, gramaj: v, toplamKg: m && g ? ((m * g) / 1000).toFixed(2) : x.toplamKg }; })); }} placeholderTextColor={Colors.textTertiary} />
                        </View>
                        <View style={formStyles.fieldHalf}>
                          <Text style={formStyles.fieldLabel}>TOP. KG</Text>
                          <TextInput style={[formStyles.input, { backgroundColor: '#F3F4F6' }]} value={pak.toplamKg} keyboardType="decimal-pad" onChangeText={t => setWizPaketler(p => p.map((x, i) => i === idx ? { ...x, toplamKg: t.replace(/[^0-9.,]/g, '') } : x))} placeholderTextColor={Colors.textTertiary} />
                        </View>
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity style={formStyles.addRowBtn} onPress={() => setWizPaketler(p => [...p, { calisillanUrunAdi: '', urunTipi: '', miktarAdet: '', gramaj: '', toplamKg: '' }])}>
                    <Text style={formStyles.addRowText}>+ Paket Ekle</Text>
                  </TouchableOpacity>

              {/* ═══ SECTION: Hammadde ═══ */}
              <View style={[formStyles.sectionHeaderRow, { marginTop: Spacing.xl }]}>
                <View style={[formStyles.sectionDot, { backgroundColor: '#16A34A' }]} />
                <Text style={[formStyles.sectionHeaderLabel, { color: '#16A34A' }]}>HAMMADDE</Text>
              </View>

                  {wizHammaddeler.map((ham, idx) => (
                    <View key={idx} style={formStyles.multiCard}>
                      <View style={formStyles.multiCardHeader}>
                        <Text style={formStyles.multiCardTitle}>Hammadde #{idx + 1}</Text>
                        <TouchableOpacity style={formStyles.rowDeleteBtn} onPress={() => setWizHammaddeler(p => p.length > 1 ? p.filter((_, i) => i !== idx) : p)}>
                          <Icon name="delete-outline" size={20} color={Colors.danger} />
                        </TouchableOpacity>
                      </View>
                      <View style={formStyles.fieldRow}>
                        <View style={formStyles.fieldHalf}>
                          <Text style={formStyles.fieldLabel}>ADI</Text>
                          <TextInput style={formStyles.input} value={ham.adi} onChangeText={t => setWizHammaddeler(p => p.map((x, i) => i === idx ? { ...x, adi: t } : x))} placeholderTextColor={Colors.textTertiary} />
                        </View>
                        <View style={formStyles.fieldHalf}>
                          <Text style={formStyles.fieldLabel}>PARTİ NO</Text>
                          <TextInput style={formStyles.input} value={ham.partiSiparisNo} onChangeText={t => setWizHammaddeler(p => p.map((x, i) => i === idx ? { ...x, partiSiparisNo: t } : x))} placeholderTextColor={Colors.textTertiary} />
                        </View>
                      </View>
                      <View style={formStyles.fieldRow}>
                        <View style={formStyles.fieldHalf}>
                          <Text style={formStyles.fieldLabel}>MİKTAR</Text>
                          <TextInput style={formStyles.input} value={ham.miktar} keyboardType="decimal-pad" onChangeText={t => setWizHammaddeler(p => p.map((x, i) => i === idx ? { ...x, miktar: t.replace(/[^0-9.,]/g, '') } : x))} placeholderTextColor={Colors.textTertiary} />
                        </View>
                        <View style={formStyles.fieldHalf}>
                          <Text style={formStyles.fieldLabel}>FİRE</Text>
                          <TextInput style={formStyles.input} value={ham.fireAdedi} keyboardType="number-pad" onChangeText={t => setWizHammaddeler(p => p.map((x, i) => i === idx ? { ...x, fireAdedi: t.replace(/[^0-9]/g, '') } : x))} placeholderTextColor={Colors.textTertiary} />
                        </View>
                      </View>
                      <View style={formStyles.fieldWrap}>
                        <Text style={formStyles.fieldLabel}>FİRE AÇIKLAMA</Text>
                        <TextInput style={formStyles.input} value={ham.fireAciklama} onChangeText={t => setWizHammaddeler(p => p.map((x, i) => i === idx ? { ...x, fireAciklama: t } : x))} placeholderTextColor={Colors.textTertiary} />
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity style={formStyles.addRowBtn} onPress={() => setWizHammaddeler(p => [...p, { adi: '', partiSiparisNo: '', miktar: '', fireAdedi: '', fireAciklama: '' }])}>
                    <Text style={formStyles.addRowText}>+ Hammadde Ekle</Text>
                  </TouchableOpacity>

              {/* ═══ SECTION: Değerler (KOLİLEME hattında gösterilmez) ═══ */}
              {!(perHatData[activeHatIdx]?.hatLabel || '').toUpperCase().includes('KOLİLEME') && (<>
              <View style={[formStyles.sectionHeaderRow, { marginTop: Spacing.xl }]}>
                <View style={[formStyles.sectionDot, { backgroundColor: '#7C3AED' }]} />
                <Text style={[formStyles.sectionHeaderLabel, { color: '#7C3AED' }]}>DEĞERLER</Text>
              </View>

                  <Text style={formStyles.sectionTitle}>SON ÜRÜN DEĞERLERİ</Text>
                  <View style={formStyles.fieldRow}>
                    {DEGER_FIELDS.filter(f => f.key === 'sonBrix' || f.key === 'sonBost').map(f => (
                      <View key={f.key} style={formStyles.fieldHalf}>
                        <Text style={formStyles.fieldLabel}>{f.key === 'sonBrix' ? 'SON BRİX' : 'SON BOSTWİCK'}</Text>
                        <TextInput style={formStyles.input} value={wizDegerler[f.key] || ''} keyboardType="decimal-pad" onChangeText={t => setWizDegerler(p => ({ ...p, [f.key]: t.replace(/[^0-9.,]/g, '') }))} placeholderTextColor={Colors.textTertiary} />
                      </View>
                    ))}
                  </View>
                  <View style={formStyles.fieldWrap}>
                    <Text style={formStyles.fieldLabel}>SON RENK</Text>
                    <TextInput style={[formStyles.input, { width: '48%' }]} value={wizDegerler.sonRenk || ''} keyboardType="decimal-pad" onChangeText={t => setWizDegerler(p => ({ ...p, sonRenk: t.replace(/[^0-9.,]/g, '') }))} placeholderTextColor={Colors.textTertiary} />
                  </View>
                  <Text style={[formStyles.sectionTitle, { marginTop: Spacing.lg }]}>ÜRETİM DEĞERLERİ</Text>
                  <View style={formStyles.fieldRow}>
                    {DEGER_FIELDS.filter(f => f.key === 'uretimBrix' || f.key === 'uretimBost').map(f => (
                      <View key={f.key} style={formStyles.fieldHalf}>
                        <Text style={formStyles.fieldLabel}>{f.key === 'uretimBrix' ? 'ÜRETİM BRİX' : 'ÜRETİM BOSTWİCK'}</Text>
                        <TextInput style={formStyles.input} value={wizDegerler[f.key] || ''} keyboardType="decimal-pad" onChangeText={t => setWizDegerler(p => ({ ...p, [f.key]: t.replace(/[^0-9.,]/g, '') }))} placeholderTextColor={Colors.textTertiary} />
                      </View>
                    ))}
                  </View>
                  <View style={formStyles.fieldWrap}>
                    <Text style={formStyles.fieldLabel}>ÜRETİM RENK</Text>
                    <TextInput style={[formStyles.input, { width: '48%' }]} value={wizDegerler.uretimRenk || ''} keyboardType="decimal-pad" onChangeText={t => setWizDegerler(p => ({ ...p, uretimRenk: t.replace(/[^0-9.,]/g, '') }))} placeholderTextColor={Colors.textTertiary} />
                  </View>
                  <View style={formStyles.fieldWrap}>
                    <Text style={formStyles.fieldLabel}>NOTLAR</Text>
                    <TextInput style={[formStyles.input, { minHeight: 80, textAlignVertical: 'top' }]} value={wizDegerler.notlar || ''} onChangeText={t => setWizDegerler(p => ({ ...p, notlar: t }))} multiline placeholderTextColor={Colors.textTertiary} />
                  </View>
              </>)}

              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Wizard date picker */}
          {wizDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={wizPendingDate}
              mode="date"
              display="default"
              onChange={(event, date) => {
                if (event.type === 'dismissed' || !date) {
                  setWizDatePicker(null);
                  return;
                }
                setWizGenel(p => ({ ...p, [wizDatePicker]: date.toISOString().split('T')[0] }));
                setWizDatePicker(null);
              }}
            />
          )}
          {wizDatePicker && Platform.OS === 'ios' && (
            <Modal visible={true} transparent animationType="fade">
            <View style={styles.inModalPickerOverlay}>
              <View style={styles.pickerModalSheet}>
                <DateTimePicker value={wizPendingDate} mode="date" display="spinner" themeVariant="light" locale="tr" onChange={(e, d) => { if (d) setWizPendingDate(d); }} style={{ height: 180 }} />
                <View style={styles.datePickerActions}>
                  <TouchableOpacity style={styles.datePickerCancel} onPress={() => setWizDatePicker(null)}>
                    <Text style={styles.datePickerCancelText}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.datePickerConfirm, { backgroundColor: INDIGO }]} onPress={() => { setWizGenel(p => ({ ...p, [wizDatePicker]: wizPendingDate.toISOString().split('T')[0] })); setWizDatePicker(null); }}>
                    <Text style={styles.datePickerConfirmText}>Seç</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            </Modal>
          )}

          {/* Wizard time picker overlay */}
          {!!wizTimePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={wizPendingTime}
              mode="time"
              display="default"
              is24Hour={true}
              onChange={(event, date) => {
                if (event.type === 'dismissed' || !date) {
                  setWizTimePicker(null);
                  return;
                }
                const hh = String(date.getHours()).padStart(2, '0');
                const mm = String(date.getMinutes()).padStart(2, '0');
                setWizGenel(p => ({ ...p, [wizTimePicker]: `${hh}:${mm}` }));
                setWizTimePicker(null);
              }}
            />
          )}
          {!!wizTimePicker && Platform.OS === 'ios' && (
            <Modal visible={true} transparent animationType="fade">
            <View style={styles.inModalPickerOverlay}>
              <View style={styles.pickerModalSheet}>
                <Text style={{ fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 8, color: Colors.textPrimary }}>Saat Seçin</Text>
                <DateTimePicker value={wizPendingTime} mode="time" display="spinner" themeVariant="light" is24Hour={true} locale="tr" onChange={(e, d) => { if (d) setWizPendingTime(d); }} style={{ height: 180 }} />
                <View style={styles.datePickerActions}>
                  <TouchableOpacity style={styles.datePickerCancel} onPress={() => setWizTimePicker(null)}>
                    <Text style={styles.datePickerCancelText}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.datePickerConfirm, { backgroundColor: INDIGO }]} onPress={() => {
                    const hh = String(wizPendingTime.getHours()).padStart(2, '0');
                    const mm = String(wizPendingTime.getMinutes()).padStart(2, '0');
                    setWizGenel(p => ({ ...p, [wizTimePicker]: `${hh}:${mm}` }));
                    setWizTimePicker(null);
                  }}>
                    <Text style={styles.datePickerConfirmText}>Seç</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            </Modal>
          )}

          {/* Wizard footer buttons */}
          <View style={formStyles.footer}>
            <TouchableOpacity style={formStyles.footerCancelBtn} onPress={() => setModalVisible(false)}>
              <Text style={formStyles.footerCancelText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[formStyles.footerNextBtn, { backgroundColor: INDIGO }]} onPress={handleWizardSave} disabled={saving} activeOpacity={0.8}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={formStyles.footerNextText}>Raporu Kaydet</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Sub-item edit modal (from expanded card) */}
      <Modal visible={subModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bgApp }}>
          <View style={formStyles.header}>
            <TouchableOpacity style={formStyles.footerCancelBtn} onPress={() => setSubModalVisible(false)}>
              <Text style={formStyles.footerCancelText}>İptal</Text>
            </TouchableOpacity>
            <Text style={formStyles.headerTitle}>{subModalEditId ? 'Düzenle' : 'Yeni Ekle'}</Text>
            <TouchableOpacity style={[formStyles.headerSaveBtn, subSaving && { opacity: 0.6 }]} onPress={handleSubSave} disabled={subSaving}>
              {subSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={formStyles.footerNextText}>Kaydet</Text>}
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={{ padding: Spacing.lg }} keyboardShouldPersistTaps="handled">
              {(SUB_SECTIONS.find(s => s.key === subModalMode)?.fields || []).map(f => (
                <View key={f.key} style={formStyles.fieldWrap}>
                  <Text style={formStyles.fieldLabel}>{f.label}</Text>
                  <TextInput style={formStyles.input} value={subFormData[f.key] || ''} onChangeText={t => { const v = (f.type === 'number' || f.type === 'integer') ? t.replace(/[^0-9.,-]/g, '') : t; setSubFormData(p => ({ ...p, [f.key]: v })); }} keyboardType={f.type === 'number' || f.type === 'integer' ? 'decimal-pad' : 'default'} placeholderTextColor={Colors.textTertiary} />
                </View>
              ))}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Form Modal Styles ────────────────────────────────────────
const formStyles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.bgWhite, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  headerSaveBtn: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.sm,
    backgroundColor: INDIGO, alignItems: 'center', justifyContent: 'center',
  },
  // Step indicator
  stepRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.bgWhite, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: Colors.borderColor,
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgWhite,
  },
  stepDotActive: { borderColor: INDIGO },
  stepDotDone: { borderColor: INDIGO, backgroundColor: INDIGO },
  stepDotText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  stepLine: { width: 20, height: 2, backgroundColor: Colors.borderColor, marginHorizontal: 2 },
  stepLabel: { fontSize: 9, fontWeight: '600', color: Colors.textTertiary, textAlign: 'center', marginTop: 3 },
  // Fields
  fieldWrap: { marginBottom: Spacing.lg },
  fieldRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  fieldHalf: { flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary, marginBottom: 5, letterSpacing: 0.3 },
  input: {
    backgroundColor: Colors.bgWhite, borderWidth: 1, borderColor: Colors.borderColor,
    borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: Colors.textPrimary,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  // Multi-row (hat, paket, hammadde)
  multiRow: {
    flexDirection: 'row', gap: 6, alignItems: 'flex-end',
    marginBottom: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  rowDeleteBtn: { padding: 6 },
  // Multi-item card (paketleme, hammadde)
  multiCard: {
    backgroundColor: Colors.bgWhite, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.borderColor,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  multiCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm,
  },
  multiCardTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  addRowBtn: {
    alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.sm, borderWidth: 1.5, borderColor: INDIGO, backgroundColor: '#EEF2FF',
  },
  addRowText: { fontSize: 13, fontWeight: '700', color: INDIGO },

  // Vardiya banner
  vardiyaBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: Radius.sm, borderWidth: 1.5, borderColor: Colors.borderColor,
  },
  vardiyaBadge: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.textTertiary,
  },
  vardiyaBadgeText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  vardiyaBannerTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  vardiyaBannerTime: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },

  // Hat tabs
  hatTab: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: Radius.sm, borderWidth: 1.5, borderColor: Colors.borderColor,
    backgroundColor: Colors.bgWhite,
  },
  hatTabActive: { borderColor: INDIGO, backgroundColor: '#EEF2FF' },
  hatTabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  hatTabTextActive: { color: INDIGO, fontWeight: '700' },

  // Section headers
  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: Spacing.md, paddingBottom: Spacing.sm,
    borderBottomWidth: 1.5, borderBottomColor: Colors.borderLight,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionHeaderLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },

  // Vardiya selector
  vardiyaBtn: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 8,
    borderRadius: Radius.sm, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  vardiyaBtnLabel: { fontSize: 18, fontWeight: '800' },
  vardiyaBtnTime: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  // Picker overlay
  pickerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  pickerSheet: {
    backgroundColor: Colors.bgWhite, borderRadius: Radius.lg,
    padding: Spacing.lg, width: '85%', maxWidth: 360,
  },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.md },
  pickerItem: {
    paddingVertical: 12, paddingHorizontal: 8,
    borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  pickerItemText: { fontSize: 15, color: Colors.textPrimary },
  pickerCancel: {
    paddingVertical: 12, alignItems: 'center',
    marginTop: Spacing.sm, borderRadius: Radius.sm, backgroundColor: Colors.bgSurface,
  },
  pickerCancelText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  // Footer
  footer: {
    flexDirection: 'row', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.bgWhite, borderTopWidth: 0.5, borderTopColor: Colors.borderLight,
  },
  footerCancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.sm, backgroundColor: Colors.bgSurface },
  footerCancelText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  footerBackBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.borderColor },
  footerBackText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  footerNextBtn: { flex: 1, paddingVertical: 12, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  footerNextText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ── Main Styles ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgApp },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.bgWhite, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.bgSurface, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm,
  },
  backBtnText: { fontSize: 22, fontWeight: '600', color: Colors.textPrimary, marginTop: -2 },
  headerIcon: {
    width: 40, height: 40, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm,
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  headerSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  addBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.sm },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  filterBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgWhite, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight, gap: Spacing.sm,
  },
  filterDateBtn: {
    flex: 1, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    backgroundColor: Colors.bgSurface, borderRadius: Radius.sm,
  },
  filterDateLabel: { fontSize: 10, color: Colors.textTertiary, fontWeight: '600' },
  filterDateText: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600', marginTop: 2 },
  filterTodayBtn: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: Radius.sm, backgroundColor: Colors.bgSurface,
  },
  filterTodayText: { fontSize: 13, fontWeight: '600' },

  pickerPopupOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 999,
  },
  datePickerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', paddingVertical: Spacing.sm },
  datePickerActions: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, marginTop: Spacing.md, gap: Spacing.md,
  },
  datePickerCancel: {
    flex: 1, paddingVertical: 12, borderRadius: Radius.sm,
    backgroundColor: Colors.bgSurface, alignItems: 'center', borderWidth: 1, borderColor: Colors.borderColor,
  },
  datePickerCancelText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  datePickerConfirm: { flex: 1, paddingVertical: 12, borderRadius: Radius.sm, alignItems: 'center' },
  datePickerConfirmText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  pickerModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  pickerModalSheet: {
    backgroundColor: Colors.bgWhite, borderRadius: Radius.lg,
    padding: Spacing.lg, width: '85%', maxWidth: 360,
  },
  inModalPickerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 999,
  },

  list: { padding: Spacing.lg, paddingBottom: 80 },

  // Rapor card
  raporCard: {
    backgroundColor: Colors.bgWhite, borderRadius: Radius.md,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm,
  },
  raporHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  raporTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  raporDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  raporActions: { flexDirection: 'row', gap: 12 },
  editText: { fontSize: 18, color: INDIGO, fontWeight: '700' },
  deleteText: { fontSize: 16, color: Colors.danger, fontWeight: '700' },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  statChip: { backgroundColor: Colors.bgSurface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.xs },
  statLabel: { fontSize: 10, color: Colors.textTertiary, fontWeight: '600' },
  statVal: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },

  expandHint: { fontSize: 12, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.sm },

  // Expanded detail
  expandedContent: { marginTop: Spacing.lg },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: INDIGO, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  detailGrid: { flexDirection: 'row', gap: Spacing.md, marginBottom: 10 },
  detailCell: { flex: 1 },
  detailLabel: { fontSize: 10, fontWeight: '600', color: Colors.textTertiary, marginBottom: 2 },
  detailValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  detailDivider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: Spacing.md },
  notlarText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  // Quality comparison table
  qualityTable: {
    flexDirection: 'row', backgroundColor: Colors.bgSurface,
    borderRadius: Radius.sm, overflow: 'hidden',
  },
  qualityCol: { flex: 1, padding: Spacing.sm },
  qualityHeader: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  qualityVDivider: { width: 1, backgroundColor: Colors.borderLight },
  qualityItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  qualityItemLabel: { fontSize: 12, color: Colors.textTertiary },
  qualityItemVal: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },

  subSections: { marginTop: Spacing.lg },
  subSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  subBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.xs },
  subBadgeText: { fontSize: 13, fontWeight: '700' },
  subAddBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.xs, borderWidth: 1.5 },
  subAddBtnText: { fontSize: 12, fontWeight: '700' },

  subItem: { borderLeftWidth: 3, paddingLeft: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.xs },
  subItemHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  subItemActions: { flexDirection: 'row', gap: 8, marginLeft: 8 },
  editTextSm: { fontSize: 15, fontWeight: '700' },
  deleteTextSm: { fontSize: 14, color: Colors.danger, fontWeight: '700' },

  noSubText: { fontSize: 12, color: Colors.textTertiary, fontStyle: 'italic', paddingVertical: 4 },

  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, color: Colors.textTertiary, marginTop: 6, textAlign: 'center' },
  errorText: { fontSize: 14, color: Colors.danger, textAlign: 'center', marginBottom: Spacing.md },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.sm, backgroundColor: Colors.bgSurface },
  retryBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
});
