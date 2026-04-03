import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Colors, Shadows, Radius } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function UpdateDialog({
  updateInfo,
  downloading,
  installing,
  progress,
  error,
  onUpdate,
  onDismiss,
  onRetry,
}) {
  if (!updateInfo) return null;

  const isForce = updateInfo.isForceUpdate;
  const isBusy = downloading || installing;

  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Başlık */}
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Text style={styles.iconText}>⬆</Text>
            </View>
            <Text style={styles.title}>Güncelleme Mevcut</Text>
            <Text style={styles.versionText}>
              v{updateInfo.currentVersionName} → v{updateInfo.serverVersionName}
            </Text>
          </View>

          {/* Release Notes */}
          {!!updateInfo.releaseNotes && (
            <View style={styles.notesWrap}>
              <Text style={styles.notesLabel}>Yenilikler:</Text>
              <Text style={styles.notesText}>{updateInfo.releaseNotes}</Text>
            </View>
          )}

          {/* Hata */}
          {!!error && (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Progress Bar */}
          {isBusy && (
            <View style={styles.progressSection}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <View style={styles.progressInfo}>
                <ActivityIndicator size="small" color={Colors.brandPrimary} />
                <Text style={styles.progressText}>
                  {installing ? 'Kuruluyor... Lütfen bekleyin' : `İndiriliyor... %${progress}`}
                </Text>
              </View>
            </View>
          )}

          {/* Butonlar */}
          {!isBusy && (
            <View style={styles.actions}>
              {error ? (
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={onRetry}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryBtnText}>Tekrar Dene</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={onUpdate}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryBtnText}>Güncelle</Text>
                </TouchableOpacity>
              )}

              {!isForce && (
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={onDismiss}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryBtnText}>Daha Sonra</Text>
                </TouchableOpacity>
              )}

              {isForce && (
                <Text style={styles.forceText}>
                  Bu güncelleme zorunludur. Devam etmek için uygulamayı güncellemeniz gerekiyor.
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.bgOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 360,
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.lg,
    padding: 24,
    ...Shadows.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.brandPrimaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  versionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  notesWrap: {
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.sm,
    padding: 12,
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  errorWrap: {
    backgroundColor: Colors.dangerBg,
    borderRadius: Radius.sm,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: Colors.danger,
    textAlign: 'center',
  },
  progressSection: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.bgSurface,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.brandPrimary,
    borderRadius: 4,
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  progressText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  actions: {
    marginTop: 8,
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: Colors.brandPrimary,
    paddingVertical: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: Colors.textWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  forceText: {
    fontSize: 12,
    color: Colors.warning,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
