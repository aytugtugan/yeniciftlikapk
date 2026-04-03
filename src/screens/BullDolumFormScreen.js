import React, { useState, useCallback, useRef, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Radius, Shadows } from '../theme';
import SimpleIcon from '../components/SimpleIcon';
import {
  createBullBrix,
  createDolumBrix,
  createDolumBull,
} from '../api/formsApi';
import DateTimePicker from '@react-native-community/datetimepicker';
import { VARDIYA_OPTIONS, VARDIYA_DEFS, getVardiyaSaat, getCurrentVardiya } from '../utils/vardiya';

const DRAFTS_KEY = '@bull_dolum_drafts';

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

// ── Step definitions ─────────────────────────────────────────
const STEPS = [
  { key: 'bull1', label: 'Bull 1', short: '1', color: '#7C3AED', bgColor: '#F3E8FF' },
  { key: 'bull2', label: 'Bull 2', short: '2', color: '#7C3AED', bgColor: '#F3E8FF' },
  { key: 'bull3', label: 'Bull 3', short: '3', color: '#7C3AED', bgColor: '#F3E8FF' },
  { key: 'dolum', label: 'Dolum', short: 'D', color: '#0095F6', bgColor: '#E8F4FD' },
];

const BULL_FIELDS = [
  { key: 'bullNo', label: 'Bull No', type: 'text', required: true, maxLength: 50 },
  { key: 'sicaklik', label: 'Sıcaklık (°C)', type: 'number', max: 500 },
  { key: 'bullBrixDegeri', label: 'Bull Brix Değeri', type: 'number', max: 100 },
  { key: 'bullKKontrolBrix', label: 'K.Kontrol Brix', type: 'number', max: 100 },
  { key: 'renk', label: 'Renk', type: 'text', maxLength: 50 },
  { key: 'vardiya', label: 'Vardiya', type: 'vardiya', required: true },
  { key: 'saat', label: 'Saat', type: 'time' },
  { key: 'tarih', label: 'Tarih', type: 'date' },
];

const DOLUM_FIELDS = [
  { key: 'dolumBrixDegeri', label: 'Dolum Brix Değeri', type: 'number', max: 100 },
  { key: 'kKontrolBrix', label: 'K.Kontrol Brix', type: 'number', max: 100 },
  { key: 'renk', label: 'Renk', type: 'text', maxLength: 50 },
  { key: 'vardiya', label: 'Vardiya', type: 'vardiya', required: true },
  { key: 'saat', label: 'Saat', type: 'time' },
  { key: 'tarih', label: 'Tarih', type: 'date' },
];

function getFieldsForStep(stepKey) {
  return stepKey === 'dolum' ? DOLUM_FIELDS : BULL_FIELDS;
}

function initStepData(fields, carryFrom) {
  const data = {};
  const currentV = carryFrom?.vardiya || getCurrentVardiya();
  const currentSaat = getVardiyaSaat(currentV);
  fields.forEach(f => {
    if (f.type === 'date') data[f.key] = carryFrom?.tarih || today();
    else if (f.type === 'time') data[f.key] = carryFrom?.saat || currentSaat || nowTime();
    else if (f.key === 'vardiya') data[f.key] = currentV;
    else data[f.key] = '';
  });
  return data;
}

