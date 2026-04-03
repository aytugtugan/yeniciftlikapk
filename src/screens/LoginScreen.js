import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../theme';
import { login } from '../api/apiService';
import Icon from '../components/SimpleIcon';

const CREDENTIALS_KEY = '@yc_credentials';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRemembered, setIsRemembered] = useState(false);

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const saved = await AsyncStorage.getItem(CREDENTIALS_KEY);
      if (saved) {
        const { username: u, password: p } = JSON.parse(saved);
        setUsername(u);
        setPassword(p);
        setIsRemembered(true);
      }
    } catch (e) {}
  };

  const saveCredentials = async () => {
    try {
      await AsyncStorage.setItem(CREDENTIALS_KEY, JSON.stringify({ username, password }));
    } catch (e) {}
  };

  const clearCredentials = async () => {
    try {
      await AsyncStorage.removeItem(CREDENTIALS_KEY);
    } catch (e) {}
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (isLoading) return;

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setErrorMessage('Lütfen tüm alanları doldurun');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const result = await login(trimmedUsername, password);
      if (result && result.isActive !== false && result.userId) {
        if (isRemembered) {
          await saveCredentials();
        } else {
          await clearCredentials();
        }
        onLoginSuccess(result, trimmedUsername, password);
      } else {
        setErrorMessage(result?.message || 'Geçersiz kullanıcı adı veya şifre');
      }
    } catch (e) {
      const msg = e?.message || '';
      if (msg.includes('Network') || msg.includes('fetch')) {
        setErrorMessage('Sunucuya bağlanılamadı. Ağ bağlantınızı kontrol edin.');
      } else {
        setErrorMessage(msg || 'Giriş başarısız');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = username.trim() !== '' && password !== '';

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bgWhite} />

        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Image source={require('../assets/onculogo.png')} style={styles.logoImage} resizeMode="contain" />
            </View>
          </View>

          <Text style={styles.brandName}>Yeni Çiftlik</Text>
          <Text style={styles.subtitle}>Üretim Yönetim Sistemi</Text>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Username */}
            <View style={styles.inputContainer}>
              <Icon name="person-outline" size={20} color={Colors.textSecondary} style={{ marginRight: 12 }} />
              <TextInput
                style={styles.input}
                placeholder="Kullanıcı adı"
                placeholderTextColor={Colors.textSecondary}
                value={username}
                onChangeText={text => { setUsername(text); setErrorMessage(''); }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Icon name="lock-outline" size={20} color={Colors.textSecondary} style={{ marginRight: 12 }} />
              <TextInput
                style={styles.input}
                placeholder="Şifre"
                placeholderTextColor={Colors.textSecondary}
                value={password}
                onChangeText={text => { setPassword(text); setErrorMessage(''); }}
                secureTextEntry={!passwordVisible}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)} style={styles.eyeButton}>
                <Icon name={passwordVisible ? 'visibility' : 'visibility-off'} size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Error */}
            {errorMessage !== '' && (
              <View style={styles.errorContainer}>
                <Icon name="error-outline" size={18} color={Colors.danger} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                { backgroundColor: isFormValid && !isLoading ? Colors.brandPrimary : `${Colors.brandPrimary}40` },
              ]}
              onPress={handleLogin}
              disabled={!isFormValid || isLoading}
              activeOpacity={0.8}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Giriş Yap</Text>
              )}
            </TouchableOpacity>

            {/* Remember Me */}
            <TouchableOpacity style={styles.rememberContainer} onPress={() => {
              if (isRemembered) { clearCredentials(); setIsRemembered(false); }
              else { setIsRemembered(true); }
            }} activeOpacity={0.7}>
              <View style={[styles.checkbox, {
                borderColor: isRemembered ? Colors.brandPrimary : Colors.borderColor,
                backgroundColor: isRemembered ? Colors.brandPrimary : 'transparent',
              }]}>
                {isRemembered && <Icon name="check" size={14} color="#FFF" />}
              </View>
              <Text style={styles.rememberText}>Beni hatırla</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.divider} />
          <Text style={styles.footerText}>© 2025 Acemoğlu Gıda</Text>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgWhite,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.brandPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 70,
    height: 70,
  },
  brandName: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.5,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 36,
    color: Colors.textSecondary,
  },
  formContainer: {
    gap: 14,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: 12,
    borderColor: Colors.borderColor,
    backgroundColor: Colors.bgInput,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
    color: Colors.textPrimary,
  },
  eyeButton: {
    padding: 4,
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.dangerBg,
    gap: 8,
  },
  errorIcon: {
    fontSize: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.danger,
  },
  loginButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rememberText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  footer: {
    paddingBottom: 30,
    alignItems: 'center',
    gap: 14,
  },
  divider: {
    width: 50,
    height: 1,
    backgroundColor: Colors.divider,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.textTertiary,
  },
});
