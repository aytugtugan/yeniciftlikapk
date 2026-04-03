import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';
import { ScreenHeader, Card, Chip, EmptyState, ProgressBar, DropdownSelector, PrimaryButton, SecondaryButton } from '../components/ui';
import { SearchIcon, CloseIcon, ClipboardIcon } from '../components/Icons';
import { getUretimEmirleri } from '../api/apiService';

function OrderCard({ emir }) {
  const oran = emir.planMiktar > 0
    ? ((emir.uretilenMiktar / emir.planMiktar) * 100).toFixed(1)
    : 0;
  const pct = parseFloat(oran);
  const statusColor = pct >= 100 ? Colors.success : pct >= 50 ? Colors.warning : Colors.danger;
  const statusBg = pct >= 100 ? Colors.successLight : pct >= 50 ? Colors.warningLight : Colors.dangerLight;
  const statusLabel = pct >= 100 ? 'Tamamlandı' : pct >= 50 ? 'Devam Ediyor' : 'Başlangıç';

  return (
    <View style={styles.card}>
      {/* Top: Document number + Status */}
      <View style={styles.cardTop}>
        <View style={styles.fisNoWrap}>
          <Text style={styles.fisNoLabel}>FİŞ</Text>
          <Text style={styles.fisNoValue}>{emir.fisNo}</Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: statusBg }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Station & Product Info */}
      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>İSTASYON</Text>
          <Text style={styles.infoValue}>{emir.istasyonAdi}</Text>
          <Text style={styles.infoCode}>{emir.istasyonKodu}</Text>
        </View>
        <View style={styles.infoSep} />
        <View style={[styles.infoItem, { flex: 1.3 }]}>
          <Text style={styles.infoLabel}>ÜRÜN</Text>
          <Text style={styles.infoValue} numberOfLines={2}>{emir.urunAdi}</Text>
          <Text style={styles.infoCode}>{emir.urunKodu}</Text>
        </View>
      </View>

      {/* Numbers bar */}
      <View style={styles.numbersBar}>
        <View style={styles.numberItem}>
          <Text style={styles.numberLabel}>Planlanan</Text>
          <Text style={styles.numberValue}>{emir.planMiktar?.toLocaleString('tr-TR')}</Text>
        </View>
        <View style={styles.numberDivider} />
        <View style={styles.numberItem}>
          <Text style={styles.numberLabel}>Üretilen</Text>
          <Text style={[styles.numberValue, { color: statusColor }]}>
            {emir.uretilenMiktar?.toLocaleString('tr-TR')}
          </Text>
        </View>
        <View style={styles.numberDivider} />
        <View style={styles.numberItem}>
          <Text style={styles.numberLabel}>Kalan</Text>
          <Text style={styles.numberValue}>
            {Math.max(0, (emir.planMiktar || 0) - (emir.uretilenMiktar || 0)).toLocaleString('tr-TR')}
          </Text>
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressSection}>
        <ProgressBar percent={oran} height={5} />
      </View>
    </View>
  );
}

