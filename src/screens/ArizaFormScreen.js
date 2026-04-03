import React, { useState, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, StatusBar,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SimpleIcon from '../components/SimpleIcon';
import { Colors, Shadows, Spacing } from '../theme';
import { AppDataContext } from '../context/AppDataContext';
import { createArizaKayit } from '../api/arizaApi';

export default function ArizaFormScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { oncuToken } = useContext(AppDataContext);
  const initialMakineKodu = route.params?.makineKodu || '';

  const [makineKodu, setMakineKodu] = useState(initialMakineKodu);
  const [arizaNedeni, setArizaNedeni] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!makineKodu.trim()) {
      newErrors.makineKodu = 'Makine kodu boş olamaz';
    }
    if (!arizaNedeni.trim()) {
      newErrors.arizaNedeni = 'Arıza nedeni boş olamaz';
    }
    if (arizaNedeni.trim().length > 500) {
      newErrors.arizaNedeni = 'Arıza nedeni 500 karakterden fazla olamaz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!oncuToken) {
      Alert.alert('Hata', 'Oturum açılmamış');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createArizaKayit(oncuToken, {
        makineKodu: makineKodu.trim().toUpperCase(),
        arizaNedeni: arizaNedeni.trim(),
        factoryNo: 2,
      });

      Alert.alert('Başarılı', 'Arıza kaydı başarıyla açılmıştır.', [
        {
          text: 'Tamam',
          onPress: () => navigation.navigate('ArizaList'),
        },
      ]);
    } catch (err) {
      Alert.alert('Hata', err.message || 'Bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.brandPrimary} />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <SimpleIcon name="arrow_back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Arıza Kaydı Aç</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Makine Kodu Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Makine Kodu *</Text>
            <TouchableOpacity
              style={[styles.inputField, errors.makineKodu && styles.inputError]}
              onPress={() => {
                if (!initialMakineKodu) {
                  navigation.goBack();
                }
              }}>
              <SimpleIcon name="qr_code_2" size={18} color={Colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Makine kodu veya QR tarayın"
                value={makineKodu}
                onChangeText={setMakineKodu}
                editable={!initialMakineKodu}
                placeholderTextColor={Colors.textSecondary}
              />
              {makineKodu && !errors.makineKodu && (
                <SimpleIcon name="check_circle" size={18} color={Colors.success} />
              )}
            </TouchableOpacity>
            {errors.makineKodu && <Text style={styles.errorText}>{errors.makineKodu}</Text>}
          </View>

          {/* Arıza Nedeni Field */}
          <View style={styles.fieldContainer}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Arıza Nedeni *</Text>
              <Text style={styles.charCounter}>
                {arizaNedeni.length}/500
              </Text>
            </View>
            <View style={[styles.textAreaContainer, errors.arizaNedeni && styles.inputError]}>
              <TextInput
                style={styles.textArea}
                placeholder="Arıza nedenini detaylı olarak açıklayınız..."
                value={arizaNedeni}
                onChangeText={setArizaNedeni}
                multiline
                numberOfLines={6}
                placeholderTextColor={Colors.textSecondary}
                textAlignVertical="top"
              />
            </View>
            {errors.arizaNedeni && <Text style={styles.errorText}>{errors.arizaNedeni}</Text>}
            <Text style={styles.hint}>Sorunun detaylarını, gözlenen belirtileri ve ortaya çıkış zamanını yazınız.</Text>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <SimpleIcon name="info" size={16} color={Colors.brandPrimary} />
            <Text style={styles.infoText}>
              Bu kaydı açtıktan sonra "Arıza Kayıtları" listesinden durumunu takip edebilir ve çözümü kaydedebilirsiniz.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          disabled={isSubmitting}
          onPress={handleSubmit}>
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <SimpleIcon name="add_circle" size={20} color="#FFF" />
              <Text style={styles.submitButtonText}>Kaydı Aç</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelButton}
          disabled={isSubmitting}
          onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>İptal Et</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgApp },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 12,
    backgroundColor: Colors.brandPrimary,
    ...Shadows.md,
  },
  headerBtn: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#FFF', flex: 1, textAlign: 'center' },
  scrollView: { flex: 1 },
  content: { padding: 16, gap: 20 },
  fieldContainer: { marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  charCounter: { fontSize: 12, color: Colors.textSecondary },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.bgWhite,
    gap: 10,
  },
  input: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  textAreaContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.bgWhite,
    padding: 12,
  },
  textArea: {
    fontSize: 14,
    color: Colors.textPrimary,
    maxHeight: 150,
  },
  inputError: { borderColor: Colors.danger, backgroundColor: 'rgba(239, 68, 68, 0.05)' },
  errorText: { fontSize: 12, color: Colors.danger, marginTop: 6 },
  hint: { fontSize: 12, color: Colors.textSecondary, marginTop: 6, lineHeight: 16 },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: `${Colors.brandPrimary}10`,
    borderRadius: 8,
    padding: 12,
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: Colors.brandPrimary,
  },
  infoText: { flex: 1, fontSize: 13, color: Colors.textPrimary, lineHeight: 18 },
  bottomContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.bgWhite,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: Colors.brandPrimary,
    borderRadius: 8,
    gap: 8,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
});
