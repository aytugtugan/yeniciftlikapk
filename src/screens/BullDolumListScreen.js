import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Radius, Shadows } from '../theme';
import SimpleIcon from '../components/SimpleIcon';
import {
  getDolumBullList,
  getBullBrixById,
  getDolumBrixById,
  deleteDolumBull,
  deleteBullBrix,
  deleteDolumBrix,
} from '../api/formsApi';
import DateTimePicker from '@react-native-community/datetimepicker';

const DRAFTS_KEY = '@bull_dolum_drafts';
const PURPLE = '#7C3AED';
const BLUE = '#0095F6';
const ORANGE = '#F97316';

const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const today = () => new Date().toISOString().split('T')[0];
const formatTR = (dateStr) => {
  if (!dateStr) return '';
  const d = dateStr.split('T')[0];
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${TR_MONTHS[parseInt(m) - 1]} ${y}`;
};

// ── Progress dots ────────────────────────────────────────────
function ProgressDots({ savedIds }) {
  const steps = [
    { key: 'bull1', label: '1', color: PURPLE },
    { key: 'bull2', label: '2', color: PURPLE },
    { key: 'bull3', label: '3', color: PURPLE },
    { key: 'dolum', label: 'D', color: BLUE },
  ];
  const doneCount = steps.filter(s => savedIds[s.key]).length;
  return (
    <View style={draftStyles.progressRow}>
      {steps.map((s, idx) => {
        const done = !!savedIds[s.key];
        return (
          <React.Fragment key={s.key}>
            {idx > 0 && <View style={[draftStyles.progressLine, done && { backgroundColor: Colors.success }]} />}
            <View style={[
              draftStyles.progressDot,
              done ? { backgroundColor: Colors.success } : { backgroundColor: Colors.bgSurface, borderWidth: 2, borderColor: Colors.borderColor },
            ]}>
              {done ? (
                <SimpleIcon name="check" size={12} color="#fff" />
              ) : (
                <Text style={[draftStyles.progressDotText, { color: Colors.textTertiary }]}>
                  {s.label}
                </Text>
              )}
            </View>
          </React.Fragment>
        );
      })}
      <Text style={draftStyles.progressCount}>{doneCount}/4</Text>
    </View>
  );
}

// ── Draft Card (incomplete session) ──────────────────────────
function DraftCard({ draft, onResume, onDelete }) {
  const { savedIds, stepData } = draft;
  const savedBulls = ['bull1', 'bull2', 'bull3'].filter(k => savedIds[k]);
  const hasDolum = !!savedIds.dolum;
  const doneCount = savedBulls.length + (hasDolum ? 1 : 0);
  const missingCount = 4 - doneCount;

  // What's next?
  let nextLabel = 'Bull 1';
  if (savedIds.bull1 && !savedIds.bull2) nextLabel = 'Bull 2';
  else if (savedIds.bull2 && !savedIds.bull3) nextLabel = 'Bull 3';
  else if (savedBulls.length >= 1 && !hasDolum) nextLabel = 'Dolum';

  // First bull's date for display
  const dateStr = stepData?.bull1?.tarih || '';

  return (
    <TouchableOpacity style={draftStyles.card} activeOpacity={0.7} onPress={() => onResume(draft)}>
      {/* Header */}
      <View style={draftStyles.cardHeader}>
        <View style={[draftStyles.statusBadge, { backgroundColor: '#FFF7ED' }]}>
          <Text style={[draftStyles.statusBadgeText, { color: ORANGE }]}>Tamamlanmadı</Text>
        </View>
        <Text style={draftStyles.missingText}>{missingCount} adım kaldı</Text>
        <TouchableOpacity
          style={draftStyles.deleteBtn}
          onPress={() => onDelete(draft)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={draftStyles.deleteBtn}><SimpleIcon name="close" size={16} color={Colors.danger} /></View>
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <ProgressDots savedIds={savedIds} />

      {/* Saved bulls summary */}
      <View style={draftStyles.savedList}>
        {savedBulls.map((bKey, idx) => (
          <View key={bKey} style={draftStyles.savedChip}>
            <View style={[draftStyles.savedDot, { backgroundColor: Colors.success }]} />
            <Text style={draftStyles.savedChipText}>
              Bull {idx + 1}{stepData?.[bKey]?.bullNo ? ` — ${stepData[bKey].bullNo}` : ''}
            </Text>
          </View>
        ))}
      </View>

      {/* Resume hint */}
      <View style={draftStyles.resumeRow}>
        <View style={draftStyles.resumeInfo}>
          {dateStr ? <Text style={draftStyles.resumeDate}>{formatTR(dateStr)}</Text> : null}
        </View>
        <View style={[draftStyles.resumeBtn, { backgroundColor: ORANGE }]}>
          <View style={{flexDirection:'row',alignItems:'center',gap:4}}><Text style={draftStyles.resumeBtnText}>Devam Et</Text><SimpleIcon name="arrow-forward" size={14} color="#fff" /><Text style={draftStyles.resumeBtnText}>{nextLabel}</Text></View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Completed Group Card ─────────────────────────────────────
function GroupCard({ group, onPress }) {
  const { dolum, bulls } = group;

  return (
    <TouchableOpacity style={styles.groupCard} activeOpacity={0.7} onPress={() => onPress(group)}>
      <View style={styles.groupHeader}>
        <View style={styles.groupBadges}>
          <View style={[styles.badge, { backgroundColor: '#E8F4FD' }]}>
            <Text style={[styles.badgeText, { color: BLUE }]}>Dolum #{dolum?.id || '?'}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: '#F3E8FF' }]}>
            <Text style={[styles.badgeText, { color: PURPLE }]}>{bulls.length} Bull</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: '#ECFDF5' }]}>
            <View style={{flexDirection:'row',alignItems:'center',gap:4}}><SimpleIcon name="check" size={12} color={Colors.success} /><Text style={[styles.badgeText, { color: Colors.success }]}>Tamamlandı</Text></View>
          </View>
        </View>
        <SimpleIcon name="chevron-right" size={18} color={Colors.textTertiary} />
      </View>

      {/* Dolum summary */}
      {dolum && (
        <View style={[styles.subCard, { borderLeftColor: BLUE }]}>
          <Text style={[styles.subCardTitle, { color: BLUE }]}>Dolum Brix</Text>
          <View style={styles.fieldsRow}>
            {dolum.dolumBrixDegeri != null && (
              <View style={styles.fieldChip}>
                <Text style={styles.fieldChipLabel}>Brix</Text>
                <Text style={styles.fieldChipValue}>{dolum.dolumBrixDegeri}</Text>
              </View>
            )}
            {dolum.kKontrolBrix != null && (
              <View style={styles.fieldChip}>
                <Text style={styles.fieldChipLabel}>K.Kontrol</Text>
                <Text style={styles.fieldChipValue}>{dolum.kKontrolBrix}</Text>
              </View>
            )}
            {dolum.renk && (
              <View style={styles.fieldChip}>
                <Text style={styles.fieldChipLabel}>Renk</Text>
                <Text style={styles.fieldChipValue}>{dolum.renk}</Text>
              </View>
            )}
            {dolum.vardiya && (
              <View style={styles.fieldChip}>
                <Text style={styles.fieldChipLabel}>Vardiya</Text>
                <Text style={styles.fieldChipValue}>{dolum.vardiya}</Text>
              </View>
            )}
          </View>
          {dolum.tarih && (
            <Text style={styles.dateText}>{formatTR(dolum.tarih)}{dolum.saat ? ` ${dolum.saat}` : ''}</Text>
          )}
        </View>
      )}

      {/* Bulls summary chips */}
      {bulls.length > 0 && (
        <View style={styles.bullsSummary}>
          {bulls.map((bull, idx) => (
            <View key={bull.id || idx} style={styles.bullChip}>
              <View style={[styles.bullDot, { backgroundColor: PURPLE }]} />
              <Text style={styles.bullChipText}>
                Bull {idx + 1}{bull.bullNo ? ` — ${bull.bullNo}` : ''}
                {bull.bullBrixDegeri != null ? ` (${bull.bullBrixDegeri})` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4,marginTop:8}}><Text style={styles.expandHint}>Detayları görmek için dokunun</Text><SimpleIcon name="chevron-right" size={12} color={Colors.textTertiary} /></View>
    </TouchableOpacity>
  );
}

// ── Main Screen ──────────────────────────────────────────────
export default function BullDolumListScreen() {
  const navigation = useNavigation();

  const [drafts, setDrafts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [showDraftModal, setShowDraftModal] = useState(false);

  // Date filter
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [showDatePicker, setShowDatePicker] = useState(null); // 'start' | 'end' | null
  const [pendingDate, setPendingDate] = useState(new Date());

  const loadData = useCallback(async () => {
    try {
      setError(null);

      // 1. Load drafts from AsyncStorage
      let rawDrafts = [];
      try {
        const raw = await AsyncStorage.getItem(DRAFTS_KEY);
        rawDrafts = raw ? JSON.parse(raw) : [];
      } catch {}
      // Filter out empty drafts (no bulls saved)
      const validDrafts = rawDrafts.filter(d => {
        const hasBull = d.savedIds && (d.savedIds.bull1 || d.savedIds.bull2 || d.savedIds.bull3);
        return hasBull;
      });
      setDrafts(validDrafts);

      // 2. Load completed groups from API
      const links = await getDolumBullList();
      const linkArr = Array.isArray(links) ? links : [];

      const dolumMap = {};
      for (const link of linkArr) {
        const dId = link.dolumId;
        if (!dolumMap[dId]) dolumMap[dId] = { dolumId: dId, bullIds: [], linkIds: [] };
        dolumMap[dId].bullIds.push(link.bullId);
        dolumMap[dId].linkIds.push(link.id);
      }

      const results = await Promise.all(
        Object.values(dolumMap).map(async (g) => {
          try {
            const [dolum, ...bulls] = await Promise.all([
              getDolumBrixById(g.dolumId).catch(() => null),
              ...g.bullIds.map(id => getBullBrixById(id).catch(() => null)),
            ]);
            return { dolumId: g.dolumId, linkIds: g.linkIds, dolum, bulls: bulls.filter(Boolean) };
          } catch { return null; }
        }),
      );

      let filtered = results.filter(Boolean);
      filtered = filtered.filter(g => {
        if (!g.dolum?.tarih) return true;
        const d = g.dolum.tarih.split('T')[0];
        return d >= startDate && d <= endDate;
      });
      filtered.sort((a, b) => (b.dolumId || 0) - (a.dolumId || 0));
      setGroups(filtered);
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

  const handleResumeDraft = (draft) => {
    setShowDraftModal(false);
    navigation.navigate('BullDolumForm', { draftId: draft.id });
  };

  const handleNewPress = () => {
    if (drafts.length === 0) {
      navigation.navigate('BullDolumForm');
    } else {
      setShowDraftModal(true);
    }
  };

  const handleDeleteDraft = async (draft) => {
    Alert.alert(
      'Taslak Sil',
      'Bu taslağı silmek istediğinize emin misiniz? API\'ye kaydedilmiş bull kayıtları silinmeyecek.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const allDrafts = await AsyncStorage.getItem(DRAFTS_KEY);
              const arr = allDrafts ? JSON.parse(allDrafts) : [];
              await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(arr.filter(d => d.id !== draft.id)));
              setDrafts(prev => prev.filter(d => d.id !== draft.id));
            } catch {}
          },
        },
      ],
    );
  };

  const handleDeleteGroup = async (group) => {
    try {
      for (const linkId of group.linkIds) { await deleteDolumBull(linkId); }
      if (group.dolumId) { await deleteDolumBrix(group.dolumId).catch(() => {}); }
      for (const bull of group.bulls) { if (bull.id) await deleteBullBrix(bull.id).catch(() => {}); }
      setGroups(prev => prev.filter(g => g.dolumId !== group.dolumId));
    } catch (err) {
      Alert.alert('Hata', err.message);
    }
  };

  const handleGroupPress = (group) => {
    navigation.navigate('BullDolumDetail', { group });
  };

  const totalCount = drafts.length + groups.length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <SimpleIcon name="chevron-left" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={[styles.headerIcon, { backgroundColor: '#F3E8FF' }]}>
          <Text style={{ fontSize: 18, color: PURPLE, fontWeight: '700' }}>B</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Bull-Dolum Kontrol</Text>
          <Text style={styles.headerSubtitle}>
            {loading ? 'Yükleniyor...' : `${totalCount} kayıt`}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: PURPLE }]}
          onPress={handleNewPress}
          activeOpacity={0.8}
        >
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
          <Text style={styles.filterTodayText}>Bugün</Text>
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
          <View style={styles.pickerPopupSheet}>
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
                style={[styles.datePickerConfirm, { backgroundColor: PURPLE }]}
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
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PURPLE} />
        </View>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />}
        >
          {totalCount === 0 && (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Henüz kayıt yok</Text>
              <Text style={styles.emptySubtext}>Yeni kayıt eklemek için "+ Yeni" butonuna basın</Text>
            </View>
          )}

          {/* Drafts section */}
          {drafts.length > 0 && (
            <View style={styles.sectionWrap}>
              <Text style={styles.sectionTitle}>Tamamlanmamış</Text>
              {drafts.map(draft => (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  onResume={handleResumeDraft}
                  onDelete={handleDeleteDraft}
                />
              ))}
            </View>
          )}

          {/* Completed section */}
          {groups.length > 0 && (
            <View style={styles.sectionWrap}>
              {drafts.length > 0 && <Text style={styles.sectionTitle}>Tamamlanmış</Text>}
              {groups.map(group => (
                <GroupCard key={group.dolumId} group={group} onPress={handleGroupPress} />
              ))}
            </View>
          )}
        </ScrollView>
      )}
      {/* Draft picker modal */}
      <Modal
        visible={showDraftModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDraftModal(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            {/* Handle bar */}
            <View style={modalStyles.handleBar} />

            {/* Title */}
            <Text style={modalStyles.title}>Tamamlanmamış Kayıtlar</Text>
            <Text style={modalStyles.subtitle}>
              {drafts.length} adet yarım kalmış kaydınız var. Devam etmek istediğiniz kaydı seçin veya yeni bir kayıt başlatın.
            </Text>

            {/* Draft cards */}
            <ScrollView
              style={modalStyles.scrollArea}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {drafts.map(draft => {
                const { savedIds, stepData } = draft;
                const savedBulls = ['bull1', 'bull2', 'bull3'].filter(k => savedIds[k]);
                const hasDolum = !!savedIds.dolum;
                const doneCount = savedBulls.length + (hasDolum ? 1 : 0);

                let nextLabel = 'Bull 1';
                if (savedIds.bull1 && !savedIds.bull2) nextLabel = 'Bull 2';
                else if (savedIds.bull2 && !savedIds.bull3) nextLabel = 'Bull 3';
                else if (savedBulls.length >= 1 && !hasDolum) nextLabel = 'Dolum';

                const dateStr = stepData?.bull1?.tarih || '';
                const bullNo = stepData?.bull1?.bullNo || '';

                return (
                  <TouchableOpacity
                    key={draft.id}
                    style={modalStyles.draftCard}
                    activeOpacity={0.7}
                    onPress={() => handleResumeDraft(draft)}
                  >
                    <View style={modalStyles.draftCardTop}>
                      <View style={modalStyles.draftProgress}>
                        {[{k:'bull1',l:'1'},{k:'bull2',l:'2'},{k:'bull3',l:'3'},{k:'dolum',l:'D'}].map((s, i) => {
                          const done = !!savedIds[s.k];
                          return (
                            <React.Fragment key={s.k}>
                              {i > 0 && <View style={[modalStyles.dotLine, done && { backgroundColor: Colors.success }]} />}
                              <View style={[
                                modalStyles.dot,
                                done ? { backgroundColor: Colors.success } : { backgroundColor: Colors.bgSurface, borderWidth: 1.5, borderColor: Colors.borderColor },
                              ]}>
                                <Text style={[modalStyles.dotText, done ? { color: '#fff' } : { color: Colors.textTertiary }]}>
                                  {done ? <SimpleIcon name="check" size={10} color="#fff" /> : s.l}
                                </Text>
                              </View>
                            </React.Fragment>
                          );
                        })}
                        <Text style={modalStyles.dotCount}>{doneCount}/4</Text>
                      </View>
                      <View style={[modalStyles.resumeChip, { backgroundColor: ORANGE }]}>
                        <View style={{flexDirection:'row',alignItems:'center',gap:4}}><Text style={modalStyles.resumeChipText}>Devam</Text><SimpleIcon name="arrow-forward" size={12} color="#fff" /><Text style={modalStyles.resumeChipText}>{nextLabel}</Text></View>
                      </View>
                    </View>

                    <View style={modalStyles.draftCardBody}>
                      {savedBulls.map((bKey, idx) => (
                        <View key={bKey} style={modalStyles.bullChip}>
                          <View style={[modalStyles.bullDot, { backgroundColor: Colors.success }]} />
                          <Text style={modalStyles.bullChipText}>
                            Bull {idx + 1}{stepData?.[bKey]?.bullNo ? ` — ${stepData[bKey].bullNo}` : ''}
                          </Text>
                        </View>
                      ))}
                      {dateStr ? <Text style={modalStyles.draftDate}>{formatTR(dateStr)}</Text> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Actions */}
            <View style={modalStyles.actions}>
              <TouchableOpacity
                style={[modalStyles.newBtn, { backgroundColor: PURPLE }]}
                activeOpacity={0.8}
                onPress={() => { setShowDraftModal(false); navigation.navigate('BullDolumForm'); }}
              >
                <Text style={modalStyles.newBtnText}>+ Yeni Kayıt Oluştur</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={modalStyles.cancelBtn}
                activeOpacity={0.7}
                onPress={() => setShowDraftModal(false)}
              >
                <Text style={modalStyles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ── Modal styles ─────────────────────────────────────────────
const { height: SCREEN_H } = Dimensions.get('window');
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.bgApp,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: SCREEN_H * 0.75,
    paddingBottom: 34,
  },
  handleBar: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.borderColor,
    alignSelf: 'center', marginTop: 10, marginBottom: 12,
  },
  title: {
    fontSize: 18, fontWeight: '700', color: Colors.textPrimary,
    paddingHorizontal: Spacing.lg,
  },
  subtitle: {
    fontSize: 13, color: Colors.textSecondary, lineHeight: 18,
    paddingHorizontal: Spacing.lg, marginTop: 4, marginBottom: Spacing.md,
  },
  scrollArea: {
    paddingHorizontal: Spacing.lg,
  },
  draftCard: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1.5, borderColor: ORANGE, borderStyle: 'dashed',
    ...Shadows.sm,
  },
  draftCardTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  draftProgress: {
    flexDirection: 'row', alignItems: 'center',
  },
  dotLine: { width: 10, height: 2, backgroundColor: Colors.borderColor, borderRadius: 1 },
  dot: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  dotText: { fontSize: 10, fontWeight: '700' },
  dotCount: { marginLeft: 6, fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  resumeChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.xs,
  },
  resumeChipText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  draftCardBody: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6,
  },
  bullChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.xs,
  },
  bullDot: { width: 5, height: 5, borderRadius: 3, marginRight: 5 },
  bullChipText: { fontSize: 11, fontWeight: '600', color: Colors.textPrimary },
  draftDate: { fontSize: 11, color: Colors.textTertiary, marginLeft: 4 },
  actions: {
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md,
  },
  newBtn: {
    paddingVertical: 14, borderRadius: Radius.sm, alignItems: 'center',
  },
  newBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cancelBtn: {
    paddingVertical: 12, borderRadius: Radius.sm, alignItems: 'center', marginTop: Spacing.sm,
    backgroundColor: Colors.bgSurface, borderWidth: 1, borderColor: Colors.borderColor,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
});

// ── Draft card styles ────────────────────────────────────────
const draftStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: ORANGE,
    borderStyle: 'dashed',
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.xs,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : undefined,
  },
  missingText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textTertiary,
    marginLeft: Spacing.sm,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : undefined,
  },
  deleteBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
  },
  deleteBtnText: { color: Colors.danger, fontSize: 12, fontWeight: '700' },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  progressLine: {
    width: 16, height: 2,
    backgroundColor: Colors.borderColor,
    borderRadius: 1,
  },
  progressDot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  progressDotText: {
    fontSize: 11, fontWeight: '700', fontFamily: Platform.OS === 'android' ? 'sans-serif' : undefined,
  },
  progressCount: {
    marginLeft: Spacing.sm,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : undefined,
  },

  savedList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.xs,
  },
  savedDot: {
    width: 6, height: 6, borderRadius: 3, marginRight: 6,
  },
  savedChipText: {
    fontSize: 12, fontWeight: '600', color: Colors.textPrimary, fontFamily: Platform.OS === 'android' ? 'sans-serif' : undefined,
  },

  resumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resumeInfo: {},
  resumeDate: {
    fontSize: 12, color: Colors.textSecondary,
  },
  resumeBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  resumeBtnText: {
    fontSize: 13, fontWeight: '700', color: '#fff',
  },
});

// ── Main styles ──────────────────────────────────────────────
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
  filterTodayText: { fontSize: 13, fontWeight: '600', color: Colors.brandPrimary },

  pickerPopupOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 999,
  },
  pickerPopupSheet: {
    backgroundColor: Colors.bgWhite, borderRadius: Radius.lg,
    padding: Spacing.lg, width: '85%', maxWidth: 360,
  },
  datePickerTitle: {
    fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', paddingVertical: Spacing.sm,
  },
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

  list: { padding: Spacing.lg, paddingBottom: 80 },

  sectionWrap: { marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: Colors.textSecondary,
    marginBottom: Spacing.md, textTransform: 'uppercase', letterSpacing: 0.8,
  },

  groupCard: {
    backgroundColor: Colors.bgWhite, borderRadius: Radius.md,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm,
  },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md,
  },
  groupBadges: { flexDirection: 'row', gap: Spacing.sm, flex: 1, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.xs },
  badgeText: { fontSize: 12, fontWeight: '700', fontFamily: Platform.OS === 'android' ? 'sans-serif' : undefined },
  chevron: { fontSize: 24, fontWeight: '600', color: Colors.textTertiary, marginLeft: Spacing.sm },

  subCard: { borderLeftWidth: 3, paddingLeft: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.sm },
  subCardTitle: { fontSize: 13, fontWeight: '700', marginBottom: Spacing.xs },
  fieldsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  fieldChip: { backgroundColor: Colors.bgSurface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.xs },
  fieldChipLabel: { fontSize: 10, color: Colors.textTertiary, fontWeight: '600' },
  fieldChipValue: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  dateText: { fontSize: 12, color: Colors.textSecondary, marginTop: Spacing.xs },

  bullsSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.xs },
  bullChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F3E8FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.xs,
  },
  bullDot: { width: 5, height: 5, borderRadius: 3, marginRight: 5 },
  bullChipText: { fontSize: 11, fontWeight: '600', color: Colors.textPrimary },

  expandHint: { fontSize: 12, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.sm },

  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, color: Colors.textTertiary, marginTop: 6, textAlign: 'center' },
  errorText: { fontSize: 14, color: Colors.danger, textAlign: 'center', marginBottom: Spacing.md },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.sm, backgroundColor: Colors.bgSurface },
  retryBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
});