export default function UretimEmirleriScreen({ fabrika, istasyonlar }) {
  const [emirler, setEmirler] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIstasyon, setSelectedIstasyon] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showIstasyonPicker, setShowIstasyonPicker] = useState(false);

  const fetchEmirler = (isRefresh = false) => {
    if (!fabrika) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    const filters = { factoryCode: fabrika.fabrikaKodu };
    if (selectedIstasyon) filters.istasyonKodu = selectedIstasyon;
    getUretimEmirleri(filters)
      .then(data => setEmirler(data))
      .catch(err => console.error(err))
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { fetchEmirler(); }, [fabrika]);

  const handleReset = () => {
    setSelectedIstasyon('');
    setSearchText('');
    setShowIstasyonPicker(false);
  };

  const filteredEmirler = emirler.filter(e => {
    if (!searchText) return true;
    const s = searchText.toLowerCase();
    return (
      e.urunAdi?.toLowerCase().includes(s) ||
      e.urunKodu?.toLowerCase().includes(s) ||
      e.fisNo?.toLowerCase().includes(s)
    );
  });

  const selectedIstasyonLabel = selectedIstasyon
    ? istasyonlar.find(i => i.istasyonKodu === selectedIstasyon)?.istasyonAdi || selectedIstasyon
    : '';

  const istasyonOptions = [
    { key: 'all', value: '', label: 'Tüm İstasyonlar' },
    ...istasyonlar.map(ist => ({
      key: ist.istasyonKodu,
      value: ist.istasyonKodu,
      label: `${ist.istasyonAdi} (${ist.istasyonKodu})`,
    })),
  ];

  // Summary stats
  const totalPlan = emirler.reduce((s, e) => s + (e.planMiktar || 0), 0);
  const totalProduced = emirler.reduce((s, e) => s + (e.uretilenMiktar || 0), 0);
  const completedCount = emirler.filter(e => e.planMiktar > 0 && e.uretilenMiktar >= e.planMiktar).length;

  const ListHeader = () => (
    <View>
      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{emirler.length}</Text>
          <Text style={styles.statLabel}>Toplam Emir</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: Colors.success }]}>{completedCount}</Text>
          <Text style={styles.statLabel}>Tamamlanan</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: Colors.brandPrimary }]}>
            {totalPlan > 0 ? ((totalProduced / totalPlan) * 100).toFixed(0) : 0}%
          </Text>
          <Text style={styles.statLabel}>Genel Oran</Text>
        </View>
      </View>

      {/* Results count */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>{filteredEmirler.length} sonuç</Text>
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Text style={styles.clearSearch}>Temizle</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.pageTitle}>Üretim Emirleri</Text>
          <Chip label={fabrika?.fabrikaAdi} size="sm" />
        </View>
      </View>

      {/* Search & Filter Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <SearchIcon size={16} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Ürün, kod veya fiş no ara..."
            placeholderTextColor={Colors.textTertiary}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} style={{ paddingLeft: 8 }}>
              <CloseIcon size={14} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          <DropdownSelector
            label="İSTASYON"
            value={selectedIstasyonLabel}
            placeholder="Tüm İstasyonlar"
            isOpen={showIstasyonPicker}
            onToggle={() => setShowIstasyonPicker(!showIstasyonPicker)}
            options={istasyonOptions}
            selectedValue={selectedIstasyon}
            onSelect={(val) => { setSelectedIstasyon(val); setShowIstasyonPicker(false); }}
          />

          <View style={styles.filterButtons}>
            <TouchableOpacity style={styles.filterBtn} onPress={fetchEmirler} activeOpacity={0.7}>
              <Text style={styles.filterBtnText}>Filtrele</Text>
            </TouchableOpacity>
            {(selectedIstasyon || searchText) ? (
              <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.7}>
                <Text style={styles.resetBtnText}>Sıfırla</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.brandPrimary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEmirler}
          keyExtractor={(_, idx) => String(idx)}
          renderItem={({ item }) => <OrderCard emir={item} />}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <EmptyState
              icon={<ClipboardIcon size={28} color={Colors.textTertiary} />}
              title="Üretim emri bulunamadı"
              subtitle="Filtreleri değiştirmeyi deneyin"
            />
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchEmirler(true)} tintColor={Colors.brandPrimary} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgApp },

  // Header
  header: {
    backgroundColor: Colors.bgWhite,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  pageTitle: {
    ...Typography.title1,
  },

  // Search Section
  searchSection: {
    backgroundColor: Colors.bgWhite,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 40,
    marginBottom: Spacing.sm,
  },
  searchIcon: { marginRight: 8, opacity: 0.6 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    padding: 0,
  },
  searchClear: {
    fontSize: 14,
    color: Colors.textTertiary,
    paddingLeft: 8,
  },
  filterRow: {},
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    backgroundColor: Colors.brandPrimary,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  filterBtnText: {
    color: Colors.textWhite,
    fontWeight: '600',
    fontSize: 14,
  },
  resetBtn: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  resetBtnText: {
    color: Colors.textSecondary,
    fontWeight: '500',
    fontSize: 14,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  statLabel: {
    ...Typography.caption1,
    marginTop: 2,
    fontSize: 9,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 4,
  },

  // Results Bar
  resultsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingHorizontal: 2,
  },
  resultsText: {
    ...Typography.subhead,
  },
  clearSearch: {
    color: Colors.brandPrimary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Card
  card: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  fisNoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fisNoLabel: {
    ...Typography.caption1,
    fontSize: 9,
    color: Colors.textTertiary,
  },
  fisNoValue: {
    ...Typography.mono,
    fontWeight: '700',
    fontSize: 13,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.round,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Info Grid
  infoGrid: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  infoItem: {
    flex: 1,
  },
  infoSep: {
    width: 1,
    backgroundColor: Colors.borderLight,
  },
  infoLabel: {
    ...Typography.caption1,
    fontSize: 9,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 1,
  },
  infoCode: {
    ...Typography.mono,
    fontSize: 11,
    color: Colors.textTertiary,
  },

  // Numbers bar
  numbersBar: {
    flexDirection: 'row',
    backgroundColor: Colors.bgSurface,
    paddingVertical: Spacing.md,
  },
  numberItem: {
    flex: 1,
    alignItems: 'center',
  },
  numberLabel: {
    ...Typography.caption1,
    fontSize: 9,
    marginBottom: 2,
  },
  numberValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  numberDivider: {
    width: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 2,
  },

  // Progress
  progressSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },

  // List
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 24,
  },

  // Loading
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    ...Typography.subhead,
    color: Colors.brandPrimary,
  },
});