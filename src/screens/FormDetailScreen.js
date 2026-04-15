import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Radius, Shadows } from '../theme';
import SimpleIcon from '../components/SimpleIcon';
import { FORM_DEFINITIONS } from '../api/formsApi';
import DateTimePicker from '@react-native-community/datetimepicker';
import { VARDIYA_OPTIONS, VARDIYA_DEFS, getVardiyaSaat, getCurrentVardiya } from '../utils/vardiya';
import { toLocalDateStr, todayStr } from '../utils/dateUtils';

const today = () => todayStr();
const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
};

const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const formatTR = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d)} ${TR_MONTHS[parseInt(m) - 1]} ${y}`;
};

function VardiyaSelector({ value, editable, onPress }) {
  const def = value ? VARDIYA_DEFS[value] : null;
  const Wrapper = editable ? TouchableOpacity : View;
  const wrapperProps = editable ? { activeOpacity: 0.7, onPress } : {};
  return (
    <Wrapper {...wrapperProps} style={[styles.vardiyaBanner, def && { borderColor: def.color, backgroundColor: def.bgColor }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={[styles.vardiyaBadge, def && { backgroundColor: def.color }]}>
          <Text style={styles.vardiyaBadgeText}>{value || '?'}</Text>
        </View>
        <View>
          <Text style={[styles.vardiyaBannerTitle, def && { color: def.color }]}>
            Vardiya {value || '?'}
          </Text>
          <Text style={[styles.vardiyaBannerTime, def && { color: def.color }]}>
            {def ? `${def.baslangic} – ${def.bitis}` : ''}
          </Text>
        </View>
      </View>
      <View style={{ backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
        <Text style={{ fontSize: 9, fontWeight: '700', color: def?.color || Colors.textTertiary }}>{editable ? 'DEĞİŞTİR' : 'OTOMATİK'}</Text>
      </View>
    </Wrapper>
  );
}

function UygunlukSelector({ value, onChange, formColor }) {
  return (
    <View style={styles.uygunlukRow}>
      <TouchableOpacity
        style={[
          styles.uygunlukBtn,
          value === 'UYGUN' && { backgroundColor: '#ECFDF5', borderColor: '#059669' },
        ]}
        onPress={() => onChange('UYGUN')}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.uygunlukBtnText,
          value === 'UYGUN' && { color: '#059669', fontWeight: '700' },
        ]}>
          ✓ UYGUN
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.uygunlukBtn,
          value === 'UYGUN DEĞİL' && { backgroundColor: '#FEF2F2', borderColor: '#DC2626' },
        ]}
        onPress={() => onChange('UYGUN DEĞİL')}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.uygunlukBtnText,
          value === 'UYGUN DEĞİL' && { color: '#DC2626', fontWeight: '700' },
        ]}>
          ✗ UYGUN DEĞİL
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function FormField({ field, value, onChange, onDatePress, onTimePress, onVardiyaPress, formColor, pastDateMode }) {
  if (field.type === 'vardiya') {
    return (
      <View style={styles.fieldWrap}>
        <Text style={styles.fieldLabelUpper}>
          {field.label.toUpperCase()}{field.required ? '' : ''} <Text style={{fontSize: 10, color: Colors.textTertiary}}>{pastDateMode ? '(MANUEL)' : '(OTOMATİK)'}</Text>
        </Text>
        <VardiyaSelector value={value || ''} editable={pastDateMode} onPress={() => onVardiyaPress && onVardiyaPress(field.key, value)} />
      </View>
    );
  }

  if (field.type === 'uygunluk') {
    return (
      <View style={styles.fieldWrap}>
        <Text style={styles.fieldLabelUpper}>{field.label.toUpperCase()}</Text>
        <UygunlukSelector value={value || ''} onChange={onChange} formColor={formColor} />
      </View>
    );
  }

  if (field.type === 'date') {
    return (
      <View style={styles.fieldWrap}>
        <Text style={styles.fieldLabelUpper}>
          {field.label.toUpperCase()}{field.required ? ' *' : ''}
        </Text>
        <TouchableOpacity
          style={[styles.input, !pastDateMode && styles.inputDisabled]}
          activeOpacity={pastDateMode ? 0.7 : 1}
          onPress={() => pastDateMode && onDatePress && onDatePress(field.key, value)}
        >
          <Text style={value ? styles.inputText : styles.placeholderText}>
            {value ? formatTR(value) : 'Tarih seçin'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (field.type === 'time') {
    return (
      <View style={styles.fieldWrap}>
        <Text style={styles.fieldLabelUpper}>{field.label.toUpperCase()}</Text>
        <TouchableOpacity
          style={[styles.input, !pastDateMode && styles.inputDisabled]}
          activeOpacity={pastDateMode ? 0.7 : 1}
          onPress={() => pastDateMode && onTimePress && onTimePress(field.key, value)}
        >
          <Text style={value ? styles.inputText : styles.placeholderText}>
            {value || 'HH:mm:ss'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isNumeric = field.type === 'number' || field.type === 'integer';

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabelUpper}>
        {field.label.toUpperCase()}{field.required ? ' *' : ''}
      </Text>
      <TextInput
        style={styles.input}
        value={value !== null && value !== undefined ? String(value) : ''}
        onChangeText={(t) => {
          if (isNumeric) {
            const cleaned = t.replace(field.type === 'integer' ? /[^0-9-]/g : /[^0-9.,-]/g, '');
            onChange(cleaned);
          } else {
            onChange(t);
          }
        }}
        placeholder={field.placeholder || (isNumeric ? '0' : '')}
        placeholderTextColor={Colors.textTertiary}
        keyboardType={isNumeric ? 'decimal-pad' : 'default'}
        maxLength={field.maxLength || undefined}
      />
    </View>
  );
}

function SectionTabBar({ sections, activeTab, onChangeTab, formColor }) {
  return (
    <View style={styles.tabBarContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBarScroll}
      >
        {sections.map((section, idx) => {
          const isActive = idx === activeTab;
          return (
            <TouchableOpacity
              key={idx}
              style={styles.tabItem}
              onPress={() => onChangeTab(idx)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tabText,
                isActive && { color: formColor, fontWeight: '600' },
              ]}>
                {section.title}
              </Text>
              {isActive && (
                <View style={[styles.tabIndicator, { backgroundColor: formColor }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function EntryCard({ entry, fields, formDef, onDelete, onEdit, readOnly, index }) {
  const [expanded, setExpanded] = useState(false);
  const filledFields = fields.filter(f => {
    const val = entry[f.key];
    return val !== null && val !== undefined && val !== '';
  });
  const col1 = filledFields[0];
  const col2 = filledFields[1];
  const remainingFields = filledFields.slice(2);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => setExpanded(!expanded)}
      style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven, expanded && styles.tableRowExpanded]}
    >
      <View style={styles.tableRowMain}>
        <View style={styles.cellId}>
          <Text style={[styles.cellIdText, { color: formDef.color }]}>#{entry.id}</Text>
          {entry.vardiya ? <Text style={styles.cellVardiya}>{entry.vardiya}</Text> : null}
        </View>
        <View style={styles.cellField1}>
          {col1 ? (
            <>
              <Text style={styles.cellLabel}>{col1.label}</Text>
              <Text style={styles.cellValue} numberOfLines={1}>{String(entry[col1.key])}</Text>
            </>
          ) : <Text style={styles.cellValue}>-</Text>}
        </View>
        <View style={styles.cellField2}>
          {col2 ? (
            <>
              <Text style={styles.cellLabel}>{col2.label}</Text>
              <Text style={styles.cellValue} numberOfLines={1}>{String(entry[col2.key])}</Text>
            </>
          ) : <Text style={styles.cellValue}>-</Text>}
        </View>
        <View style={styles.cellActions}>
          {entry.tarih && <Text style={styles.cellDateText}>{formatTR(entry.tarih.split('T')[0])}</Text>}
          <View style={styles.actionRow}>
            {!readOnly && (
              <>
                <TouchableOpacity onPress={() => onEdit(entry)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <SimpleIcon name="edit" size={14} color={Colors.brandPrimary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert('Sil', `#${entry.id} kaydını silmek istediğinize emin misiniz?`, [
                      { text: 'İptal', style: 'cancel' },
                      { text: 'Sil', style: 'destructive', onPress: () => onDelete(entry.id) },
                    ]);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <SimpleIcon name="close" size={14} color={Colors.danger} />
                </TouchableOpacity>
              </>
            )}
            {remainingFields.length > 0 && (
              <SimpleIcon name={expanded ? 'expand-less' : 'expand-more'} size={16} color={Colors.textTertiary} />
            )}
          </View>
        </View>
      </View>

      {expanded && remainingFields.length > 0 && (
        <View style={styles.expandedBody}>
          {remainingFields.map((f, i) => (
            <View key={f.key} style={styles.expandedField}>
              <Text style={styles.expandedFieldLabel}>{f.label}</Text>
              <Text style={styles.expandedFieldValue}>{String(entry[f.key])}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function FormDetailScreen({ route }) {
  const { formKey } = route.params;
  const formDef = useMemo(() => FORM_DEFINITIONS.find(f => f.key === formKey), [formKey]);
  const navigation = useNavigation();
  const isReadOnly = formKey === 'depoSevk';

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  // Date range filter
  const hasTarihFilter = formDef && formDef.filterParams.some(p => p === 'tarih' || p === 'sogutmaCikisTarihi' || p === 'uretimTarihi');
  const [filterStartDate, setFilterStartDate] = useState(today());
  const [filterEndDate, setFilterEndDate] = useState(today());
  const [showFilterPicker, setShowFilterPicker] = useState(null);
  const [pendingFilterDate, setPendingFilterDate] = useState(new Date());
  // Form field date picker
  const [showFormDatePicker, setShowFormDatePicker] = useState(false);
  const [formDateField, setFormDateField] = useState(null);
  const [pendingFormDate, setPendingFormDate] = useState(new Date());
  // Form field time picker
  const [showFormTimePicker, setShowFormTimePicker] = useState(false);
  const [formTimeField, setFormTimeField] = useState(null);
  const [pendingFormTime, setPendingFormTime] = useState(new Date());

  // Depo Sevk type filter: tumu | dolum | kolileme
  const [depoSevkFilter, setDepoSevkFilter] = useState('tumu');
  // Vardiya filter for depoSevk
  const [vardiyaFilter, setVardiyaFilter] = useState('tumu');
  // Past date mode
  const [pastDateMode, setPastDateMode] = useState(false);
  const [showVardiyaPicker, setShowVardiyaPicker] = useState(false);

  const initFormData = useCallback(() => {
    const data = {};
    const currentV = getCurrentVardiya();
    const currentSaat = getVardiyaSaat(currentV);
    formDef.fields.forEach(f => {
      if (f.type === 'vardiya') data[f.key] = currentV;
      else if (f.type === 'date') data[f.key] = today();
      else if (f.type === 'time') data[f.key] = currentSaat || nowTime();
      else data[f.key] = '';
    });
    setFormData(data);
  }, [formDef]);

  // Helper: fetch entries for a single date param across a date range and merge
  const fetchDateRange = useCallback(async (dateParam, startDate, endDate) => {
    let data = await formDef.listFn({ [dateParam]: startDate });
    data = Array.isArray(data) ? data : [];
    if (startDate !== endDate) {
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T00:00:00');
      const extraPromises = [];
      const d = new Date(start);
      d.setDate(d.getDate() + 1);
      while (d <= end) {
        const dateStr = toLocalDateStr(d);
        extraPromises.push(formDef.listFn({ [dateParam]: dateStr }).catch(() => []));
        d.setDate(d.getDate() + 1);
      }
      if (extraPromises.length > 0) {
        const extraResults = await Promise.all(extraPromises);
        const existingIds = new Set(data.map(e => e.id));
        extraResults.forEach(arr => {
          if (Array.isArray(arr)) {
            arr.forEach(item => {
              if (!existingIds.has(item.id)) { data.push(item); existingIds.add(item.id); }
            });
          }
        });
      }
    }
    return data;
  }, [formDef]);

  const loadEntries = useCallback(async () => {
    try {
      setError(null);
      const dateParam = hasTarihFilter
        ? formDef.filterParams.find(p => p === 'tarih' || p === 'sogutmaCikisTarihi' || p === 'uretimTarihi')
        : null;

      // DepoSevk: dolum uses sogutmaCikisTarihi, kolileme uses uretimTarihi
      // Fetch both date params in parallel and merge to get all records
      if (formKey === 'depoSevk') {
        const [bySogutma, byUretim] = await Promise.all([
          fetchDateRange('sogutmaCikisTarihi', filterStartDate, filterEndDate).catch(() => []),
          fetchDateRange('uretimTarihi', filterStartDate, filterEndDate).catch(() => []),
        ]);
        const merged = [...bySogutma];
        const existingIds = new Set(merged.map(e => e.id));
        byUretim.forEach(item => {
          if (!existingIds.has(item.id)) { merged.push(item); existingIds.add(item.id); }
        });
        setEntries(merged);
        return;
      }

      // Default: single date param fetch
      if (!dateParam) {
        let data = await formDef.listFn({});
        setEntries(Array.isArray(data) ? data : []);
        return;
      }
      const data = await fetchDateRange(dateParam, filterStartDate, filterEndDate);
      setEntries(data);
    } catch (err) {
      setError(err.message);
    }
  }, [formDef, formKey, filterStartDate, filterEndDate, hasTarihFilter, fetchDateRange]);

  useEffect(() => {
    setLoading(true);
    loadEntries().finally(() => setLoading(false));
  }, [loadEntries]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEntries().finally(() => setRefreshing(false));
  }, [loadEntries]);

  // Client-side filter for depoSevk: Dolum vs Kolileme by makinaKodu + vardiya
  const filteredEntries = useMemo(() => {
    let result = entries;
    if (formKey === 'depoSevk') {
      if (depoSevkFilter !== 'tumu') {
        result = result.filter(e => {
          const mk = (e.makinaKodu || e.MakinaKodu || '').toString().toUpperCase();
          if (depoSevkFilter === 'kolileme') return mk.startsWith('YCKL');
          return !mk.startsWith('YCKL');
        });
      }
      if (vardiyaFilter !== 'tumu') {
        result = result.filter(e => (e.vardiya || '').toUpperCase() === vardiyaFilter);
      }
    }
    return result;
  }, [entries, depoSevkFilter, vardiyaFilter, formKey]);

  const handleSave = async () => {
    // Validate required fields
    for (const f of formDef.fields) {
      if (f.required && (!formData[f.key] || formData[f.key] === '')) {
        Alert.alert('Eksik Alan', `${f.label} alanı zorunludur.`);
        return;
      }
    }

    // Build payload
    const payload = {};
    formDef.fields.forEach(f => {
      const val = formData[f.key];
      if (val === '' || val === undefined || val === null) {
        payload[f.key] = null;
      } else if (f.type === 'number') {
        const num = parseFloat(String(val).replace(',', '.'));
        payload[f.key] = isNaN(num) ? null : num;
      } else if (f.type === 'integer') {
        const num = parseInt(val, 10);
        payload[f.key] = isNaN(num) ? null : num;
      } else {
        payload[f.key] = val;
      }
    });

    setSaving(true);
    try {
      if (editingId) {
        await formDef.updateFn(editingId, payload);
      } else {
        await formDef.createFn(payload);
      }
      setShowForm(false);
      setEditingId(null);
      setShowFormTimePicker(false);
      setShowFormDatePicker(false);
      initFormData();
      await loadEntries();
      Alert.alert('Başarılı', editingId ? 'Kayıt güncellendi.' : 'Kayıt oluşturuldu.');
    } catch (err) {
      Alert.alert('Hata', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await formDef.deleteFn(id);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      Alert.alert('Hata', err.message);
    }
  };

  const handleEdit = (entry) => {
    const data = {};
    formDef.fields.forEach(f => {
      const val = entry[f.key];
      if (val !== null && val !== undefined) {
        if (f.type === 'date' && typeof val === 'string') data[f.key] = val.split('T')[0];
        else data[f.key] = String(val);
      } else {
        if (f.type === 'date') data[f.key] = '';
        else if (f.type === 'time') data[f.key] = '';
        else data[f.key] = '';
      }
    });
    setFormData(data);
    setEditingId(entry.id);
    setActiveTab(0);
    setShowForm(true);
  };

  if (!formDef) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>Form tanımı bulunamadı</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <SimpleIcon name="chevron-left" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={[styles.headerIcon, { backgroundColor: formDef.bgColor }]}>
          <Text style={{ fontSize: 18, color: formDef.color, fontWeight: '700' }}>
            {formDef.title.charAt(0)}
          </Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>{formDef.title}</Text>
          <Text style={styles.headerSubtitle}>
            {loading ? 'Yükleniyor...' : `${filteredEntries.length} kayıt`}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: formDef.color }, isReadOnly && { display: 'none' }]}
          onPress={() => {
            try {
              initFormData();
              setEditingId(null);
              setActiveTab(0);
              setShowForm(true);
            } catch (e) {
              Alert.alert('Hata', 'Form açılırken bir hata oluştu: ' + (e.message || String(e)));
              console.error('Form açılırken hata:', e);
            }
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>+ Yeni</Text>
        </TouchableOpacity>
      </View>

      {/* Date range filter bar */}
      {hasTarihFilter && (
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={styles.filterDateBtn}
            onPress={() => {
              setPendingFilterDate(new Date(filterStartDate + 'T00:00:00'));
              setShowFilterPicker('start');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.filterDateLabel}>Başlangıç</Text>
            <Text style={styles.filterDateText}>{formatTR(filterStartDate)}</Text>
          </TouchableOpacity>
          <SimpleIcon name="arrow-forward" size={16} color={Colors.textTertiary} />
          <TouchableOpacity
            style={styles.filterDateBtn}
            onPress={() => {
              setPendingFilterDate(new Date(filterEndDate + 'T00:00:00'));
              setShowFilterPicker('end');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.filterDateLabel}>Bitiş</Text>
            <Text style={styles.filterDateText}>{formatTR(filterEndDate)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterTodayBtn}
            onPress={() => { setFilterStartDate(today()); setFilterEndDate(today()); }}
            activeOpacity={0.7}
          >
            <Text style={styles.filterTodayText}>Bugün</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Depo Sevk type segment filter */}
      {formKey === 'depoSevk' && (
        <View style={styles.segmentBar}>
          {[{ key: 'tumu', label: 'Tümü' }, { key: 'dolum', label: 'Dolum' }, { key: 'kolileme', label: 'Kolileme' }].map(opt => {
            const active = depoSevkFilter === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.segmentBtn, active && { backgroundColor: formDef.color }]}
                onPress={() => setDepoSevkFilter(opt.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.segmentBtnText, active && { color: '#fff' }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Depo Sevk vardiya filter */}
      {formKey === 'depoSevk' && (
        <View style={styles.segmentBar}>
          {[{ key: 'tumu', label: 'Tüm Vardiya' }, { key: 'A', label: 'A', color: '#2563EB' }, { key: 'B', label: 'B', color: '#D97706' }, { key: 'C', label: 'C', color: '#7C3AED' }].map(opt => {
            const active = vardiyaFilter === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.segmentBtn, active && { backgroundColor: opt.color || formDef.color }]}
                onPress={() => setVardiyaFilter(opt.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.segmentBtnText, active && { color: '#fff' }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Filter date picker popup */}
      {showFilterPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={pendingFilterDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            if (event.type === 'dismissed' || !date) {
              setShowFilterPicker(null);
              return;
            }
            const sel = toLocalDateStr(date);
            if (showFilterPicker === 'start') {
              setFilterStartDate(sel);
              if (sel > filterEndDate) setFilterEndDate(sel);
            } else {
              setFilterEndDate(sel);
              if (sel < filterStartDate) setFilterStartDate(sel);
            }
            setShowFilterPicker(null);
          }}
        />
      )}
      {showFilterPicker && Platform.OS === 'ios' && (
        <Modal visible={true} transparent animationType="fade">
        <View style={styles.pickerPopupOverlay}>
          <View style={styles.pickerModalSheet}>
            <Text style={styles.datePickerTitle}>
              {showFilterPicker === 'start' ? 'Başlangıç Tarihi' : 'Bitiş Tarihi'}
            </Text>
            <DateTimePicker
              value={pendingFilterDate}
              mode="date"
              display="spinner"
              themeVariant="light"
              onChange={(e, d) => { if (d) setPendingFilterDate(d); }}
              locale="tr"
              style={{ height: 180 }}
            />
            <View style={styles.datePickerActions}>
              <TouchableOpacity
                style={styles.datePickerCancel}
                onPress={() => setShowFilterPicker(null)}
              >
                <Text style={styles.datePickerCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.datePickerConfirm, { backgroundColor: formDef.color }]}
                onPress={() => {
                  const sel = toLocalDateStr(pendingFilterDate);
                  if (showFilterPicker === 'start') {
                    setFilterStartDate(sel);
                    if (sel > filterEndDate) setFilterEndDate(sel);
                  } else {
                    setFilterEndDate(sel);
                    if (sel < filterStartDate) setFilterStartDate(sel);
                  }
                  setShowFilterPicker(null);
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
        <View style={styles.center}>
          <ActivityIndicator size="large" color={formDef.color} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
            <Text style={styles.retryBtnText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : filteredEntries.length === 0 ? (
        <View style={[styles.center, { flex: 1 }]}>  
          <Text style={styles.emptyText}>Henüz kayıt yok</Text>
          {!isReadOnly && <Text style={styles.emptySubtext}>Yeni kayıt eklemek için "+ Yeni" butonuna basın</Text>}
        </View>
      ) : (
        <>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={styles.cellId}><Text style={styles.thText}>ID</Text></View>
            <View style={styles.cellField1}><Text style={styles.thText}>Alan 1</Text></View>
            <View style={styles.cellField2}><Text style={styles.thText}>Alan 2</Text></View>
            <View style={styles.cellActions}><Text style={styles.thText}>Tarih</Text></View>
          </View>
          <FlatList
            data={filteredEntries}
            keyExtractor={(item, idx) => String(item.id ?? idx)}
            renderItem={({ item, index }) => (
              <EntryCard
                entry={item}
                fields={formDef.fields}
                formDef={formDef}
                onDelete={handleDelete}
                onEdit={handleEdit}
                readOnly={isReadOnly}
                index={index}
              />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={formDef.color} />}
          />
        </>
      )}

      {/* New Entry Modal */}
      <Modal visible={showForm} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bgWhite }}>
              <View style={styles.modalHeader}>
            <View style={styles.modalHeaderTop}>
              <Text style={styles.modalTitle}>{editingId ? 'Düzenle' : 'Yeni Kayıt'}</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => { setShowForm(false); setEditingId(null); setActiveTab(0); setShowFormTimePicker(false); setShowFormDatePicker(false); setPastDateMode(false); }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            {/* Past date toggle */}
            {!editingId && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
                onPress={() => {
                  const next = !pastDateMode;
                  setPastDateMode(next);
                  if (!next) {
                    // Reset to auto values
                    const currentV = getCurrentVardiya();
                    const currentSaat = getVardiyaSaat(currentV);
                    setFormData(prev => {
                      const updated = { ...prev };
                      formDef.fields.forEach(f => {
                        if (f.type === 'vardiya') updated[f.key] = currentV;
                        else if (f.type === 'date') updated[f.key] = today();
                        else if (f.type === 'time') updated[f.key] = currentSaat || nowTime();
                      });
                      return updated;
                    });
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={{ width: 40, height: 22, borderRadius: 11, backgroundColor: pastDateMode ? formDef.color : '#D1D5DB', justifyContent: 'center', paddingHorizontal: 2 }}>
                  <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', alignSelf: pastDateMode ? 'flex-end' : 'flex-start' }} />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: pastDateMode ? formDef.color : Colors.textSecondary }}>
                  Geçmişe Yönelik Kayıt
                </Text>
              </TouchableOpacity>
            )}
            {formDef.sections && (
              <SectionTabBar
                sections={formDef.sections}
                activeTab={activeTab}
                onChangeTab={setActiveTab}
                formColor={formDef.color}
              />
            )}
          </View>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.formScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {formDef.sections ? (
                // Sectioned form: show only fields for active tab
                (() => {
                  const section = formDef.sections[activeTab];
                  const sectionFields = section.fieldKeys
                    .map(key => formDef.fields.find(f => f.key === key))
                    .filter(Boolean);
                  // Render fields in pairs (2-column grid) for numeric/text fields
                  const pairs = [];
                  let i = 0;
                  while (i < sectionFields.length) {
                    const f1 = sectionFields[i];
                    const f2 = sectionFields[i + 1];
                    // Full-width for vardiya, uygunluk, or single remaining field
                    if (f1.type === 'vardiya' || f1.type === 'uygunluk' || !f2) {
                      pairs.push([f1]);
                      i += 1;
                    } else {
                      pairs.push([f1, f2]);
                      i += 2;
                    }
                  }
                  return pairs.map((pair, pIdx) => (
                    <View key={pIdx} style={pair.length === 2 ? styles.fieldRow : undefined}>
                      {pair.map(field => (
                        <View key={field.key} style={pair.length === 2 ? styles.fieldHalf : undefined}>
                          <FormField
                            field={field}
                            value={formData[field.key]}
                            onChange={(val) => {
                              setFormData(prev => ({ ...prev, [field.key]: val }));
                            }}
                            onDatePress={(key, val) => {
                              setFormDateField(key);
                              setPendingFormDate(val ? new Date(val + 'T00:00:00') : new Date());
                              setShowFormDatePicker(true);
                            }}
                            onTimePress={(key, val) => {
                              setFormTimeField(key);
                              const now = new Date();
                              if (val) {
                                const parts = val.split(':');
                                now.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
                              }
                              setPendingFormTime(now);
                              setShowFormTimePicker(true);
                            }}
                            onVardiyaPress={() => setShowVardiyaPicker(true)}
                            formColor={formDef.color}
                            pastDateMode={pastDateMode || !!editingId}
                          />
                        </View>
                      ))}
                    </View>
                  ));
                })()
              ) : (
                // Flat form (no sections): render all fields sequentially
                formDef.fields.map(field => (
                  <FormField
                    key={field.key}
                    field={field}
                    value={formData[field.key]}
                    onChange={(val) => {
                      setFormData(prev => ({ ...prev, [field.key]: val }));
                    }}
                    onDatePress={(key, val) => {
                      setFormDateField(key);
                      setPendingFormDate(val ? new Date(val + 'T00:00:00') : new Date());
                      setShowFormDatePicker(true);
                    }}
                    onTimePress={(key, val) => {
                      setFormTimeField(key);
                      const now = new Date();
                      if (val) {
                        const parts = val.split(':');
                        now.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
                      }
                      setPendingFormTime(now);
                      setShowFormTimePicker(true);
                    }}
                    onVardiyaPress={() => setShowVardiyaPicker(true)}
                    formColor={formDef.color}
                    pastDateMode={pastDateMode || !!editingId}
                  />
                ))
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Bottom navigation buttons */}
          {formDef.sections ? (
            <View style={styles.bottomNav}>
              <TouchableOpacity
                style={styles.bottomNavBtnOutline}
                onPress={() => { setShowForm(false); setEditingId(null); setActiveTab(0); setShowFormTimePicker(false); setShowFormDatePicker(false); setPastDateMode(false); }}
                activeOpacity={0.7}
              >
                <Text style={styles.bottomNavBtnOutlineText}>İptal</Text>
              </TouchableOpacity>
              {activeTab > 0 && (
                <TouchableOpacity
                  style={styles.bottomNavBtnOutline}
                  onPress={() => setActiveTab(prev => prev - 1)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bottomNavBtnOutlineText}>Geri</Text>
                </TouchableOpacity>
              )}
              {activeTab < formDef.sections.length - 1 ? (
                <TouchableOpacity
                  style={[styles.bottomNavBtnFilled, { backgroundColor: formDef.color }]}
                  onPress={() => setActiveTab(prev => prev + 1)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.bottomNavBtnFilledText}>İleri</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.bottomNavBtnFilled, { backgroundColor: formDef.color }, saving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.bottomNavBtnFilledText}>Kaydet</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.bottomNav}>
              <TouchableOpacity
                style={styles.bottomNavBtnOutline}
                onPress={() => { setShowForm(false); setEditingId(null); setShowFormTimePicker(false); setShowFormDatePicker(false); setPastDateMode(false); }}
                activeOpacity={0.7}
              >
                <Text style={styles.bottomNavBtnOutlineText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bottomNavBtnFilled, { backgroundColor: formDef.color }, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.bottomNavBtnFilledText}>Kaydet</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Date Picker Overlay — inside form modal */}
          {showFormDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={pendingFormDate}
              mode="date"
              display="default"
              onChange={(event, date) => {
                if (event.type === 'dismissed' || !date) {
                  setShowFormDatePicker(false);
                  return;
                }
                setFormData(prev => ({ ...prev, [formDateField]: toLocalDateStr(date) }));
                setShowFormDatePicker(false);
              }}
            />
          )}
          {showFormDatePicker && Platform.OS === 'ios' && (
            <Modal visible={true} transparent animationType="fade">
            <View style={styles.inModalPickerOverlay}>
              <View style={styles.pickerModalSheet}>
                <Text style={styles.datePickerTitle}>Tarih Seçin</Text>
                <DateTimePicker
                  value={pendingFormDate}
                  mode="date"
                  display="spinner"
                  themeVariant="light"
                  onChange={(e, d) => { if (d) setPendingFormDate(d); }}
                  locale="tr"
                  style={{ height: 180 }}
                />
                <View style={styles.datePickerActions}>
                  <TouchableOpacity
                    style={styles.datePickerCancel}
                    onPress={() => setShowFormDatePicker(false)}
                  >
                    <Text style={styles.datePickerCancelText}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.datePickerConfirm, { backgroundColor: formDef.color }]}
                    onPress={() => {
                      const sel = toLocalDateStr(pendingFormDate);
                      setFormData(prev => ({ ...prev, [formDateField]: sel }));
                      setShowFormDatePicker(false);
                    }}
                  >
                    <Text style={styles.datePickerConfirmText}>Seç</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            </Modal>
          )}

          {/* Time Picker Overlay — inside form modal */}
          {showFormTimePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={pendingFormTime}
              mode="time"
              display="default"
              is24Hour={true}
              onChange={(event, date) => {
                if (event.type === 'dismissed' || !date) {
                  setShowFormTimePicker(false);
                  return;
                }
                const hh = String(date.getHours()).padStart(2, '0');
                const mm = String(date.getMinutes()).padStart(2, '0');
                setFormData(prev => ({ ...prev, [formTimeField]: `${hh}:${mm}:00` }));
                setShowFormTimePicker(false);
              }}
            />
          )}
          {showFormTimePicker && Platform.OS === 'ios' && (
            <Modal visible={true} transparent animationType="fade">
            <View style={styles.inModalPickerOverlay}>
              <View style={styles.pickerModalSheet}>
                <Text style={styles.datePickerTitle}>Saat Seçin</Text>
                <DateTimePicker
                  value={pendingFormTime}
                  mode="time"
                  display="spinner"
                  themeVariant="light"
                  is24Hour={true}
                  locale="tr"
                  onChange={(e, d) => { if (d) setPendingFormTime(d); }}
                  style={{ height: 180 }}
                />
                <View style={styles.datePickerActions}>
                  <TouchableOpacity
                    style={styles.datePickerCancel}
                    onPress={() => setShowFormTimePicker(false)}
                  >
                    <Text style={styles.datePickerCancelText}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.datePickerConfirm, { backgroundColor: formDef.color }]}
                    onPress={() => {
                      const hh = String(pendingFormTime.getHours()).padStart(2, '0');
                      const mm = String(pendingFormTime.getMinutes()).padStart(2, '0');
                      setFormData(prev => ({ ...prev, [formTimeField]: `${hh}:${mm}:00` }));
                      setShowFormTimePicker(false);
                    }}
                  >
                    <Text style={styles.datePickerConfirmText}>Seç</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            </Modal>
          )}

          {/* Vardiya Picker Modal */}
          {showVardiyaPicker && (
            <Modal visible={true} transparent animationType="fade">
              <View style={styles.inModalPickerOverlay}>
                <View style={styles.pickerModalSheet}>
                  <Text style={styles.datePickerTitle}>Vardiya Seçin</Text>
                  {VARDIYA_OPTIONS.map(opt => {
                    const def = VARDIYA_DEFS[opt.key];
                    const isSelected = formData.vardiya === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, marginVertical: 4, backgroundColor: isSelected ? (def?.bgColor || '#F3F4F6') : '#fff', borderWidth: 1, borderColor: isSelected ? (def?.color || '#ccc') : '#E5E7EB' }}
                        onPress={() => {
                          const saat = getVardiyaSaat(opt.key);
                          setFormData(prev => ({ ...prev, vardiya: opt.key, ...(prev.saat !== undefined ? { saat: saat || prev.saat } : {}) }));
                          setShowVardiyaPicker(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: def?.color || '#6B7280', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{opt.key}</Text>
                        </View>
                        <View>
                          <Text style={{ fontSize: 15, fontWeight: '600', color: def?.color || '#1F2937' }}>Vardiya {opt.key}</Text>
                          <Text style={{ fontSize: 12, color: '#6B7280' }}>{def?.baslangic} – {def?.bitis}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={[styles.datePickerCancel, { marginTop: 12, alignSelf: 'center' }]}
                    onPress={() => setShowVardiyaPicker(false)}
                  >
                    <Text style={styles.datePickerCancelText}>İptal</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgApp },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bgWhite,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  backBtnText: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: -2,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, marginLeft: Spacing.md },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  headerSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  addBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Filter bar
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgWhite,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
    gap: 0,
  },
  filterDateBtn: {
    flex: 1,
    backgroundColor: Colors.bgSurface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.borderColor,
  },
  filterDateLabel: { fontSize: 9, fontWeight: '600', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 1 },
  filterDateText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  filterDateSep: { fontSize: 14, color: Colors.textTertiary, marginHorizontal: 4 },
  filterTodayBtn: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.brandPrimaryLight,
  },
  filterTodayText: { fontSize: 13, fontWeight: '600', color: Colors.brandPrimary },

  // Segment filter bar (Dolum / Kolileme)
  segmentBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    backgroundColor: Colors.bgWhite,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    alignItems: 'center',
    backgroundColor: Colors.bgSurface,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  // Date picker popup overlay
  pickerPopupOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 999,
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  datePickerCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgSurface,
    alignItems: 'center',
  },
  datePickerCancelText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  datePickerConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  datePickerConfirmText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  datePickerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', paddingVertical: Spacing.sm },
  formDatePickerWrap: { backgroundColor: Colors.bgSurface, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.sm },
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

  // List
  list: { paddingBottom: 80 },

  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.bgSurface,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  thText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.bgWhite,
  },
  tableRowEven: { backgroundColor: Colors.bgSurface },
  tableRowExpanded: { backgroundColor: '#F0F8FF' },
  tableRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cellId: { flex: 1.2, justifyContent: 'center' },
  cellIdText: { fontSize: 13, fontWeight: '700' },
  cellVardiya: { fontSize: 10, fontWeight: '600', color: Colors.textTertiary, marginTop: 2 },
  cellField1: { flex: 3, justifyContent: 'center', paddingHorizontal: 4 },
  cellField2: { flex: 3, justifyContent: 'center', paddingHorizontal: 4 },
  cellLabel: { fontSize: 9, fontWeight: '600', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.3 },
  cellValue: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  cellActions: { flex: 2, alignItems: 'flex-end', justifyContent: 'center' },
  cellDateText: { fontSize: 11, color: Colors.textTertiary, marginBottom: 4 },
  actionRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },

  // Expanded detail
  expandedBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
    gap: 8,
  },
  expandedField: {
    minWidth: '45%',
    flex: 1,
    paddingVertical: 4,
  },
  expandedFieldLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  expandedFieldValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // Form modal overlay
  formModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formModalContainer: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.lg,
    width: '94%',
    maxHeight: '92%',
    overflow: 'hidden',
    ...Shadows.lg,
  },

  // Empty
  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, color: Colors.textTertiary, marginTop: 4 },

  // Error
  errorText: { fontSize: 14, color: Colors.danger, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: Colors.brandPrimary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: Radius.sm },
  retryBtnText: { color: '#fff', fontWeight: '600' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.bgApp },
  modalHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.bgWhite,
    borderBottomWidth: 0,
  },
  modalHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  formScroll: { padding: Spacing.lg },

  // Form fields
  fieldWrap: { marginBottom: Spacing.lg },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  fieldLabelUpper: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6, letterSpacing: 0.3, textTransform: 'uppercase' },
  input: {
    backgroundColor: Colors.bgSurface,
    borderWidth: 0,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  inputText: { fontSize: 15, color: Colors.textPrimary },
  placeholderText: { fontSize: 15, color: Colors.textTertiary },
  inputDisabled: { backgroundColor: Colors.bgSurface },

  // Field grid
  fieldRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  fieldHalf: {
    flex: 1,
  },

  // Tab bar
  tabBarContainer: {
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
    marginTop: Spacing.sm,
  },
  tabBarScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xl,
  },
  tabItem: {
    paddingVertical: Spacing.sm,
    position: 'relative',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textTertiary,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    borderRadius: 2,
  },

  // Uygunluk selector
  uygunlukRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  uygunlukBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgSurface,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uygunlukBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  // Bottom navigation
  bottomNav: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xxl : Spacing.md,
    backgroundColor: Colors.bgWhite,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
    justifyContent: 'flex-end',
  },
  bottomNavBtnOutline: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNavBtnOutlineText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  bottomNavBtnFilled: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  bottomNavBtnFilledText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // Vardiya selector
  vardiyaBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: Radius.sm, borderWidth: 1.5, borderColor: Colors.borderColor,
  },
  vardiyaBadge: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.textTertiary,
  },
  vardiyaBadgeText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  vardiyaBannerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  vardiyaBannerTime: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginTop: 1 },
});