// ── Draft helpers ────────────────────────────────────────────
async function loadDrafts() {
  try {
    const raw = await AsyncStorage.getItem(DRAFTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveDraft(draft) {
  const drafts = await loadDrafts();
  const idx = drafts.findIndex(d => d.id === draft.id);
  if (idx >= 0) drafts[idx] = draft;
  else drafts.push(draft);
  await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

async function removeDraft(draftId) {
  const drafts = await loadDrafts();
  await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts.filter(d => d.id !== draftId)));
}

// ── Vardiya Selector ─────────────────────────────────────────
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

// ── Form Field ───────────────────────────────────────────────
function FormField({ field, value, onChange, onDatePress, onTimePress, disabled }) {
  if (field.type === 'vardiya') {
    return (
      <View style={styles.fieldWrap}>
        <Text style={styles.fieldLabel}>{field.label}{field.required ? ' *' : ''}</Text>
        <VardiyaSelector value={value || ''} />
      </View>
    );
  }
  if (field.type === 'date') {
    return (
      <View style={styles.fieldWrap}>
        <Text style={styles.fieldLabel}>{field.label}{field.required ? ' *' : ''}</Text>
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
        <Text style={styles.fieldLabel}>{field.label}</Text>
        <View style={[styles.input, styles.inputDisabled]}>
          <Text style={value ? styles.inputText : styles.placeholderText}>
            {value ? value.substring(0, 5) : 'HH:mm'}
          </Text>
        </View>
      </View>
    );
  }
  const isNumeric = field.type === 'number' || field.type === 'integer';
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{field.label}{field.required ? ' *' : ''}</Text>
      <TextInput
        style={[styles.input, disabled && styles.inputDisabled]}
        value={value !== null && value !== undefined ? String(value) : ''}
        editable={!disabled}
        onChangeText={(t) => {
          if (isNumeric) {
            const cleaned = t.replace(field.type === 'integer' ? /[^0-9-]/g : /[^0-9.,-]/g, '');
            onChange(cleaned);
          } else {
            onChange(t);
          }
        }}
        placeholder={isNumeric ? '0' : ''}
        placeholderTextColor={Colors.textTertiary}
        keyboardType={isNumeric ? 'decimal-pad' : 'default'}
        maxLength={field.maxLength || undefined}
      />
    </View>
  );
}

// ── Step Indicator ───────────────────────────────────────────
function StepIndicator({ steps, currentStep, completedSteps, onStepPress }) {
  return (
    <View style={styles.stepRow}>
      {steps.map((step, idx) => {
        const isActive = idx === currentStep;
        const isCompleted = completedSteps.includes(step.key);
        const canPress = true;
        return (
          <React.Fragment key={step.key}>
            {idx > 0 && (
              <View style={[styles.stepLine, isCompleted && styles.stepLineCompleted]} />
            )}
            <TouchableOpacity
              style={[
                styles.stepPill,
                isActive && { borderColor: step.color, backgroundColor: step.bgColor },
                isCompleted && !isActive && { borderColor: Colors.success, backgroundColor: Colors.successLight },
              ]}
              onPress={() => canPress && onStepPress(idx)}
              activeOpacity={canPress ? 0.7 : 1}
            >
              {isCompleted && !isActive ? (
                <SimpleIcon name="check" size={14} color={Colors.success} />
              ) : (
                <Text style={[
                  styles.stepShort,
                  isActive && { color: step.color },
                  isCompleted && !isActive && { color: Colors.success },
                ]}>{step.short}</Text>
              )}
              <Text
                style={[
                  styles.stepLabel,
                  isActive && { color: step.color, fontWeight: '700' },
                  isCompleted && !isActive && { color: Colors.success },
                ]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ── Saved Summary Card ───────────────────────────────────────
function SavedSummaryCard({ stepDef, data, savedId, fields }) {
  return (
    <View style={[styles.summaryCard, { borderLeftColor: stepDef.color }]}>
      <View style={styles.summaryHeader}>
        <View style={[styles.summaryBadge, { backgroundColor: stepDef.bgColor }]}>
          <Text style={[styles.summaryBadgeText, { color: stepDef.color }]}>#{savedId}</Text>
        </View>
        <Text style={styles.summaryTitle}>{stepDef.label} — Kaydedildi</Text>
      </View>
      <View style={styles.summaryBody}>
        {fields.map(f => {
          const val = data[f.key];
          if (val === null || val === undefined || val === '') return null;
          const display = f.type === 'date' ? formatTR(val) : String(val);
          return (
            <View key={f.key} style={styles.summaryField}>
              <Text style={styles.summaryFieldLabel}>{f.label}</Text>
              <Text style={styles.summaryFieldValue}>{display}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────
export default function BullDolumFormScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const scrollRef = useRef(null);

  const draftIdParam = route.params?.draftId || null;
  const [draftId, setDraftId] = useState(draftIdParam || `draft_${Date.now()}`);

  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [restoring, setRestoring] = useState(!!draftIdParam);

  const [stepData, setStepData] = useState(() => ({
    bull1: initStepData(BULL_FIELDS, null),
    bull2: initStepData(BULL_FIELDS, null),
    bull3: initStepData(BULL_FIELDS, null),
    dolum: initStepData(DOLUM_FIELDS, null),
  }));

  const [savedIds, setSavedIds] = useState({
    bull1: null, bull2: null, bull3: null, dolum: null,
  });

  // ── Restore from draft if draftId provided ─────────────────
  useEffect(() => {
    if (!draftIdParam) { setRestoring(false); return; }
    (async () => {
      try {
        const drafts = await loadDrafts();
        const draft = drafts.find(d => d.id === draftIdParam);
        if (draft) {
          setCurrentStep(draft.currentStep);
          setSavedIds(draft.savedIds);
          setStepData(draft.stepData);
        }
      } catch {} finally {
        setRestoring(false);
      }
    })();
  }, [draftIdParam]);

  // ── Persist draft helper ───────────────────────────────────
  const persistDraft = useCallback(async (step, ids, data) => {
    await saveDraft({
      id: draftId,
      currentStep: step,
      savedIds: ids,
      stepData: data,
      createdAt: new Date().toISOString(),
    });
  }, [draftId]);

  const completedSteps = STEPS.filter(s => savedIds[s.key] !== null).map(s => s.key);
  const savedBullCount = [savedIds.bull1, savedIds.bull2, savedIds.bull3].filter(Boolean).length;

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState(null);
  const [pendingDate, setPendingDate] = useState(new Date());

  // Time picker state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerField, setTimePickerField] = useState(null);
  const [pendingTime, setPendingTime] = useState(new Date());

  const currentStepDef = STEPS[currentStep];
  const currentFields = getFieldsForStep(currentStepDef.key);
  const currentData = stepData[currentStepDef.key];
  const isCurrentSaved = savedIds[currentStepDef.key] !== null;

  const updateField = (key, val) => {
    setStepData(prev => ({
      ...prev,
      [currentStepDef.key]: { ...prev[currentStepDef.key], [key]: val },
    }));
  };

  const handleDatePress = (fieldKey, currentValue) => {
    setDatePickerField(fieldKey);
    setPendingDate(currentValue ? new Date(currentValue + 'T00:00:00') : new Date());
    setShowDatePicker(true);
  };

  const confirmDate = () => {
    const sel = pendingDate.toISOString().split('T')[0];
    updateField(datePickerField, sel);
    setShowDatePicker(false);
  };

  const handleDatePickerChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'set' && date) {
        updateField(datePickerField, date.toISOString().split('T')[0]);
      }
      return;
    }
    if (date) setPendingDate(date);
  };

  const handleTimePress = (fieldKey, currentValue) => {
    setTimePickerField(fieldKey);
    const now = new Date();
    if (currentValue) {
      const parts = currentValue.split(':');
      now.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
    }
    setPendingTime(now);
    setShowTimePicker(true);
  };

  const confirmTime = () => {
    const hh = String(pendingTime.getHours()).padStart(2, '0');
    const mm = String(pendingTime.getMinutes()).padStart(2, '0');
    updateField(timePickerField, `${hh}:${mm}:00`);
    setShowTimePicker(false);
  };

  const handleTimePickerChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (event.type === 'set' && date) {
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        updateField(timePickerField, `${hh}:${mm}:00`);
      }
      return;
    }
    if (date) setPendingTime(date);
  };

  const carryForward = useCallback((fromData, toStepKey, prevStepData) => {
    const target = { ...prevStepData[toStepKey] };
    if (fromData.vardiya && !target.vardiya) target.vardiya = fromData.vardiya;
    if (fromData.tarih && target.tarih === today()) target.tarih = fromData.tarih;
    if (fromData.saat) target.saat = fromData.saat;
    return { ...prevStepData, [toStepKey]: target };
  }, []);

  const buildPayload = (fields, data) => {
    const payload = {};
    fields.forEach(f => {
      const val = data[f.key];
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
    return payload;
  };

  const validateStep = (fields, data) => {
    for (const f of fields) {
      if (f.required && (!data[f.key] || data[f.key] === '')) return f.label;
    }
    return null;
  };

  // ── Save current bull and advance to next step ─────────────
  const handleSaveAndAdvance = async () => {
    if (isCurrentSaved) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }
      return;
    }

    const missing = validateStep(currentFields, currentData);
    if (missing) { Alert.alert('Eksik Alan', `${missing} alanı zorunludur.`); return; }

    setSaving(true);
    try {
      const payload = buildPayload(currentFields, currentData);

      if (currentStepDef.key === 'dolum') {
        // Save dolum
        const result = await createDolumBrix(payload);
        const dolumId = result.id;
        const newIds = { ...savedIds, dolum: dolumId };
        setSavedIds(newIds);

        // Create DolumBull links for all saved bulls
        const bullIds = [savedIds.bull1, savedIds.bull2, savedIds.bull3].filter(Boolean);
        for (const bullId of bullIds) {
          await createDolumBull({ dolumId, bullId });
        }

        // Complete — remove draft
        await removeDraft(draftId);
        setAllDone(true);
        Alert.alert(
          'Tamamlandı',
          `${bullIds.length} Bull ve 1 Dolum kaydı başarıyla oluşturuldu ve eşleştirildi.`,
          [{ text: 'Tamam', onPress: () => navigation.goBack() }],
        );
      } else {
        // Save bull
        const result = await createBullBrix(payload);
        const bullId = result.id;
        const newIds = { ...savedIds, [currentStepDef.key]: bullId };
        setSavedIds(newIds);

        // Carry forward to all unsaved steps
        let newStepData = { ...stepData };
        STEPS.forEach((s, i) => {
          if (i > currentStep && newIds[s.key] === null) {
            newStepData = carryForward(currentData, s.key, newStepData);
          }
        });
        setStepData(newStepData);

        // Find next unsaved step (any direction)
        const nextUnsaved = STEPS.findIndex((s, i) => i > currentStep && newIds[s.key] === null);
        const nextStep = nextUnsaved >= 0 ? nextUnsaved : currentStep + 1;
        const clampedNext = Math.min(nextStep, STEPS.length - 1);
        await persistDraft(clampedNext, newIds, newStepData);

        setCurrentStep(clampedNext);
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }
    } catch (err) {
      Alert.alert('Hata', err.message || 'Kayıt sırasında hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  // ── Save current bull and exit ─────────────────────────────
  const handleSaveAndExit = async () => {
    if (isCurrentSaved) {
      // Already saved, just exit
      navigation.goBack();
      return;
    }

    const missing = validateStep(currentFields, currentData);
    if (missing) { Alert.alert('Eksik Alan', `${missing} alanı zorunludur.`); return; }

    setSaving(true);
    try {
      const payload = buildPayload(currentFields, currentData);
      const result = await createBullBrix(payload);
      const bullId = result.id;
      const newIds = { ...savedIds, [currentStepDef.key]: bullId };

      // Carry forward to all unsaved steps
      let newStepData = { ...stepData };
      STEPS.forEach((s, i) => {
        if (i > currentStep && newIds[s.key] === null) {
          newStepData = carryForward(currentData, s.key, newStepData);
        }
      });

      // Find next unsaved step for resume
      const nextUnsaved = STEPS.findIndex((s) => newIds[s.key] === null);
      const resumeStep = nextUnsaved >= 0 ? nextUnsaved : STEPS.length - 1;

      await persistDraft(resumeStep, newIds, newStepData);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Hata', err.message || 'Kayıt sırasında hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleStepPress = (idx) => {
    if (idx === currentStep) return;
    setCurrentStep(idx);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleBack = () => {
    // Draft is auto-persisted after each save — safe to go back
    if (completedSteps.length > 0 && !allDone) {
      Alert.alert(
        'Çıkış',
        'Kaydedilen adımlar korunacak. Listeden devam edebilirsiniz.',
        [
          { text: 'Kal', style: 'cancel' },
          { text: 'Çık', onPress: () => navigation.goBack() },
        ],
      );
    } else {
      navigation.goBack();
    }
  };

  const canGoBack = currentStep > 0;
  const isLastStep = currentStep === STEPS.length - 1;
  const isBullStep = currentStepDef.key !== 'dolum';
  const canSubmitDolum = isLastStep && savedBullCount >= 1;

  if (restoring) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.brandPrimary} />
        <Text style={{ marginTop: Spacing.md, color: Colors.textSecondary }}>Yükleniyor…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <SimpleIcon name="chevron-left" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Bull-Dolum Kontrol</Text>
          <Text style={styles.headerSubtitle}>
            {allDone ? 'Tamamlandı' : `Adım ${currentStep + 1} / ${STEPS.length}`}
          </Text>
        </View>
      </View>

      {/* Step Indicator */}
      <StepIndicator
        steps={STEPS}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepPress={handleStepPress}
      />

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${(completedSteps.length / STEPS.length) * 100}%`,
              backgroundColor: allDone ? Colors.success : currentStepDef.color,
            },
          ]}
        />
      </View>

      {/* Content */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.formScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step Title */}
          <View style={styles.stepTitleRow}>
            <View style={[styles.stepTitleIcon, { backgroundColor: currentStepDef.bgColor }]}>
              <Text style={[styles.stepTitleIconText, { color: currentStepDef.color }]}>
                {currentStepDef.short}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={styles.stepTitleText}>
                {currentStepDef.label} Brix Formu
              </Text>
              <Text style={styles.stepTitleHint}>
                {isCurrentSaved
                  ? 'Bu adım kaydedildi'
                  : currentStepDef.key === 'dolum'
                    ? 'Dolum brix değerlerini girin'
                    : `${currentStepDef.label} brix ve sıcaklık değerlerini girin`}
              </Text>
            </View>
          </View>

          {/* If completed, show summary */}
          {isCurrentSaved ? (
            <SavedSummaryCard
              stepDef={currentStepDef}
              data={currentData}
              savedId={savedIds[currentStepDef.key]}
              fields={currentFields}
            />
          ) : (
            currentFields.map(field => (
              <FormField
                key={field.key}
                field={field}
                value={currentData[field.key]}
                onChange={(val) => updateField(field.key, val)}
                onDatePress={handleDatePress}
                onTimePress={handleTimePress}
                disabled={isCurrentSaved}
              />
            ))
          )}

          {/* Date Picker - moved outside ScrollView */}

          {/* Linked Bulls Summary on Dolum step */}
          {currentStepDef.key === 'dolum' && !isCurrentSaved && (
            <View style={styles.linkedSection}>
              <Text style={styles.linkedTitle}>Bağlı Bull Kayıtları</Text>
              {['bull1', 'bull2', 'bull3'].map((bKey, idx) => (
                <View key={bKey} style={styles.linkedItem}>
                  <View style={[styles.linkedDot, { backgroundColor: savedIds[bKey] ? Colors.success : Colors.textTertiary }]} />
                  <Text style={styles.linkedLabel}>Bull {idx + 1}</Text>
                  {savedIds[bKey] ? (
                    <Text style={styles.linkedId}>#{savedIds[bKey]} — {stepData[bKey].bullNo || '-'}</Text>
                  ) : (
                    <Text style={styles.linkedPending}>Girilmedi</Text>
                  )}
                </View>
              ))}
              {savedBullCount === 0 && (
                <Text style={styles.linkedWarning}>En az 1 bull kaydedilmelidir</Text>
              )}
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Actions */}
      {!allDone && (
        <View style={styles.bottomBar}>
          {canGoBack && (
            <TouchableOpacity
              style={styles.prevBtn}
              onPress={() => { setCurrentStep(currentStep - 1); scrollRef.current?.scrollTo({ y: 0, animated: true }); }}
              activeOpacity={0.7}
            >
              <View style={{flexDirection:'row',alignItems:'center',gap:4}}><SimpleIcon name="chevron-left" size={14} color={Colors.textPrimary} /><Text style={styles.prevBtnText}>Geri</Text></View>
            </TouchableOpacity>
          )}

          {/* Bull step: "Kaydet ve Çık" + "Kaydet ve İleri" */}
          {isBullStep && !isCurrentSaved && (
            <>
              <TouchableOpacity
                style={[styles.exitBtn, saving && { opacity: 0.6 }]}
                onPress={handleSaveAndExit}
                disabled={saving}
                activeOpacity={0.8}
              >
                <Text style={styles.exitBtnText}>Kaydet ve Çık</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: currentStepDef.color }, saving && { opacity: 0.6 }]}
                onPress={handleSaveAndAdvance}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <View style={{flexDirection:'row',alignItems:'center',gap:4}}><Text style={styles.nextBtnText}>Kaydet ve İleri</Text><SimpleIcon name="chevron-right" size={14} color="#fff" /></View>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Bull step already saved: "Çıkış" + "İleri" */}
          {isBullStep && isCurrentSaved && (
            <>
              <TouchableOpacity
                style={styles.exitBtn}
                onPress={() => navigation.goBack()}
                activeOpacity={0.8}
              >
                <Text style={styles.exitBtnText}>Çıkış</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: currentStepDef.color }]}
                onPress={handleSaveAndAdvance}
                activeOpacity={0.8}
              >
                <View style={{flexDirection:'row',alignItems:'center',gap:4}}><Text style={styles.nextBtnText}>İleri</Text><SimpleIcon name="chevron-right" size={14} color="#fff" /></View>
              </TouchableOpacity>
            </>
          )}

          {/* Dolum step */}
          {isLastStep && !isCurrentSaved && (
            <TouchableOpacity
              style={[
                styles.nextBtn,
                { backgroundColor: currentStepDef.color },
                saving && { opacity: 0.6 },
                !canSubmitDolum && { opacity: 0.4 },
              ]}
              onPress={handleSaveAndAdvance}
              disabled={saving || !canSubmitDolum}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.nextBtnText}>Kaydet ve Eşleştir</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Dolum already saved — just show done */}
          {isLastStep && isCurrentSaved && (
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: Colors.success }]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <View style={{flexDirection:'row',alignItems:'center',gap:4}}><Text style={styles.nextBtnText}>Tamamlandı</Text><SimpleIcon name="check" size={14} color="#fff" /></View>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Date Picker Overlay */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={pendingDate}
          mode="date"
          display="default"
          onChange={handleDatePickerChange}
        />
      )}
      {showDatePicker && Platform.OS === 'ios' && (
        <Modal visible={true} transparent animationType="fade">
        <View style={styles.inModalPickerOverlay}>
          <View style={styles.pickerModalSheet}>
            <Text style={styles.datePickerTitle}>Tarih Seçin</Text>
            <DateTimePicker
              value={pendingDate}
              mode="date"
              display="spinner"
              themeVariant="light"
              onChange={(e, d) => { if (d) setPendingDate(d); }}
              locale="tr"
              style={{ height: 180 }}
            />
            <View style={styles.datePickerActions}>
              <TouchableOpacity style={styles.datePickerCancel} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.datePickerCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.datePickerConfirm, { backgroundColor: currentStepDef.color }]}
                onPress={confirmDate}
              >
                <Text style={styles.datePickerConfirmText}>Seç</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </Modal>
      )}

      {/* Time Picker Overlay */}
      {showTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={pendingTime}
          mode="time"
          display="default"
          is24Hour={true}
          onChange={handleTimePickerChange}
        />
      )}
      {showTimePicker && Platform.OS === 'ios' && (
        <Modal visible={true} transparent animationType="fade">
        <View style={styles.inModalPickerOverlay}>
          <View style={styles.pickerModalSheet}>
            <Text style={styles.datePickerTitle}>Saat Seçin</Text>
            <DateTimePicker
              value={pendingTime}
              mode="time"
              display="spinner"
              themeVariant="light"
              is24Hour={true}
              locale="tr"
              onChange={(e, d) => { if (d) setPendingTime(d); }}
              style={{ height: 180 }}
            />
            <View style={styles.datePickerActions}>
              <TouchableOpacity style={styles.datePickerCancel} onPress={() => setShowTimePicker(false)}>
                <Text style={styles.datePickerCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.datePickerConfirm, { backgroundColor: currentStepDef.color }]}
                onPress={confirmTime}
              >
                <Text style={styles.datePickerConfirmText}>Seç</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgApp },

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
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  headerSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  stepRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, backgroundColor: Colors.bgWhite,
  },
  stepPill: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs,
    borderRadius: Radius.md, borderWidth: 2, borderColor: Colors.borderColor,
    backgroundColor: Colors.bgSurface, minHeight: 52,
  },
  stepShort: { fontSize: 16, fontWeight: '700', color: Colors.textTertiary, fontFamily: Platform.OS === 'android' ? 'sans-serif' : undefined },
  stepCheck: { fontSize: 16, fontWeight: '700', color: Colors.success },
  stepLabel: { fontSize: 10, fontWeight: '600', color: Colors.textTertiary, marginTop: 2, fontFamily: Platform.OS === 'android' ? 'sans-serif' : undefined },
  stepLine: { width: 12, height: 2, backgroundColor: Colors.borderColor, borderRadius: 1 },
  stepLineCompleted: { backgroundColor: Colors.success },

  progressTrack: { height: 3, backgroundColor: Colors.borderLight },
  progressFill: { height: 3, borderRadius: 1.5 },

  formScroll: { padding: Spacing.lg },

  stepTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xl },
  stepTitleIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  stepTitleIconText: { fontSize: 20, fontWeight: '700', fontFamily: Platform.OS === 'android' ? 'sans-serif' : undefined },
  stepTitleText: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  stepTitleHint: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  summaryCard: {
    backgroundColor: Colors.bgWhite, borderRadius: Radius.md, padding: Spacing.lg,
    borderLeftWidth: 4, ...Shadows.sm, marginBottom: Spacing.lg,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  summaryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.xs },
  summaryBadgeText: { fontSize: 12, fontWeight: '700', fontFamily: Platform.OS === 'android' ? 'sans-serif' : undefined },
  summaryTitle: { marginLeft: Spacing.sm, fontSize: 14, fontWeight: '600', color: Colors.success },
  summaryBody: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  summaryField: { minWidth: '40%' },
  summaryFieldLabel: { fontSize: 11, color: Colors.textSecondary, marginBottom: 1 },
  summaryFieldValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, fontFamily: Platform.OS === 'android' ? 'sans-serif' : undefined },

  linkedSection: {
    marginTop: Spacing.xl, backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md, padding: Spacing.lg, ...Shadows.sm,
  },
  linkedTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  linkedItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.sm, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  linkedDot: { width: 8, height: 8, borderRadius: 4, marginRight: Spacing.sm },
  linkedLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, width: 50 },
  linkedId: { fontSize: 13, color: Colors.success, fontWeight: '600' },
  linkedPending: { fontSize: 13, color: Colors.textTertiary, fontStyle: 'italic' },
  linkedWarning: { fontSize: 12, color: Colors.danger, marginTop: Spacing.sm },

  bottomBar: {
    flexDirection: 'row', paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md, paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.md,
    backgroundColor: Colors.bgWhite, borderTopWidth: 0.5, borderTopColor: Colors.borderLight,
    gap: Spacing.sm, ...Shadows.md,
  },
  prevBtn: {
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: Radius.sm, backgroundColor: Colors.bgSurface,
    alignItems: 'center', justifyContent: 'center',
  },
  prevBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  exitBtn: {
    flex: 1, paddingVertical: 14, borderRadius: Radius.sm,
    backgroundColor: Colors.bgSurface, borderWidth: 1, borderColor: Colors.borderColor,
    alignItems: 'center', justifyContent: 'center',
  },
  exitBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  nextBtn: {
    flex: 1, paddingVertical: 14, borderRadius: Radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  nextBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  fieldWrap: { marginBottom: Spacing.lg },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: Colors.bgWhite, borderWidth: 1, borderColor: Colors.borderColor,
    borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary,
  },
  inputDisabled: { backgroundColor: Colors.bgSurface, opacity: 0.7 },
  inputText: { fontSize: 15, color: Colors.textPrimary },
  placeholderText: { fontSize: 15, color: Colors.textTertiary },

  vardiyaBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: Radius.sm, borderWidth: 1.5, borderColor: Colors.borderColor,
  },
  vardiyaBadge: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.textTertiary,
  },
  vardiyaBadgeText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  vardiyaBannerTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  vardiyaBannerTime: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },

  datePickerTitle: {
    fontSize: 16, fontWeight: '700', color: Colors.textPrimary,
    textAlign: 'center', paddingVertical: Spacing.sm,
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
});
