import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  FlatList, RefreshControl, Platform, ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SimpleIcon from '../components/SimpleIcon';
import { Colors } from '../theme';
import { AppDataContext } from '../context/AppDataContext';
import { getSevkiyatDetay } from '../api/oncuApi';

const HIDDEN_FIELDS = new Set(['lineRef', 'lineref', 'LineRef', 'line_ref']);
const PER_ITEM_KEYS = new Set([
  'stokKodu', 'stokAdi', 'miktar', 'birim', 'birimKodu', 'birimFiyat', 'tutar',
  'kalanMiktar', 'lotNo', 'parti', 'aciklama',
]);

export default function SevkiyatDetayScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { oncuToken } = useContext(AppDataContext);

  const { irsaliyeNo, musteriAdi } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [rawResponse, setRawResponse] = useState(null);

  const accent = '#E11D48';
  const emerald = '#059669';
  const blue = '#2563EB';
  const amber = '#D97706';

  const loadDetay = useCallback(async (isRefresh = false) => {
    if (!oncuToken || !irsaliyeNo) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await getSevkiyatDetay(oncuToken, irsaliyeNo);
      if (Array.isArray(res)) {
        setItems(res); setRawResponse(null);
      } else if (res && typeof res === 'object') {
        const possibleArr = res.items || res.data || res.detaylar || res.result;
        if (Array.isArray(possibleArr)) { setItems(possibleArr); setRawResponse(null); }
        else { setItems([]); setRawResponse(res); }
      }
    } catch (e) { setError(e.message || 'Detay yüklenirken hata oluştu'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [oncuToken, irsaliyeNo]);

  useEffect(() => { loadDetay(); }, [loadDetay]);

  const stats = useMemo(() => {
    const topMiktar = items.reduce((s, i) => s + (i.miktar ?? 0), 0);
    const topTutar = items.reduce((s, i) => s + (i.tutar ?? 0), 0);
    return { count: items.length, topMiktar, topTutar };
  }, [items]);

  const commonFields = useMemo(() => {
    if (items.length === 0) return [];
    const allExtraKeys = new Set();
    items.forEach(item => {
      Object.keys(item).forEach(k => {
        if (!PER_ITEM_KEYS.has(k) && !HIDDEN_FIELDS.has(k) && item[k] != null && item[k] !== '') allExtraKeys.add(k);
      });
    });
    const common = [];
    allExtraKeys.forEach(key => {
      const firstVal = items[0]?.[key];
      if (firstVal == null || firstVal === '') return;
      const allSame = items.every(item => item[key] === firstVal);
      if (allSame) common.push({ key, value: firstVal });
    });
    return common;
  }, [items]);

  const commonKeySet = useMemo(() => new Set(commonFields.map(f => f.key)), [commonFields]);

  const fmt = (n) => {
    if (n == null || isNaN(n)) return '-';
    return n.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
  };

  const formatValue = (key, val) => {
    if (val == null) return '-';
    if (typeof val === 'number') return fmt(val);
    if (typeof val === 'boolean') return val ? 'Evet' : 'Hayır';
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      try { return new Date(val).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }); }
      catch { return val; }
    }
    return String(val);
  };

  const humanizeKey = (key) => {
    const map = {
      stokKodu: 'Stok Kodu', stokAdi: 'Stok Adı', miktar: 'Miktar', birim: 'Birim',
      birimFiyat: 'Birim Fiyat', tutar: 'Tutar', lotNo: 'Lot No', parti: 'Parti',
      aciklama: 'Açıklama', musteriAdi: 'Müşteri', irsaliyeNo: 'İrsaliye No',
      fabrikaAdi: 'Fabrika', birimKodu: 'Birim Kodu', kalanMiktar: 'Kalan Miktar',
      sevkAdresi: 'Sevk Adresi', plasiyer: 'Plasiyer', tarih: 'Tarih', sevkTarihi: 'Sevk Tarihi',
    };
    return map[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
  };

  const renderHeaderCard = () => (
    <View style={[st.headerCard, { backgroundColor: Colors.bgWhite, borderColor: Colors.borderLight }]}>
      <View style={st.headerRow1}>
        <View style={[st.irsaliyeBadge, { backgroundColor: 'rgba(225,29,72,0.06)' }]}>
          <SimpleIcon name="receipt_long" size={16} color={accent} />
          <Text style={[st.irsaliyeTxt, { color: accent }]}>{irsaliyeNo}</Text>
        </View>
      </View>
      {musteriAdi ? (
        <View style={st.headerRow2}>
          <SimpleIcon name="storefront" size={18} color={Colors.textSecondary} />
          <Text style={[st.musteriTxt, { color: Colors.textPrimary }]}>{musteriAdi}</Text>
        </View>
      ) : null}
      {commonFields.length > 0 && (
        <View style={[st.commonSection, { borderTopColor: Colors.borderLight }]}>
          {commonFields.map(f => (
            <View key={f.key} style={st.commonRow}>
              <Text style={[st.commonKey, { color: Colors.textSecondary }]}>{humanizeKey(f.key)}</Text>
              <Text style={[st.commonVal, { color: Colors.textPrimary }]}>{formatValue(f.key, f.value)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderStats = () => (
    <View style={[st.statsRow, { borderBottomColor: Colors.borderLight }]}>
      <View style={[st.statBox, { backgroundColor: 'rgba(217,119,6,0.08)' }]}>
        <SimpleIcon name="list_alt" size={18} color={amber} />
        <Text style={[st.statVal, { color: amber }]}>{stats.count}</Text>
        <Text style={[st.statLbl, { color: amber }]}>Kalem</Text>
      </View>
      <View style={[st.statBox, { backgroundColor: 'rgba(5,150,105,0.08)' }]}>
        <SimpleIcon name="inventory" size={18} color={emerald} />
        <Text style={[st.statVal, { color: emerald }]}>{fmt(stats.topMiktar)}</Text>
        <Text style={[st.statLbl, { color: emerald }]}>Miktar</Text>
      </View>
      {stats.topTutar > 0 && (
        <View style={[st.statBox, { backgroundColor: 'rgba(37,99,235,0.06)' }]}>
          <SimpleIcon name="payments" size={18} color={blue} />
          <Text style={[st.statVal, { color: blue }]}>₺{fmt(stats.topTutar)}</Text>
          <Text style={[st.statLbl, { color: blue }]}>Tutar</Text>
        </View>
      )}
    </View>
  );

  const renderItem = ({ item, index }) => {
    const extraFields = [];
    Object.keys(item).forEach(k => {
      if (!PER_ITEM_KEYS.has(k) && !HIDDEN_FIELDS.has(k) && !commonKeySet.has(k) && item[k] != null && item[k] !== '') {
        extraFields.push({ key: k, value: item[k] });
      }
    });

    return (
      <View style={[st.detayCard, { backgroundColor: Colors.bgWhite, borderColor: Colors.borderLight }]}>
        <View style={[st.seqBadge, { backgroundColor: Colors.bgApp }]}>
          <Text style={[st.seqTxt, { color: Colors.textSecondary }]}>#{index + 1}</Text>
        </View>
        {item.stokKodu ? (
          <View style={[st.codeBadge, { backgroundColor: Colors.bgApp, alignSelf: 'flex-start' }]}>
            <SimpleIcon name="qr_code" size={12} color={Colors.textSecondary} />
            <Text style={[st.codeTxt, { color: Colors.textPrimary }]}>{item.stokKodu}</Text>
          </View>
        ) : null}
        {item.stokAdi ? (
          <Text style={[st.stokAdi, { color: Colors.textPrimary }]} numberOfLines={2}>{item.stokAdi}</Text>
        ) : null}
        {(item.lotNo || item.parti) && (
          <View style={st.codeRow}>
            {item.lotNo ? (
              <View style={[st.codeBadge, { backgroundColor: 'rgba(217,119,6,0.08)' }]}>
                <Text style={[st.codeTxt, { color: amber }]}>LOT: {item.lotNo}</Text>
              </View>
            ) : null}
            {item.parti ? (
              <View style={[st.codeBadge, { backgroundColor: 'rgba(37,99,235,0.06)' }]}>
                <Text style={[st.codeTxt, { color: blue }]}>Parti: {item.parti}</Text>
              </View>
            ) : null}
          </View>
        )}
        <View style={st.metricRow}>
          {item.miktar != null && (
            <View style={[st.metricBox, { backgroundColor: 'rgba(5,150,105,0.08)' }]}>
              <Text style={[st.metricLabel, { color: emerald }]}>Miktar</Text>
              <Text style={[st.metricValue, { color: emerald }]}>{fmt(item.miktar)}{item.birim ? ` ${item.birim}` : ''}</Text>
            </View>
          )}
          {item.birimFiyat != null && (
            <View style={[st.metricBox, { backgroundColor: Colors.bgApp }]}>
              <Text style={[st.metricLabel, { color: Colors.textSecondary }]}>Birim Fiyat</Text>
              <Text style={[st.metricValue, { color: Colors.textPrimary }]}>₺{fmt(item.birimFiyat)}</Text>
            </View>
          )}
          {item.tutar != null && (
            <View style={[st.metricBox, { backgroundColor: 'rgba(37,99,235,0.06)' }]}>
              <Text style={[st.metricLabel, { color: blue }]}>Tutar</Text>
              <Text style={[st.metricValue, { color: blue }]}>₺{fmt(item.tutar)}</Text>
            </View>
          )}
        </View>
        {extraFields.length > 0 && (
          <View style={[st.extraSection, { borderTopColor: Colors.borderLight }]}>
            {extraFields.map(f => (
              <View key={f.key} style={st.extraRow}>
                <Text style={[st.extraKey, { color: Colors.textSecondary }]}>{humanizeKey(f.key)}</Text>
                <Text style={[st.extraVal, { color: Colors.textPrimary }]}>{formatValue(f.key, f.value)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[st.root, { backgroundColor: Colors.bgApp }]}>
      <View style={[st.hdr, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={st.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <SimpleIcon name="arrow_back_ios" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={st.hdrTitle}>Sevkiyat Detay</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={st.center}>
          <ActivityIndicator size="large" color={accent} />
          <Text style={[st.centerTxt, { color: Colors.textSecondary }]}>Detaylar yükleniyor...</Text>
        </View>
      ) : error ? (
        <View style={st.center}>
          <SimpleIcon name="error_outline" size={40} color={accent} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.textPrimary }}>Hata</Text>
          <Text style={{ fontSize: 13, color: Colors.textSecondary, textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity style={[st.retryBtn, { backgroundColor: accent }]} onPress={() => loadDetay()}>
            <Text style={{ color: '#FFF', fontWeight: '600' }}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <>
          {renderHeaderCard()}
          <View style={st.center}>
            <SimpleIcon name="inbox" size={44} color={Colors.textSecondary} />
            <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.textPrimary }}>Detay Bulunamadı</Text>
          </View>
        </>
      ) : (
        <FlatList data={items} keyExtractor={(item, idx) => `${item.stokKodu || ''}-${idx}`}
          renderItem={renderItem} showsVerticalScrollIndicator={false}
          ListHeaderComponent={<>{renderHeaderCard()}{renderStats()}
            <Text style={[st.listTitle, { color: Colors.textSecondary }]}>KALEMLER ({items.length})</Text>
          </>}
          contentContainerStyle={st.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDetay(true)}
            colors={[accent]} tintColor={accent} />}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  hdr: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: Colors.bgWhite,
    borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  backBtn: { padding: 4, width: 40 },
  hdrTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  centerTxt: { fontSize: 14, marginTop: 8, fontWeight: '500' },
  list: { paddingBottom: 32 },
  headerCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 12 },
  headerRow1: { flexDirection: 'row', alignItems: 'center' },
  irsaliyeBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  irsaliyeTxt: { fontSize: 16, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  headerRow2: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  musteriTxt: { fontSize: 16, fontWeight: '600', flex: 1 },
  commonSection: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 8 },
  commonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commonKey: { fontSize: 13, fontWeight: '500' },
  commonVal: { fontSize: 13, fontWeight: '600', textAlign: 'right', maxWidth: '60%' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, gap: 3 },
  statVal: { fontSize: 16, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  statLbl: { fontSize: 10, fontWeight: '600', opacity: 0.8 },
  listTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  detayCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 10, position: 'relative' },
  seqBadge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  seqTxt: { fontSize: 11, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  stokAdi: { fontSize: 15, fontWeight: '600', lineHeight: 21, paddingRight: 40 },
  codeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  codeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  codeTxt: { fontSize: 11, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  metricRow: { flexDirection: 'row', gap: 8 },
  metricBox: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center', gap: 2 },
  metricLabel: { fontSize: 10, fontWeight: '600' },
  metricValue: { fontSize: 14, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  extraSection: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 6 },
  extraRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  extraKey: { fontSize: 12, fontWeight: '500' },
  extraVal: { fontSize: 13, fontWeight: '600', textAlign: 'right', maxWidth: '60%' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 8 },
});
