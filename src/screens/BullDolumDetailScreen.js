import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Spacing, Radius, Shadows } from '../theme';
import SimpleIcon from '../components/SimpleIcon';
import {
  deleteDolumBull,
  deleteBullBrix,
  deleteDolumBrix,
  updateBullBrix,
  updateDolumBrix,
} from '../api/formsApi';

const PURPLE = '#7C3AED';
const BLUE = '#0095F6';

const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const formatTR = (dateStr) => {
  if (!dateStr) return '';
  const d = dateStr.split('T')[0];
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${TR_MONTHS[parseInt(m) - 1]} ${y}`;
};

// ── Field defs for edit modal ────────────────────────────────
const BULL_EDIT_FIELDS = [
  { key: 'bullNo', label: 'Bull No', type: 'text' },
  { key: 'sicaklik', label: 'Sıcaklık (°C)', type: 'number' },
  { key: 'bullBrixDegeri', label: 'Bull Brix Değeri', type: 'number' },
  { key: 'bullKKontrolBrix', label: 'K.Kontrol Brix', type: 'number' },
  { key: 'renk', label: 'Renk', type: 'text' },
  { key: 'vardiya', label: 'Vardiya', type: 'vardiya' },
];
const DOLUM_EDIT_FIELDS = [
  { key: 'dolumBrixDegeri', label: 'Dolum Brix Değeri', type: 'number' },
  { key: 'kKontrolBrix', label: 'K.Kontrol Brix', type: 'number' },
  { key: 'renk', label: 'Renk', type: 'text' },
  { key: 'vardiya', label: 'Vardiya', type: 'vardiya' },
];

// ── Field row component ──────────────────────────────────────
function FieldRow({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <View style={s.fieldRow}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={s.fieldValue}>{String(value)}</Text>
    </View>
  );
}

export default function BullDolumDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [group, setGroup] = useState(route.params?.group);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editType, setEditType] = useState(null);
  const [editData, setEditData] = useState({});
  const [editItemId, setEditItemId] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!group) {
    return (
      <SafeAreaView style={s.container}>
        <Text style={{ textAlign: 'center', marginTop: 40, color: Colors.textSecondary }}>Kayıt bulunamadı</Text>
      </SafeAreaView>
    );
  }

  const { dolum, bulls, linkIds } = group;

  const handleEditItem = (type, item) => {
    setEditType(type);
    setEditItemId(item.id);
    const fields = type === 'bull' ? BULL_EDIT_FIELDS : DOLUM_EDIT_FIELDS;
    const data = {};
    fields.forEach(f => {
      const val = item[f.key];
      data[f.key] = (val !== null && val !== undefined) ? String(val) : '';
    });
    setEditData(data);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    setEditSaving(true);
    try {
      const fields = editType === 'bull' ? BULL_EDIT_FIELDS : DOLUM_EDIT_FIELDS;
      const payload = {};
      fields.forEach(f => {
        const val = editData[f.key];
        if (val === '' || val === undefined || val === null) { payload[f.key] = null; }
        else if (f.type === 'number') {
          const num = parseFloat(String(val).replace(',', '.'));
          payload[f.key] = isNaN(num) ? null : num;
        } else { payload[f.key] = val; }
      });
      if (editType === 'bull') {
        const updated = await updateBullBrix(editItemId, payload);
        setGroup(prev => ({
          ...prev,
          bulls: prev.bulls.map(b => b.id === editItemId ? { ...b, ...updated } : b),
        }));
      } else {
        const updated = await updateDolumBrix(editItemId, payload);
        setGroup(prev => ({ ...prev, dolum: { ...prev.dolum, ...updated } }));
      }
      setEditModalVisible(false);
    } catch (err) {
      Alert.alert('Hata', err.message);
    } finally { setEditSaving(false); }
  };

  const handleDeleteBull = (bull) => {
    Alert.alert('Bull Sil', 'Bu bull kaydını silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive', onPress: async () => {
          try {
            await deleteBullBrix(bull.id);
            setGroup(prev => ({
              ...prev,
              bulls: prev.bulls.filter(b => b.id !== bull.id),
            }));
          } catch (err) { Alert.alert('Hata', err.message); }
        },
      },
    ]);
  };

  const handleDeleteGroup = () => {
    Alert.alert('Grubu Sil', 'Tüm dolum ve bull kayıtlarını silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Hepsini Sil', style: 'destructive', onPress: async () => {
          setDeleting(true);
          try {
            for (const linkId of linkIds) { await deleteDolumBull(linkId); }
            if (group.dolumId) { await deleteDolumBrix(group.dolumId).catch(() => {}); }
            for (const bull of bulls) { if (bull.id) await deleteBullBrix(bull.id).catch(() => {}); }
            navigation.goBack();
          } catch (err) {
            Alert.alert('Hata', err.message);
          } finally { setDeleting(false); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <SimpleIcon name="chevron-left" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerTextWrap}>
          <Text style={s.headerTitle}>Dolum #{dolum?.id || '?'}</Text>
          <Text style={s.headerSubtitle}>{bulls.length} Bull · {dolum?.tarih ? formatTR(dolum.tarih) : ''}</Text>
        </View>
        <TouchableOpacity
          style={s.deleteGroupBtn}
          onPress={handleDeleteGroup}
          disabled={deleting}
          activeOpacity={0.7}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={Colors.danger} />
          ) : (
            <Text style={s.deleteGroupBtnText}>Sil</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Dolum Card */}
        {dolum && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.cardIcon, { backgroundColor: '#E8F4FD' }]}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: BLUE }}>D</Text>
              </View>
              <Text style={[s.cardTitle, { color: BLUE }]}>Dolum Brix</Text>
              <TouchableOpacity style={s.editBtn} onPress={() => handleEditItem('dolum', dolum)} activeOpacity={0.7}>
                <Text style={s.editBtnText}>Düzenle</Text>
              </TouchableOpacity>
            </View>
            <View style={s.cardBody}>
              <FieldRow label="Dolum Brix Değeri" value={dolum.dolumBrixDegeri} />
              <FieldRow label="K.Kontrol Brix" value={dolum.kKontrolBrix} />
              <FieldRow label="Renk" value={dolum.renk} />
              <FieldRow label="Vardiya" value={dolum.vardiya} />
              <FieldRow label="Saat" value={dolum.saat} />
              <FieldRow label="Tarih" value={dolum.tarih ? formatTR(dolum.tarih) : null} />
            </View>
          </View>
        )}

        {/* Bull Cards */}
        {bulls.map((bull, idx) => (
          <View key={bull.id || idx} style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.cardIcon, { backgroundColor: '#F3E8FF' }]}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: PURPLE }}>{idx + 1}</Text>
              </View>
              <Text style={[s.cardTitle, { color: PURPLE }]}>
                Bull {idx + 1}{bull.bullNo ? ` — ${bull.bullNo}` : ''}
              </Text>
              <TouchableOpacity style={s.editBtn} onPress={() => handleEditItem('bull', bull)} activeOpacity={0.7}>
                <Text style={s.editBtnText}>Düzenle</Text>
              </TouchableOpacity>
            </View>
            <View style={s.cardBody}>
              <FieldRow label="Bull No" value={bull.bullNo} />
              <FieldRow label="Sıcaklık" value={bull.sicaklik != null ? `${bull.sicaklik}°C` : null} />
              <FieldRow label="Bull Brix Değeri" value={bull.bullBrixDegeri} />
              <FieldRow label="K.Kontrol Brix" value={bull.bullKKontrolBrix} />
              <FieldRow label="Renk" value={bull.renk} />
              <FieldRow label="Vardiya" value={bull.vardiya} />
              <FieldRow label="Saat" value={bull.saat} />
              <FieldRow label="Tarih" value={bull.tarih ? formatTR(bull.tarih) : null} />
            </View>
            <TouchableOpacity style={s.deleteBullBtn} onPress={() => handleDeleteBull(bull)} activeOpacity={0.7}>
              <Text style={s.deleteBullBtnText}>Bu Bull Kaydını Sil</Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bgApp }}>
          <View style={s.modalHeader}>
            <TouchableOpacity style={s.modalCancelBtn} onPress={() => setEditModalVisible(false)} activeOpacity={0.7}>
              <Text style={s.modalCancelText}>İptal</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>
              {editType === 'bull' ? 'Bull Düzenle' : 'Dolum Düzenle'}
            </Text>
            <TouchableOpacity
              style={[s.modalSaveBtn, editSaving && { opacity: 0.6 }]}
              onPress={handleSaveEdit}
              disabled={editSaving}
              activeOpacity={0.8}
            >
              {editSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.modalSaveText}>Kaydet</Text>
              )}
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={{ padding: Spacing.lg }} keyboardShouldPersistTaps="handled">
              {(editType === 'bull' ? BULL_EDIT_FIELDS : DOLUM_EDIT_FIELDS).map(f => {
                if (f.type === 'vardiya') {
                  return (
                    <View key={f.key} style={s.editFieldWrap}>
                      <Text style={s.editFieldLabel}>{f.label}</Text>
                      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                        {['A', 'B', 'C'].map(v => (
                          <View
                            key={v}
                            style={[s.vardiyaBtn, editData[f.key] === v && s.vardiyaBtnActive]}
                          >
                            <Text style={[s.vardiyaText, editData[f.key] === v && s.vardiyaTextActive]}>{v}</Text>
                            {editData[f.key] === v && (
                              <Text style={{ fontSize: 8, fontWeight: '700', color: Colors.textTertiary, marginTop: 2 }}>OTOMATİK</Text>
                            )}
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                }
                return (
                  <View key={f.key} style={s.editFieldWrap}>
                    <Text style={s.editFieldLabel}>{f.label}</Text>
                    <TextInput
                      style={s.editInput}
                      value={editData[f.key] || ''}
                      onChangeText={t => {
                        if (f.type === 'number') {
                          setEditData(prev => ({ ...prev, [f.key]: t.replace(/[^0-9.,-]/g, '') }));
                        } else {
                          setEditData(prev => ({ ...prev, [f.key]: t }));
                        }
                      }}
                      keyboardType={f.type === 'number' ? 'decimal-pad' : 'default'}
                      placeholder={f.type === 'number' ? '0' : ''}
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>
                );
              })}
              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgApp },

  // Header
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
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  headerSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  deleteGroupBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.sm,
    backgroundColor: '#FEE2E2',
  },
  deleteGroupBtnText: { fontSize: 14, fontWeight: '700', color: Colors.danger },

  content: { padding: Spacing.lg },

  // Detail card
  card: {
    backgroundColor: Colors.bgWhite, borderRadius: Radius.md,
    marginBottom: Spacing.md, ...Shadows.sm, overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  cardIcon: {
    width: 32, height: 32, borderRadius: Radius.sm,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  editBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm,
    backgroundColor: Colors.bgSurface, borderWidth: 1, borderColor: Colors.borderColor,
  },
  editBtnText: { fontSize: 13, fontWeight: '600', color: Colors.brandPrimary },
  cardBody: { padding: Spacing.lg },

  // Field row
  fieldRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  fieldLabel: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  fieldValue: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },

  // Delete bull
  deleteBullBtn: {
    paddingVertical: 12, alignItems: 'center',
    borderTopWidth: 0.5, borderTopColor: Colors.borderLight,
    backgroundColor: '#FFF5F5',
  },
  deleteBullBtnText: { fontSize: 13, fontWeight: '600', color: Colors.danger },

  // Edit modal
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.bgWhite, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  modalCancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.sm, backgroundColor: Colors.bgSurface },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  modalSaveBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: Radius.sm, backgroundColor: PURPLE, minWidth: 80, alignItems: 'center' },
  modalSaveText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  editFieldWrap: { marginBottom: Spacing.lg },
  editFieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  editInput: {
    backgroundColor: Colors.bgWhite, borderWidth: 1, borderColor: Colors.borderColor,
    borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary,
  },
  vardiyaBtn: {
    flex: 1, paddingVertical: 10, borderRadius: Radius.sm,
    borderWidth: 1.5, borderColor: Colors.borderColor, alignItems: 'center',
  },
  vardiyaBtnActive: { borderColor: Colors.brandPrimary, backgroundColor: Colors.brandPrimaryLight },
  vardiyaText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  vardiyaTextActive: { color: Colors.brandPrimary },
});
