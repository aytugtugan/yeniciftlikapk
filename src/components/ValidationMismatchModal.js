import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
} from 'react-native';
import SimpleIcon from './SimpleIcon';
import { Colors, Shadows } from '../theme';

/**
 * Compare two strings character by character and return segments showing matches/mismatches
 */
function compareStrings(actual, expected) {
  const a = (actual || '').trim();
  const e = (expected || '').trim();

  if (a === e) return { fullMatch: true, segments: [] };

  // Split by common delimiters to find field-level differences
  const delimiters = /([\/\-\.\s,])/;
  const aParts = a.split(delimiters);
  const eParts = e.split(delimiters);

  const segments = [];
  const maxLen = Math.max(aParts.length, eParts.length);

  for (let i = 0; i < maxLen; i++) {
    const aPart = aParts[i] || '';
    const ePart = eParts[i] || '';
    const isMatch = aPart === ePart;

    if (aPart || ePart) {
      segments.push({
        actual: aPart,
        expected: ePart,
        isMatch,
        isDiff: !isMatch && (aPart.length > 0 || ePart.length > 0),
      });
    }
  }

  return { fullMatch: false, segments };
}

export default function ValidationMismatchModal({
  visible,
  success,
  title,
  message,
  scannedValue,
  expectedValue,
  onDismiss,
  type = 'barcode',
}) {
  const comparison = useMemo(() => {
    if (success || !scannedValue || !expectedValue) {
      return { fullMatch: success, segments: [] };
    }
    return compareStrings(scannedValue, expectedValue);
  }, [scannedValue, expectedValue, success]);

  const showDetailedComparison = !success && comparison.segments.length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.contentContainer}>
          {/* Header */}
          <View style={styles.header}>
            <SimpleIcon
              name={success ? 'check_circle' : 'error'}
              size={48}
              color={success ? Colors.success : Colors.danger}
            />
            <Text style={[styles.title, { color: success ? Colors.success : Colors.danger }]}>
              {title || (success ? 'Doğrulama Başarılı' : 'Doğrulama Başarısız')}
            </Text>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Main message */}
            <Text style={styles.message}>{message}</Text>

            {/* Detailed comparison for mismatches */}
            {showDetailedComparison && (
              <View style={styles.comparisonContainer}>
                <Text style={styles.comparisonTitle}>Uyuşmazlık Türü</Text>

                {/* Character-level comparison */}
                <View style={styles.segmentContainer}>
                  <Text style={styles.segmentLabel}>Okunan Değer:</Text>
                  <View style={styles.segmentBox}>
                    {comparison.segments.map((seg, idx) => (
                      <Text
                        key={`actual-${idx}`}
                        style={[
                          styles.segmentText,
                          seg.isDiff && styles.mismatchText,
                        ]}
                      >
                        {seg.actual}
                      </Text>
                    ))}
                  </View>
                </View>

                <View style={styles.segmentContainer}>
                  <Text style={styles.segmentLabel}>Beklenen Değer:</Text>
                  <View style={styles.segmentBox}>
                    {comparison.segments.map((seg, idx) => (
                      <Text
                        key={`expected-${idx}`}
                        style={[
                          styles.segmentText,
                          seg.isDiff && styles.mismatchText,
                        ]}
                      >
                        {seg.expected}
                      </Text>
                    ))}
                  </View>
                </View>

                {/* Difference legend */}
                <View style={styles.diffLegend}>
                  {comparison.segments.filter(s => s.isDiff).length > 0 && (
                    <View style={styles.legendItem}>
                      <View style={[styles.legendBox, { backgroundColor: Colors.danger }]} />
                      <Text style={styles.legendText}>
                        {comparison.segments.filter(s => s.isDiff).length} fark bulundu
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Info box for common issues */}
            {!success && (
              <View style={styles.infoBox}>
                <SimpleIcon name="info" size={16} color={Colors.warning} />
                <Text style={styles.infoText}>
                  {type === 'barcode' && 'Barkod okuma açısını değiştirip tekrar deneyin'}
                  {type === 'inject' && 'İnjectleme kodu ve tarihi/saati kontrol edin'}
                  {type === 'field' && 'Girilen değeri kontrol edin'}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: success ? Colors.success : Colors.danger }]}
              onPress={onDismiss}
            >
              <Text style={styles.buttonText}>
                {success ? 'Devam Et' : 'Kapat'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  contentContainer: {
    backgroundColor: Colors.bgWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingTop: 20,
    paddingHorizontal: 16,
    ...Shadows.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  comparisonContainer: {
    backgroundColor: Colors.bgSurface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.danger,
  },
  comparisonTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  segmentContainer: {
    marginBottom: 12,
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  segmentBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Colors.bgWhite,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 2,
  },
  segmentText: {
    fontSize: 13,
    backgroundColor: Colors.success,
    color: '#000',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    fontFamily: 'Courier',
  },
  mismatchText: {
    backgroundColor: Colors.danger,
    color: '#FFF',
    fontWeight: '600',
  },
  diffLegend: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    gap: 10,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 20,
    paddingTop: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});
