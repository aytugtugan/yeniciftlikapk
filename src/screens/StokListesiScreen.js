import React, { useState, useEffect, useCallback, useRef, useContext, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  FlatList,
  useWindowDimensions,
  RefreshControl,
  StatusBar,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import SimpleIcon from '../components/SimpleIcon';
import { Colors } from '../theme';
import { AppDataContext } from '../context/AppDataContext';
import { getOncuStokEnvanter } from '../api/oncuApi';

const FABRIKA_ID = 4; // Yeniçiftlik fabrika id

const primaryColor = '#E53E3E';
const surfaceColor = '#FFFFFF';
const textColor = '#1A1A1A';
const secondaryTextColor = '#666666';
const borderColor = '#EEEEEE';

// Row components OUTSIDE the main component to prevent re-creation on every render
const CompactTableRow = memo(({ item, index }) => (
  <View style={[styles.compactRow, { backgroundColor: index % 2 === 0 ? surfaceColor : '#F8F8F8' }]}>
    <View style={styles.compactRowTop}>
      <Text style={[styles.compactCode, { color: primaryColor }]} numberOfLines={1}>
        {item.urunKodu}
      </Text>
      <View style={styles.compactRowRight}>
        <View style={[
          styles.stockBadge,
          { backgroundColor: item.eldekiMiktar > 0 ? 'rgba(46, 125, 50, 0.1)' : 'rgba(198, 40, 40, 0.1)' },
        ]}>
          <Text style={[
            styles.stockBadgeText,
            { color: item.eldekiMiktar > 0 ? '#2E7D32' : '#C62828' },
          ]}>
            {item.eldekiMiktar?.toLocaleString('tr-TR') || '0'}
          </Text>
        </View>
      </View>
    </View>
    <Text style={[styles.compactName, { color: textColor }]} numberOfLines={2}>
      {item.urunAdi}
    </Text>
  </View>
));

const DesktopTableRow = memo(({ item, index }) => (
  <View style={[
    styles.desktopRow,
    {
      backgroundColor: index % 2 === 0 ? surfaceColor : '#FAFAFA',
      borderBottomColor: borderColor,
    },
  ]}>
    <Text style={[styles.cellText, styles.codeCol, styles.codeText, { color: primaryColor }]} numberOfLines={1}>
      {item.urunKodu}
    </Text>
    <Text style={[styles.cellText, styles.nameCol, { color: textColor }]} numberOfLines={1}>
      {item.urunAdi}
    </Text>
    <View style={[styles.stockCol, styles.stockCellContainer]}>
      <Text style={[
        styles.stockText,
        { color: item.eldekiMiktar > 0 ? '#2E7D32' : '#C62828' },
      ]}>
        {item.eldekiMiktar?.toLocaleString('tr-TR') || '0'}
      </Text>
    </View>
  </View>
));

export default function StokListesiScreen() {
  const navigation = useNavigation();
  const { oncuToken } = useContext(AppDataContext);
  const { width } = useWindowDimensions();
  const isCompact = width < 600;

  const primaryColor = '#E53E3E';
  const surfaceColor = '#FFFFFF';
  const textColor = '#1A1A1A';
  const secondaryTextColor = '#666666';
  const borderColor = '#EEEEEE';

  // States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [productCode, setProductCode] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const pageSize = 50;
  const totalPages = totalRows > 0 ? Math.ceil(totalRows / pageSize) : 1;

  // Refs
  const searchInputRef = useRef(null);
  const productCodeInputRef = useRef(null);
  const latestFilters = useRef({ searchQuery: '', productCode: '' });

  useEffect(() => {
    loadStocks();
  }, [oncuToken, page]);

  const loadStocks = async () => {
    if (!oncuToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getOncuStokEnvanter(oncuToken, {
        page,
        pageSize,
        fabrikaId: FABRIKA_ID,
        q: latestFilters.current.searchQuery.trim() || undefined,
        urunKodu: latestFilters.current.productCode.trim() || undefined,
      });
      setStocks(response.items || []);
      setTotalRows(response.totalRows || 0);
    } catch (err) {
      console.error('Error loading stocks:', err);
      setError(err.message || 'Stoklar yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    latestFilters.current = { searchQuery, productCode };
    setPage(1);
    setShowFilterSheet(false);
    Keyboard.dismiss();
    searchInputRef.current?.blur();
    productCodeInputRef.current?.blur();
    loadStocks();
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      setPage(newPage);
    }
  };

  // Desktop Table Header
  const DesktopTableHeader = () => (
    <View style={[styles.desktopHeader, { borderBottomColor: borderColor }]}>
      <Text style={[styles.headerText, styles.codeCol, { color: secondaryTextColor }]}>ÜRÜN KODU</Text>
      <Text style={[styles.headerText, styles.nameCol, { color: secondaryTextColor }]}>ÜRÜN ADI</Text>
      <Text style={[styles.headerText, styles.stockCol, { color: secondaryTextColor, textAlign: 'right' }]}>STOK</Text>
    </View>
  );

  // Pagination
  const PaginationBar = () => {
    if (stocks.length === 0 && totalRows === 0) return null;

    return (
      <View style={[styles.pagination, { borderTopColor: borderColor }]}>
        <View style={styles.paginationLeft}>
          <Text style={[styles.paginationText, { color: secondaryTextColor }]}>
            {`${((page - 1) * pageSize) + 1}-${Math.min(page * pageSize, totalRows)}`}
            <Text style={{ color: textColor, fontWeight: '600' }}> / {totalRows}</Text>
          </Text>
        </View>

        <View style={styles.paginationRight}>
          <TouchableOpacity
            style={[styles.paginationBtn, { opacity: page <= 1 ? 0.4 : 1 }]}
            onPress={() => handlePageChange(page - 1)}
            disabled={page <= 1}
          >
            <SimpleIcon name="chevron-left" size={24} color={textColor} />
          </TouchableOpacity>

          <View style={[styles.pageIndicator, { backgroundColor: '#F0F0F0' }]}>
            <Text style={[styles.pageIndicatorText, { color: textColor }]}>{page}</Text>
          </View>

          <TouchableOpacity
            style={[styles.paginationBtn, { opacity: page >= totalPages ? 0.4 : 1 }]}
            onPress={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <SimpleIcon name="chevron-right" size={24} color={textColor} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bgWhite} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <SimpleIcon name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stok Listesi</Text>
        <TouchableOpacity
          style={styles.headerRightBtn}
          onPress={() => { Keyboard.dismiss(); setShowFilterSheet(!showFilterSheet); }}
        >
          <SimpleIcon name="tune" size={22} color={textColor} />
        </TouchableOpacity>
      </View>

      {/* Filter Sheet */}
      {showFilterSheet && (
        <View style={[styles.filterSheet, { borderBottomColor: borderColor }]}>
          <View style={styles.searchRow}>
            <View style={[styles.searchInput, { flex: 1 }]}>
              <SimpleIcon name="search" size={18} color={secondaryTextColor} />
              <TextInput
                ref={searchInputRef}
                style={[styles.searchInputText, { color: textColor }]}
                placeholder="Ara..."
                placeholderTextColor={secondaryTextColor}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <SimpleIcon name="close" size={18} color={secondaryTextColor} />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={[styles.searchInput, { flex: 1 }]}>
              <SimpleIcon name="qr-code" size={18} color={secondaryTextColor} />
              <TextInput
                ref={productCodeInputRef}
                style={[styles.searchInputText, { color: textColor }]}
                placeholder="Ürün Kodu"
                placeholderTextColor={secondaryTextColor}
                value={productCode}
                onChangeText={setProductCode}
                onSubmitEditing={handleSearch}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {productCode ? (
                <TouchableOpacity onPress={() => setProductCode('')}>
                  <SimpleIcon name="close" size={18} color={secondaryTextColor} />
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.searchBtn, { backgroundColor: primaryColor }]}
              onPress={handleSearch}
            >
              <SimpleIcon name="search" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isLoading && stocks.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={[styles.loadingText, { color: secondaryTextColor }]}>Yükleniyor...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <SimpleIcon name="error-outline" size={56} color={primaryColor} />
          <Text style={[styles.errorText, { color: textColor }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: primaryColor }]} onPress={loadStocks}>
            <Text style={styles.retryBtnText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : stocks.length === 0 ? (
        <View style={styles.centerContainer}>
          <SimpleIcon name="inventory-2" size={56} color={secondaryTextColor} />
          <Text style={[styles.emptyText, { color: secondaryTextColor }]}>Stok bulunamadı</Text>
        </View>
      ) : isCompact ? (
        <FlatList
          style={{ flex: 1 }}
          data={stocks}
          keyExtractor={(item, index) => `${item.urunKodu}-${index}`}
          renderItem={({ item, index }) => <CompactTableRow item={item} index={index} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={loadStocks} colors={[primaryColor]} />
          }
        />
      ) : (
        <View style={styles.tableContainer}>
          <DesktopTableHeader />
          <FlatList
            style={{ flex: 1 }}
            data={stocks}
            keyExtractor={(item, index) => `${item.urunKodu}-${index}`}
            renderItem={({ item, index }) => <DesktopTableRow item={item} index={index} />}
            showsVerticalScrollIndicator={false}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={loadStocks} colors={[primaryColor]} />
            }
          />
        </View>
      )}

      <PaginationBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#EEEEEE',
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginLeft: 4,
  },
  headerRightBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Center
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 16,
    marginTop: 8,
  },
  retryBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  // Filter Sheet
  filterSheet: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    gap: 12,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    gap: 8,
  },
  searchInputText: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // List
  listContent: {
    paddingBottom: 8,
  },
  // Compact Row (Mobile)
  compactRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  compactRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactRowRight: {
    flexShrink: 0,
    marginLeft: 12,
  },
  compactCode: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'monospace',
    flexShrink: 1,
  },
  stockBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'flex-end',
  },
  stockBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  compactName: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Desktop Table
  tableContainer: {
    flex: 1,
  },
  desktopHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  desktopRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    alignItems: 'center',
  },
  cellText: {
    fontSize: 14,
  },
  codeCol: {
    width: 150,
    paddingRight: 12,
  },
  codeText: {
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  nameCol: {
    flex: 1,
    paddingRight: 12,
  },
  stockCol: {
    width: 140,
    paddingLeft: 8,
  },
  stockCellContainer: {
    alignItems: 'flex-end',
  },
  stockText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  // Pagination
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
  },
  paginationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paginationText: {
    fontSize: 13,
  },
  paginationRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paginationBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageIndicator: {
    minWidth: 40,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  pageIndicatorText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
