import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import SimpleIcon from '../components/SimpleIcon';
import { Colors, Shadows } from '../theme';

const CARD_GAP = 12;
const CARD_PAD = 16;

const modules = [
  { icon: 'assignment', title: 'Kalite\nKontrol Form', route: 'StationScan', color: '#7C3AED', bg: '#F3E8FF' },
  { icon: 'history', title: 'Form\nKayıtları', route: 'KaliteFormKayit', color: '#0095F6', bg: '#E8F4FD' },
];

export default function KaliteModulScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { width: screenW } = useWindowDimensions();
  const numCols = screenW >= 600 ? 4 : 3;
  const cardSize = (screenW - CARD_PAD * 2 - CARD_GAP * (numCols - 1)) / numCols;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bgWhite} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.placeholder} activeOpacity={0.7}>
          <SimpleIcon name="arrow-back-ios" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kalite Modülleri</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {modules.map((mod, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.card, { width: cardSize, height: cardSize }]}
              onPress={() => navigation.navigate(mod.route)}
              activeOpacity={0.7}
            >
              <View style={[styles.cardIcon, { backgroundColor: mod.bg }]}>
                <SimpleIcon name={mod.icon} size={24} color={mod.color} />
              </View>
              <Text style={styles.cardTitle}>{mod.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
  scrollView: { flex: 1 },
  scrollContent: { padding: CARD_PAD, gap: 16 },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP,
  },
  card: {
    backgroundColor: Colors.bgWhite, borderRadius: 16,
    padding: 12, justifyContent: 'center', alignItems: 'center',
    ...Shadows.sm,
  },
  cardIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  cardTitle: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
});
