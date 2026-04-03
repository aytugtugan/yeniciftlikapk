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

const today = () => new Date().toISOString().split('T')[0];
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

function VardiyaSelector({ value }) {
  const def = value ? VARDIYA_DEFS[value] : null;
  return (
    <View style={[styles.vardiyaBanner, def && { borderColor: def.color, backgroundColor: def.bgColor }]}>
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
        <Text style={{ fontSize: 9, fontWeight: '700', color: def?.color || Colors.textTertiary }}>OTOMATİK</Text>
      </View>
    </View>
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

function FormField({ field, value, onChange, onDatePress, onTimePress, formColor }) {
  if (field.type === 'vardiya') {
    return (
      <View style={styles.fieldWrap}>
        <Text style={styles.fieldLabelUpper}>
          {field.label.toUpperCase()}{field.required ? '' : ''} <Text style={{fontSize: 10, color: Colors.textTertiary}}>(OTOMATİK)</Text>
        </Text>
        <VardiyaSelector value={value || ''} />
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
        <View style={[styles.input, styles.inputDisabled]}>
          <Text style={value ? styles.inputText : styles.placeholderText}>
            {value ? formatTR(value) : 'Tarih seçin'}
          </Text>
        </View>
      </View>
    );
  }

  if (field.type === 'time') {
    return (
      <View style={styles.fieldWrap}>
        <Text style={styles.fieldLabelUpper}>{field.label.toUpperCase()}</Text>
        <View style={[styles.input, styles.inputDisabled]}>
          <Text style={value ? styles.inputText : styles.placeholderText}>
            {value || 'HH:mm:ss'}
          </Text>
        </View>
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

function EntryCard({ entry, fields, formDef, onDelete, onEdit, readOnly }) {
  const [expanded, setExpanded] = useState(false);
  const filledFields = fields.filter(f => {
    const val = entry[f.key];
    return val !== null && val !== undefined && val !== '';
  });
  const visibleFields = expanded ? filledFields : filledFields.slice(0, 4);
  const hasMore = filledFields.length > 4;

  return (
    <TouchableOpacity
      style={styles.entryCard}
      activeOpacity={0.7}
      onPress={() => setExpanded(!expanded)}
    >
      <View style={styles.entryHeader}>
        <View style={[styles.entryIdBadge, { backgroundColor: formDef.bgColor }]}>
          <Text style={[styles.entryIdText, { color: formDef.color }]}>#{entry.id}</Text>
        </View>
        {entry.vardiya && (
          <View style={styles.vardiyaBadge}>
            <Text style={styles.vardiyaBadgeText}>{entry.vardiya}</Text>
          </View>
        )}
        {!readOnly && (
          <>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => onEdit(entry)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View><SimpleIcon name="edit" size={16} color={Colors.brandPrimary} /></View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => {
                Alert.alert('Sil', `#${entry.id} kaydını silmek istediğinize emin misiniz?`, [
                  { text: 'İptal', style: 'cancel' },
                  { text: 'Sil', style: 'destructive', onPress: () => onDelete(entry.id) },
                ]);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View><SimpleIcon name="close" size={16} color={Colors.danger} /></View>
            </TouchableOpacity>
          </>
        )}
      </View>
      <View style={styles.entryBody}>
        {visibleFields.map(f => (
          <View key={f.key} style={styles.entryField}>
            <Text style={styles.entryFieldLabel}>{f.label}</Text>
            <Text style={styles.entryFieldValue}>{String(entry[f.key])}</Text>
          </View>
        ))}
      </View>
      {hasMore && (
        <View style={styles.expandRow}>
          <Text style={[styles.expandText, { color: formDef.color }]}>
            {expanded ? (<View style={{flexDirection:'row',alignItems:'center',gap:4}}><SimpleIcon name="expand-less" size={14} color={formDef.color} /><Text style={{color:formDef.color,fontSize:13,fontWeight:'600'}}>Daralt</Text></View>) : (<View style={{flexDirection:'row',alignItems:'center',gap:4}}><Text style={{color:formDef.color,fontSize:13,fontWeight:'600'}}>Tümünü Göster ({filledFields.length} alan)</Text><SimpleIcon name="expand-more" size={14} color={formDef.color} /></View>)}
          </Text>
        </View>
      )}
      {entry.tarih && (
        <View style={styles.entryFooter}>
          <Text style={styles.entryDate}>{formatTR(entry.tarih.split('T')[0])}{entry.saat ? ` ${entry.saat}` : ''}</Text>
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
        const dateStr = d.toISOString().split('T')[0];
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

  // Client-side filter for depoSevk: Dolum vs Kolileme by makinaKodu
  const filteredEntries = useMemo(() => {
    if (formKey !== 'depoSevk' || depoSevkFilter === 'tumu') return entries;
    return entries.filter(e => {
      const mk = (e.makinaKodu || e.MakinaKodu || '').toString().toUpperCase();
      if (depoSevkFilter === 'kolileme') return mk.startsWith('YCKL');
      return !mk.startsWith('YCKL'); // dolum (includes empty, YCD1, etc.)
    });
  }, [entries, depoSevkFilter, formKey]);

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
          onPress={() => { initFormData(); setEditingId(null); setActiveTab(0); setShowForm(true); }}
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
            const sel = date.toISOString().split('T')[0];
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
                  const sel = pendingFilterDate.toISOString().split('T')[0];
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
        <FlatList
          data={filteredEntries}
          keyExtractor={(item, idx) => String(item.id ?? idx)}
          renderItem={({ item }) => (
            <EntryCard
              entry={item}
              fields={formDef.fields}
              formDef={formDef}
              onDelete={handleDelete}
              onEdit={handleEdit}
              readOnly={isReadOnly}
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
      )}

      {/* New Entry Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderTop}>
              <Text style={styles.modalTitle}>{editingId ? 'Düzenle' : 'Yeni Kayıt'}</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => { setShowForm(false); setEditingId(null); setActiveTab(0); setShowFormTimePicker(false); setShowFormDatePicker(false); }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
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
                            formColor={formDef.color}
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
                    formColor={formDef.color}
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
                onPress={() => { setShowForm(false); setEditingId(null); setActiveTab(0); setShowFormTimePicker(false); setShowFormDatePicker(false); }}
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
                onPress={() => { setShowForm(false); setEditingId(null); setShowFormTimePicker(false); setShowFormDatePicker(false); }}
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
                setFormData(prev => ({ ...prev, [formDateField]: date.toISOString().split('T')[0] }));
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
                      const sel = pendingFormDate.toISOString().split('T')[0];
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
  list: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 80 },

  // Entry card
  entryCard: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  entryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  entryIdBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.xs,
  },
  entryIdText: { fontSize: 12, fontWeight: '700' },
  vardiyaBadge: {
    marginLeft: 8,
    backgroundColor: Colors.brandPrimaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  vardiyaBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.brandPrimary },
  editBtn: { marginLeft: 'auto', padding: 4 },
  editBtnText: { fontSize: 16, color: Colors.brandPrimary, fontWeight: '600' },
  deleteBtn: { marginLeft: 8, padding: 4 },
  deleteBtnText: { fontSize: 16, color: Colors.danger, fontWeight: '600' },
  entryBody: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  entryField: { minWidth: '40%' },
  entryFieldLabel: { fontSize: 11, color: Colors.textSecondary, marginBottom: 1 },
  entryFieldValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  expandRow: { alignItems: 'center', marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 0.5, borderTopColor: Colors.borderLight },
  expandText: { fontSize: 13, fontWeight: '600' },
  entryFooter: { marginTop: Spacing.sm, borderTopWidth: 0.5, borderTopColor: Colors.borderLight, paddingTop: Spacing.sm },
  entryDate: { fontSize: 11, color: Colors.textTertiary },

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
