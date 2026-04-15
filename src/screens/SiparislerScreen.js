import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, Modal, RefreshControl, StatusBar, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import SimpleIcon from '../components/SimpleIcon';
import { Colors } from '../theme';
import { AppDataContext } from '../context/AppDataContext';
import { getSiparisler, getCariDetay } from '../api/oncuApi';

const STATUS_OPTIONS = [
  { value: '', label: 'Tümü' },
  { value: '1', label: 'Devam Ediyor' },
  { value: '4', label: 'Tamamlandı' },
];

const toDateStr = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const formatTRShort = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d)} ${TR_MONTHS[parseInt(m) - 1]} ${y}`;
};

const formatDateFull = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const raw = dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return dateStr; }
};

const formatMiktar = (val) => {
  if (val === null || val === undefined) return '-';
  if (val === 0) return '0';
  return val.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

export default function SiparislerScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { oncuToken } = useContext(AppDataContext);

  const todayStr = toDateStr(new Date());
  const monthStartStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;

  // Filter UI state
  const [status, setStatus] = useState('');
  const [cariKodu, setCariKodu] = useState(route.params?.cariKodu || '');
  const [siparisNo, setSiparisNo] = useState('');
  const [startDate, setStartDate] = useState(monthStartStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(null); // 'start' | 'end' | null
  const [pendingDate, setPendingDate] = useState(null);

  // Applied filter ref (sent to API)
  const appliedRef = useRef({
    status: '',
    cariKodu: route.params?.cariKodu || '',
    siparisNo: '',
    startDate: monthStartStr,
    endDate: todayStr,
  });

  // Data state
  const [orders, setOrders] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pageSize = 50;
  const totalPages = totalRows > 0 ? Math.ceil(totalRows / pageSize) : 1;

  // Cari adı cache
  const cariAdiCache = useRef({});

  const loadOrders = useCallback(async (pageNum, isRefresh = false) => {
    if (!oncuToken) return;
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    const f = appliedRef.current;
    try {
      const data = await getSiparisler(oncuToken, {
        page: pageNum,
        pageSize,
        status: f.status || undefined,
        cariKodu: f.cariKodu.trim() || undefined,
        siparisNo: f.siparisNo.trim() || undefined,
        startDate: f.startDate || undefined,
        endDate: f.endDate || undefined,
      });
      const items = data?.items || [];
      setOrders(items);
      setTotalRows(data?.totalRows || 0);
      setPage(pageNum);

      // Cari adlarını arka planda çek
      const uniqueCaris = [...new Set(items.map(i => i.cariKodu).filter(Boolean))];
      const missing = uniqueCaris.filter(c => !cariAdiCache.current[c]);
      if (missing.length > 0) {
        const results = await Promise.allSettled(
          missing.map(c => getCariDetay(oncuToken, c))
        );
        results.forEach((r, idx) => {
          if (r.status === 'fulfilled' && r.value?.cariAdi) {
            cariAdiCache.current[missing[idx]] = r.value.cariAdi;
          }
        });
      }
      // Her zaman cache'deki cari adlarını uygula
      setOrders(prev => prev.map(o => ({
        ...o,
        cariAdi: cariAdiCache.current[o.cariKodu] || '',
      })));
    } catch (err) {
      console.log('Siparişler yükleme hatası:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [oncuToken]);

  useEffect(() => { loadOrders(1); }, [loadOrders]);

  const handleGetir = () => {
    appliedRef.current = { status, cariKodu, siparisNo, startDate, endDate };
    loadOrders(1);
  };
  const handleYenile = () => loadOrders(page, true);
  const handleTemizle = () => {
    setStatus(''); setCariKodu(''); setSiparisNo('');
    setStartDate(monthStartStr); setEndDate(todayStr);
    appliedRef.current = { status: '', cariKodu: '', siparisNo: '', startDate: monthStartStr, endDate: todayStr };
    loadOrders(1);
  };
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) loadOrders(newPage);
  };

  const selectedStatusLabel = STATUS_OPTIONS.find(o => o.value === status)?.label || 'Tümü';

  const renderRow = ({ item, index }) => {
    const isCompleted = !item.devamEdiyor;
    return (
      <TouchableOpacity
        style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }]}
        onPress={() => navigation.navigate('SiparisDetay', { siparisNo: item.siparisNo })}
        activeOpacity={0.7}>
        <Text style={[styles.cell, styles.colNo]} numberOfLines={1}>{item.siparisNo}</Text>
        <Text style={[styles.cell, styles.colMusteri]} numberOfLines={1}>{item.cariKodu}</Text>
        <Text style={[styles.cell, styles.colCariAdi]} numberOfLines={1}>{item.cariAdi || '-'}</Text>
        <Text style={[styles.cell, styles.colOdeme]} numberOfLines={1}>{item.odemePlani || '-'}</Text>
        <Text style={[styles.cell, styles.colTarih]} numberOfLines={1}>{formatDateFull(item.siparisTarihi)}</Text>
        <Text style={[styles.cell, styles.colMiktar, { textAlign: 'right' }]} numberOfLines={1}>
          {formatMiktar(item.toplamSiparisMiktari)}
        </Text>
        <View style={[styles.cell, styles.colDurum]}>
          <View style={[styles.statusBadge, { backgroundColor: isCompleted ? '#E8F5E9' : '#FFF8E1' }]}>
            <View style={[styles.statusDot, { backgroundColor: isCompleted ? '#4CAF50' : '#FF9800' }]} />
            <Text style={[styles.statusText, { color: isCompleted ? '#2E7D32' : '#E65100' }]}>
              {isCompleted ? 'Tamamlandı' : 'Devam Ediyor'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <SimpleIcon name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Siparişler</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Filter Panel */}
      <View style={styles.filterPanel}>
        <View style={styles.filterRow}>
          {/* DURUM */}
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>DURUM</Text>
            <TouchableOpacity style={styles.filterSelect} onPress={() => setShowStatusPicker(true)} activeOpacity={0.7}>
              <Text style={styles.filterSelectText}>{selectedStatusLabel}</Text>
              <SimpleIcon name="arrow-drop-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          {/* CARİ KODU */}
          <View style={[styles.filterField, { flex: 2 }]}>
            <Text style={styles.filterLabel}>CARİ KODU</Text>
            <TextInput
              style={styles.filterInput}
              value={cariKodu}
              onChangeText={setCariKodu}
              placeholder="Cari kodu..."
              placeholderTextColor="#AAA"
              autoCapitalize="characters"
              returnKeyType="search"
              onSubmitEditing={handleGetir}
            />
          </View>
          {/* SİPARİŞ NO */}
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>SİPARİŞ NO</Text>
            <TextInput
              style={styles.filterInput}
              value={siparisNo}
              onChangeText={setSiparisNo}
              placeholder="Sipariş no..."
              placeholderTextColor="#AAA"
              autoCapitalize="characters"
              returnKeyType="search"
              onSubmitEditing={handleGetir}
            />
          </View>
        </View>
        <View style={styles.filterRow}>
          {/* Başlangıç */}
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>BAŞLANGIÇ</Text>
            <TouchableOpacity
              style={styles.filterSelect}
              onPress={() => { setPendingDate(startDate ? new Date(startDate + 'T00:00:00') : new Date()); setShowDatePicker('start'); }}
              activeOpacity={0.7}>
              <Text style={[styles.filterSelectText, !startDate && { color: '#AAA' }]}>{startDate ? formatTRShort(startDate) : 'Seçiniz'}</Text>
              <SimpleIcon name="event" size={15} color="#666" />
            </TouchableOpacity>
          </View>
          {/* Bitiş */}
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>BİTİŞ</Text>
            <TouchableOpacity
              style={styles.filterSelect}
              onPress={() => { setPendingDate(endDate ? new Date(endDate + 'T00:00:00') : new Date()); setShowDatePicker('end'); }}
              activeOpacity={0.7}>
              <Text style={[styles.filterSelectText, !endDate && { color: '#AAA' }]}>{endDate ? formatTRShort(endDate) : 'Seçiniz'}</Text>
              <SimpleIcon name="event" size={15} color="#666" />
            </TouchableOpacity>
          </View>
          {/* Buttons */}
          <View style={[styles.filterField, { flex: 2, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }]}>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleGetir} activeOpacity={0.8}>
              <SimpleIcon name="search" size={15} color="#FFF" />
              <Text style={styles.btnPrimaryText}>Getir</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={handleYenile} activeOpacity={0.8}>
              <SimpleIcon name="refresh" size={15} color="#444" />
              <Text style={styles.btnOutlineText}>Yenile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={handleTemizle} activeOpacity={0.8}>
              <SimpleIcon name="close" size={13} color="#444" />
              <Text style={styles.btnOutlineText}>Temizle</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.cellHeader, styles.colNo]}>FİŞ NO</Text>
        <Text style={[styles.cellHeader, styles.colMusteri]}>CARİ KODU</Text>
        <Text style={[styles.cellHeader, styles.colCariAdi]}>CARİ ADI</Text>
        <Text style={[styles.cellHeader, styles.colOdeme]}>ÖDEME PLANI</Text>
        <Text style={[styles.cellHeader, styles.colTarih]}>TARİH</Text>
        <Text style={[styles.cellHeader, styles.colMiktar, { textAlign: 'right' }]}>TOPLAM MİKTAR</Text>
        <Text style={[styles.cellHeader, styles.colDurum]}>DURUM</Text>
      </View>

      {/* Table Body */}
      {isLoading && orders.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.brandPrimary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderRow}
          keyExtractor={item => String(item.siparisNo)}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleYenile}
              colors={[Colors.brandPrimary]}
              tintColor={Colors.brandPrimary}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <SimpleIcon name="inbox" size={56} color="#CCC" />
              <Text style={styles.emptyText}>Sipariş bulunamadı</Text>
            </View>
          }
        />
      )}

      {/* Pagination Footer */}
      {totalRows > 0 && (
        <View style={styles.pagination}>
          <Text style={styles.paginationInfo}>
            Toplam{' '}<Text style={{ fontWeight: '700', color: '#1A1A1A' }}>{totalRows}</Text>{' '}kayıt
            {'   '}
            <Text style={{ color: '#999' }}>
              {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalRows)}
            </Text>
          </Text>
          <View style={styles.paginationBtns}>
            <TouchableOpacity
              style={[styles.pageBtn, { opacity: page <= 1 ? 0.4 : 1 }]}
              onPress={() => handlePageChange(page - 1)} disabled={page <= 1}>
              <SimpleIcon name="chevron-left" size={22} color="#444" />
            </TouchableOpacity>
            <View style={styles.pageIndicator}>
              <Text style={styles.pageIndicatorText}>{page} / {totalPages}</Text>
            </View>
            <TouchableOpacity
              style={[styles.pageBtn, { opacity: page >= totalPages ? 0.4 : 1 }]}
              onPress={() => handlePageChange(page + 1)} disabled={page >= totalPages}>
              <SimpleIcon name="chevron-right" size={22} color="#444" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Status Picker Modal */}
      <Modal visible={showStatusPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStatusPicker(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Durum Seçin</Text>
            {STATUS_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={styles.pickerOption}
                onPress={() => { setStatus(opt.value); setShowStatusPicker(false); }}
                activeOpacity={0.7}>
                <View style={[styles.pickerRadio, status === opt.value && styles.pickerRadioActive]}>
                  {status === opt.value && <View style={styles.pickerRadioDot} />}
                </View>
                <Text style={[
                  styles.pickerOptionText,
                  status === opt.value && { fontWeight: '700', color: Colors.brandPrimary },
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date Picker — Android */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={pendingDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(null);
            if (event.type === 'dismissed' || !date) { setPendingDate(null); return; }
            const str = toDateStr(date);
            if (showDatePicker === 'start') setStartDate(str);
            else setEndDate(str);
            setPendingDate(null);
          }}
        />
      )}

      {/* Date Picker — iOS */}
      {showDatePicker && Platform.OS === 'ios' && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.pickerSheet}>
              <Text style={styles.pickerTitle}>Tarih Seçin</Text>
              <DateTimePicker
                value={pendingDate || new Date()}
                mode="date"
                display="spinner"
                themeVariant="light"
                locale="tr"
                onChange={(_, date) => { if (date) setPendingDate(date); }}
                style={{ height: 180 }}
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnOutline, { flex: 1 }]}
                  onPress={() => { setShowDatePicker(null); setPendingDate(null); }}>
                  <Text style={styles.btnOutlineText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary, { flex: 1 }]}
                  onPress={() => {
                    if (pendingDate) {
                      const str = toDateStr(pendingDate);
                      if (showDatePicker === 'start') setStartDate(str);
                      else setEndDate(str);
                    }
                    setShowDatePicker(null); setPendingDate(null);
                  }}>
                  <Text style={styles.btnPrimaryText}>Seç</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0',
  },
  backBtn: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#1A1A1A', textAlign: 'center' },
  // Filter Panel
  filterPanel: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E8E8E8',
    paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  filterRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  filterField: { flex: 1, gap: 3 },
  filterLabel: { fontSize: 10, fontWeight: '700', color: '#888', letterSpacing: 0.5, marginBottom: 2 },
  filterInput: {
    height: 36, borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, fontSize: 13, color: '#1A1A1A', backgroundColor: '#FAFAFA',
  },
  filterSelect: {
    height: 36, borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', backgroundColor: '#FAFAFA',
  },
  filterSelectText: { fontSize: 13, color: '#1A1A1A', flex: 1 },
  // Buttons
  btn: {
    height: 36, borderRadius: 6, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 10, gap: 4,
  },
  btnPrimary: { backgroundColor: '#E53E3E', flex: 1 },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  btnOutline: { borderWidth: 1, borderColor: '#CCC', flex: 1, backgroundColor: '#FFF' },
  btnOutlineText: { color: '#444', fontSize: 13, fontWeight: '500' },
  // Table
  tableHeader: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 9,
    backgroundColor: '#F0F0F0', borderBottomWidth: 1, borderBottomColor: '#DCDCDC',
  },
  cellHeader: { fontSize: 10, fontWeight: '700', color: '#555', letterSpacing: 0.4 },
  tableRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 11,
    borderBottomWidth: 0.5, borderBottomColor: '#EEEEEE', alignItems: 'center',
  },
  cell: { fontSize: 13, color: '#1A1A1A' },
  // Column widths
  colNo: { width: 130, paddingRight: 8 },
  colMusteri: { width: 120, paddingRight: 8 },
  colCariAdi: { flex: 1, paddingRight: 8 },
  colOdeme: { width: 75, paddingRight: 8 },
  colTarih: { width: 105, paddingRight: 8 },
  colMiktar: { width: 115, paddingRight: 8 },
  colDurum: { width: 120 },
  // Status badge
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  // Center / Empty
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyText: { fontSize: 15, color: '#999' },
  // Pagination
  pagination: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5, borderTopColor: '#E0E0E0',
  },
  paginationInfo: { fontSize: 13, color: '#888' },
  paginationBtns: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pageBtn: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center', borderRadius: 6 },
  pageIndicator: {
    paddingHorizontal: 12, height: 34, justifyContent: 'center', alignItems: 'center',
    borderRadius: 6, backgroundColor: '#F0F0F0',
  },
  pageIndicatorText: { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  pickerSheet: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: 280, gap: 2 },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  pickerOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0',
  },
  pickerRadio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: '#CCC', justifyContent: 'center', alignItems: 'center',
  },
  pickerRadioActive: { borderColor: Colors.brandPrimary },
  pickerRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.brandPrimary },
  pickerOptionText: { fontSize: 15, color: '#333' },
});
