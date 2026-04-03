import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Radius, Shadows } from '../theme';
import SimpleIcon from '../components/SimpleIcon';
import { FORM_DEFINITIONS } from '../api/formsApi';

function FormIcon({ icon, color, size = 28 }) {
  const w = 2;
  if (icon === 'flask') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 10, height: 4, borderTopWidth: w, borderColor: color }} />
        <View style={{
          width: 0, height: 0,
          borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 10,
          borderLeftColor: 'transparent', borderRightColor: 'transparent',
          borderTopColor: color, marginTop: 1,
        }} />
        <View style={{
          width: 16, height: 6,
          backgroundColor: color, borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
          marginTop: -1,
        }} />
      </View>
    );
  }
  if (icon === 'box') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: 20, height: 16, borderWidth: w, borderColor: color, borderRadius: 3,
        }}>
          <View style={{ width: '100%', height: w, backgroundColor: color, marginTop: 3 }} />
        </View>
      </View>
    );
  }
  if (icon === 'droplet') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: 14, height: 18,
          borderWidth: w, borderColor: color,
          borderRadius: 7, borderTopLeftRadius: 2, borderTopRightRadius: 2,
        }} />
      </View>
    );
  }
  if (icon === 'link') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
        <View style={{ width: 10, height: 8, borderWidth: w, borderColor: color, borderRadius: 4 }} />
        <View style={{ width: 10, height: 8, borderWidth: w, borderColor: color, borderRadius: 4, marginLeft: -4 }} />
      </View>
    );
  }
  if (icon === 'clipboard') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: 18, height: 20, borderWidth: w, borderColor: color, borderRadius: 3,
          justifyContent: 'center', alignItems: 'center', gap: 3, paddingTop: 4,
        }}>
          <View style={{ width: 9, height: w, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ width: 9, height: w, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ width: 6, height: w, backgroundColor: color, borderRadius: 1, alignSelf: 'flex-start', marginLeft: 3 }} />
        </View>
      </View>
    );
  }
  // report
  if (icon === 'report') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: 18, height: 20, borderWidth: w, borderColor: color, borderRadius: 3,
          justifyContent: 'center', alignItems: 'center', gap: 2, paddingTop: 2,
        }}>
          <View style={{ width: 10, height: w, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ width: 10, height: w, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ width: 10, height: w, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ width: 6, height: w, backgroundColor: color, borderRadius: 1, alignSelf: 'flex-start', marginLeft: 3 }} />
        </View>
      </View>
    );
  }
  // gauge
  if (icon === 'gauge') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: 20, height: 10, borderWidth: w, borderColor: color,
          borderTopLeftRadius: 10, borderTopRightRadius: 10,
          borderBottomWidth: 0,
        }} />
        <View style={{
          position: 'absolute', bottom: 8, left: size / 2 - 1,
          width: w, height: 8, backgroundColor: color, borderRadius: 1,
          transform: [{ rotate: '45deg' }], transformOrigin: 'bottom center',
        }} />
      </View>
    );
  }
  // package
  if (icon === 'package') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: 20, height: 18, borderWidth: w, borderColor: color, borderRadius: 3,
        }}>
          <View style={{ width: '100%', height: w, backgroundColor: color, marginTop: 4 }} />
          <View style={{ position: 'absolute', left: 8, top: 0, width: w, height: '100%', backgroundColor: color }} />
        </View>
      </View>
    );
  }
  // leaf
  if (icon === 'leaf') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: 16, height: 18, borderWidth: w, borderColor: color,
          borderRadius: 8, borderTopRightRadius: 2, borderBottomLeftRadius: 2,
        }} />
      </View>
    );
  }
  // beaker
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: 16, height: 18, borderWidth: w, borderColor: color, borderRadius: 3,
        borderTopWidth: 0,
      }}>
        <View style={{ width: '100%', height: w, backgroundColor: color, marginTop: 5 }} />
      </View>
      <View style={{
        position: 'absolute', top: 2, left: 6,
        width: 4, height: 5, borderLeftWidth: w, borderColor: color,
      }} />
    </View>
  );
}

export default function FormListScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }} activeOpacity={0.7}>
            <SimpleIcon name="arrow-back-ios" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Formlar</Text>
            <Text style={styles.headerSubtitle}>Kalite kontrol formlarını seçin</Text>
          </View>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {/* Bull-Dolum combined list card */}
        <TouchableOpacity
          style={[styles.card, { borderWidth: 1.5, borderColor: '#7C3AED' }]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('BullDolumList')}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#F3E8FF' }]}>
            <FormIcon icon="flask" color="#7C3AED" size={28} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>Bull-Dolum Kontrol</Text>
            <Text style={styles.cardDesc} numberOfLines={2}>3 Bull + 1 Dolum brix formu doldur ve otomatik eşleştir</Text>
          </View>
          <View style={styles.chevron}>
            <SimpleIcon name="chevron-right" size={18} color="#7C3AED" />
          </View>
        </TouchableOpacity>

        {/* Vardiya Hammadde dedicated card */}
        <TouchableOpacity
          style={[styles.card, { borderWidth: 1.5, borderColor: '#059669' }]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('VardiyaHammadde')}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#ECFDF5' }]}>
            <FormIcon icon="box" color="#059669" size={28} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>Vardiya Hammadde</Text>
            <Text style={styles.cardDesc} numberOfLines={2}>Vardiya bazlı hammadde giriş/çıkış kaydı</Text>
          </View>
          <View style={styles.chevron}>
            <SimpleIcon name="chevron-right" size={18} color="#059669" />
          </View>
        </TouchableOpacity>

        {FORM_DEFINITIONS.filter(f => !['bullBrix', 'dolumBrix', 'dolumBull', 'vardiyaHatDurum', 'vardiyaPaketleme', 'vardiyaHammadde', 'depoSevk'].includes(f.key)).map((form) => (
          <TouchableOpacity
            key={form.key}
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => {
              if (form.key === 'vardiyaRapor') {
                navigation.navigate('VardiyaRapor');
              } else {
                navigation.navigate('FormDetail', { formKey: form.key });
              }
            }}
          >
            <View style={[styles.iconWrap, { backgroundColor: form.bgColor }]}>
              <FormIcon icon={form.icon} color={form.color} size={28} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={1}>{form.title}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>{form.description}</Text>
            </View>
            <View style={styles.chevron}>
              <SimpleIcon name="chevron-right" size={18} color={Colors.textTertiary} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgApp,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  grid: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.sm,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  cardDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  chevron: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
