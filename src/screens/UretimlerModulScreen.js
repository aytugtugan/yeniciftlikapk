import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import SimpleIcon from '../components/SimpleIcon';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';

const modules = [
  {
    icon: 'inventory-2',
    title: 'Stok Listesi',
    description: 'Yeniçiftlik fabrikası stok durumunu görüntüle',
    route: 'StokListesi',
  },
  {
    icon: 'show-chart',
    title: 'Günlük Üretimler',
    description: 'Günlük üretim kayıtlarını görüntüle ve filtrele',
    route: 'GunlukUretimlerTab',
  },
  {
    icon: 'assignment',
    title: 'Emirler',
    description: 'Aktif üretim emirlerini istasyona göre görüntüle',
    route: 'EmirlerTab',
  },
  {
    icon: 'assessment',
    title: 'Üretim ve Tüketimler',
    description: 'Üretim ve tüketim özet raporlarını görüntüle',
    route: 'UretimTuketim',
  },
];

export default function UretimlerModulScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bgWhite} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.placeholder} activeOpacity={0.7}>
          <SimpleIcon name="arrow-back-ios" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Üretim Modülleri</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {modules.map((mod, index) => (
          <TouchableOpacity
            key={index}
            style={styles.moduleCard}
            onPress={() => navigation.navigate(mod.route)}
            activeOpacity={0.7}>
            <View style={styles.moduleIcon}>
              <SimpleIcon name={mod.icon} size={24} color={Colors.brandPrimary} />
            </View>
            <View style={styles.moduleContent}>
              <Text style={styles.moduleTitle}>{mod.title}</Text>
              <Text style={styles.moduleDescription}>{mod.description}</Text>
            </View>
            <SimpleIcon name="chevron_right" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgApp },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: Colors.bgWhite,
    borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  placeholder: { width: 40 },
  profileBtn: { width: 40, alignItems: 'center', padding: 4 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  moduleCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16,
    gap: 14, backgroundColor: Colors.bgWhite, ...Shadows.sm,
  },
  moduleIcon: {
    width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.brandPrimaryLight,
  },
  moduleContent: { flex: 1 },
  moduleTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  moduleDescription: { fontSize: 13, marginTop: 2, color: Colors.textSecondary },
});
