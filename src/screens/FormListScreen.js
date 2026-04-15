import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
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

const CARD_GAP = 12;
const CARD_PAD = 16;

const formCards = [
  { icon: 'flask', title: 'Bull-Dolum\nKontrol', color: '#7C3AED', bg: '#F3E8FF', route: 'BullDolumList' },
  { icon: 'box', title: 'Vardiya\nHammadde', color: '#059669', bg: '#ECFDF5', route: 'VardiyaHammadde' },
];

export default function FormListScreen() {
  const navigation = useNavigation();
  const { width: screenW } = useWindowDimensions();
  const numCols = screenW >= 600 ? 4 : 3;
  const cardSize = (screenW - CARD_PAD * 2 - CARD_GAP * (numCols - 1)) / numCols;

  const dynamicCards = FORM_DEFINITIONS
    .filter(f => !['bullBrix', 'dolumBrix', 'dolumBull', 'vardiyaHatDurum', 'vardiyaPaketleme', 'vardiyaHammadde', 'depoSevk', 'vardiyaRapor'].includes(f.key))
    .map(form => ({
      icon: form.icon,
      title: form.title.replace(/ /g, '\n'),
      color: form.color,
      bg: form.bgColor,
      formKey: form.key,
    }));

  const allCards = [...formCards, ...dynamicCards];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.placeholder} activeOpacity={0.7}>
          <SimpleIcon name="arrow-back-ios" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Formlar</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {allCards.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.card, { width: cardSize, height: cardSize }]}
              activeOpacity={0.7}
              onPress={() => {
                if (item.route) {
                  navigation.navigate(item.route);
                } else if (item.formKey) {
                  navigation.navigate('FormDetail', { formKey: item.formKey });
                }
              }}
            >
              <View style={[styles.iconWrap, { backgroundColor: item.bg }]}>
                <FormIcon icon={item.icon} color={item.color} size={24} />
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgApp },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, paddingTop: Spacing.lg,
    backgroundColor: Colors.bgWhite,
    borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  placeholder: { width: 40 },
  scrollContent: { padding: CARD_PAD, gap: 16, paddingBottom: 80 },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP,
  },
  card: {
    backgroundColor: Colors.bgWhite, borderRadius: 16,
    padding: 12, justifyContent: 'center', alignItems: 'center',
    ...Shadows.sm,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  cardTitle: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
});
