import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  StatusBar, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SimpleIcon from '../components/SimpleIcon';
import { Colors, Shadows } from '../theme';
import { AppDataContext } from '../context/AppDataContext';
import {
  getFisDetay, getFisHammaddeler, getLotKayitlar,
  getKaliteProsesKontrol, getUsers,
} from '../api/oncuApi';

const norm = (txt) => txt.toUpperCase().replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C');

export default function KaliteKayitDetayScreen({ navigation, route }) {
  const fisNo = route.params?.fisNo || '';
  const urunAdi = route.params?.urunAdi || '';
  const kod = route.params?.kod || '';
  const istasyonAdi = route.params?.istasyonAdi || '';
  const fabrikaAdi = route.params?.fabrikaAdi || '';
  const planMiktar = route.params?.planMiktar;
  const uretilenMiktar = route.params?.uretilenMiktar;
  const { oncuToken } = useContext(AppDataContext);
  const insets = useSafeAreaInsets();

  const isYRM = kod.toUpperCase().includes('YRM');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [fisDetay, setFisDetay] = useState(null);
  const [hammaddeler, setHammaddeler] = useState([]);
  const [lotKayitlar, setLotKayitlar] = useState([]);
  const [prosesKontrol, setProsesKontrol] = useState(null);
  const [expandedFormId, setExpandedFormId] = useState(null);
  const [userMap, setUserMap] = useState({});
  const [showAllForms, setShowAllForms] = useState(false);
  const INITIAL_FORM_COUNT = 5;

  const loadData = useCallback(async (isRefresh = false) => {
    if (!oncuToken || !fisNo) return;
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      const [detayR, hamR, lotR, prosesR, usersR] = await Promise.allSettled([
        getFisDetay(oncuToken, fisNo),
        getFisHammaddeler(oncuToken, fisNo),
        getLotKayitlar(oncuToken, { fisNo, page: 1, pageSize: 100 }),
        getKaliteProsesKontrol(oncuToken, fisNo).catch(() => null),
        getUsers(oncuToken).catch(() => []),
      ]);
      if (detayR.status === 'fulfilled') {
        const d = detayR.value;
        setFisDetay(Array.isArray(d) ? d[0] || null : d);
      }
      if (hamR.status === 'fulfilled') setHammaddeler(hamR.value || []);
      if (lotR.status === 'fulfilled') setLotKayitlar(lotR.value?.items || []);
      if (prosesR.status === 'fulfilled' && prosesR.value) setProsesKontrol(prosesR.value);
      if (usersR.status === 'fulfilled' && usersR.value) {
        const m = {};
        (usersR.value || []).forEach(u => { m[u.id] = u; });
        setUserMap(m);
      }
      if (detayR.status === 'rejected' && hamR.status === 'rejected' && lotR.status === 'rejected') {
        setError('Veriler yüklenemedi.');
      }
    } catch (err) { setError(err.message || 'Veriler yüklenemedi'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [oncuToken, fisNo]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(true); };

  const parsedMaterials = useMemo(() => {
    const raw = prosesKontrol?.hammaddeler || prosesKontrol?.Hammaddeler || [];
    return {
      etiketAdi: raw.find(n => ['ETIKET', 'LABEL'].some(kw => norm(n).includes(kw))),
      kapakAdi: raw.find(n => ['KAPAK', 'CAP', 'COVER'].some(kw => norm(n).includes(kw))),
      koliAdi: raw.find(n => ['KOLI', 'CARTON', 'BOX'].some(kw => norm(n).includes(kw))),
      ambalajAdi: raw.find(n => ['KAVANOZ', 'SIS', 'AMBALAJ', 'KUTU', 'JAR', 'BOTTLE'].some(kw => norm(n).includes(kw))),
    };
  }, [prosesKontrol]);

  const formatDate = (ds) => {
    if (!ds) return '-';
    try { const d = new Date(ds); return isNaN(d.getTime()) ? ds : d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch { return ds; }
  };
  const formatDateTime = (ds) => {
    if (!ds) return '-';
    try { const d = new Date(ds); return isNaN(d.getTime()) ? ds : d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return ds; }
  };
  const formatNumber = (num) => num == null ? '-' : num.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const getCompletionPercent = () => {
    if (!planMiktar || planMiktar === 0) return 0;
    return Math.min(100, ((uretilenMiktar || 0) / planMiktar) * 100);
  };
  const getStatusInfo = () => {
    const p = getCompletionPercent();
    if (p >= 100) return { label: 'Tamamlandı', color: Colors.success, icon: 'check_circle' };
    if (p > 0) return { label: 'Devam Ediyor', color: Colors.warning, icon: 'schedule' };
    return { label: 'Beklemede', color: Colors.info, icon: 'hourglass_empty' };
  };

  const resolvedUretimTarihi = fisDetay?.uretimTarihi || prosesKontrol?.uretimTarihi || prosesKontrol?.UretimTarihi;
  const resolvedTett = fisDetay?.tett || prosesKontrol?.tett || prosesKontrol?.Tett;
  const resolvedPNo = fisDetay?.pNo || prosesKontrol?.pno || prosesKontrol?.Pno;
  const resolvedInjectleme = fisDetay?.injectlemeKodu || prosesKontrol?.injectlemeKodu || prosesKontrol?.InjectlemeKodu;
  const resolvedEtiketBarkod = prosesKontrol?.etiketBarkod || prosesKontrol?.EtiketBarkod;
  const resolvedKoliBarkod = prosesKontrol?.koliBarkod || prosesKontrol?.KoliBarkod;
  const resolvedUrunAdi = urunAdi || prosesKontrol?.mamulAdi || prosesKontrol?.MamulAdi;

  const SectionCard = ({ title, icon, count, children }) => (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconBg}><SimpleIcon name={icon} size={18} color={Colors.brandPrimary} /></View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {count !== undefined && <View style={styles.countBadge}><Text style={styles.countBadgeText}>{count}</Text></View>}
      </View>
      {children}
    </View>
  );

  const FormRow = ({ label, value, isLast }) => (
    <View style={[styles.formRow, !isLast && { borderBottomColor: Colors.borderLight, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text style={styles.formRowLabel}>{label}</Text>
      <Text style={styles.formRowValue} selectable>{value || '-'}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.brandPrimary} />
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
            <SimpleIcon name="arrow_back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kalite Kontrol Detay</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.brandPrimary} />
          <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
        </View>
      </View>
    );
  }

  const status = getStatusInfo();
  const completionPercent = getCompletionPercent();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.brandPrimary} />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <SimpleIcon name="arrow_back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Kalite Kontrol Detay</Text>
          <Text style={styles.headerSubtitle}>{fisNo}</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={onRefresh}>
          <SimpleIcon name="refresh" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brandPrimary} />}>

        {/* Order Banner */}
        <View style={styles.orderBanner}>
          <View style={styles.bannerTop}>
            <View style={styles.orderIconBg}>
              <SimpleIcon name="precision_manufacturing" size={28} color={Colors.brandPrimary} />
            </View>
            <View style={styles.bannerInfo}>
              <Text style={styles.bannerTitle} numberOfLines={2}>{resolvedUrunAdi || kod || 'Ürün Adı Yok'}</Text>
              {kod ? <Text style={styles.bannerCode}>Kod: {kod}</Text> : null}
              <View style={styles.bannerMetaRow}>
                {istasyonAdi ? <View style={styles.bannerMeta}><SimpleIcon name="workspaces" size={13} color={Colors.textSecondary} /><Text style={styles.bannerMetaText}>{istasyonAdi}</Text></View> : null}
              </View>
            </View>
          </View>
          {planMiktar > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
                  <SimpleIcon name={status.icon} size={12} color={status.color} />
                  <Text style={[styles.statusBadgeText, { color: status.color }]}>{status.label}</Text>
                </View>
                <Text style={[styles.progressPercent, { color: status.color }]}>%{completionPercent.toFixed(0)}</Text>
              </View>
              <View style={styles.progressBar}><View style={[styles.progressFill, { backgroundColor: status.color, width: `${completionPercent}%` }]} /></View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}><Text style={styles.statLabel}>Plan</Text><Text style={styles.statValue}>{formatNumber(planMiktar)}</Text></View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}><Text style={styles.statLabel}>Üretilen</Text><Text style={[styles.statValue, { color: Colors.success }]}>{formatNumber(uretilenMiktar)}</Text></View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}><Text style={styles.statLabel}>Kalan</Text><Text style={[styles.statValue, { color: Colors.warning }]}>{formatNumber((planMiktar || 0) - (uretilenMiktar || 0))}</Text></View>
              </View>
            </View>
          )}
          <View style={styles.formSummaryRow}>
            <View style={styles.formSummaryItem}>
              <SimpleIcon name="assignment" size={18} color={Colors.brandPrimary} />
              <Text style={styles.formSummaryValue}>{lotKayitlar.length}</Text>
              <Text style={styles.formSummaryLabel}>Form</Text>
            </View>
            <View style={styles.formSummaryDivider} />
            <View style={styles.formSummaryItem}>
              <SimpleIcon name="category" size={18} color={Colors.info} />
              <Text style={styles.formSummaryValue}>{hammaddeler.length}</Text>
              <Text style={styles.formSummaryLabel}>Hammadde</Text>
            </View>
          </View>
        </View>

        {/* Submitted Forms */}
        <SectionCard title="Gönderilen Formlar" icon="assignment_turned_in" count={lotKayitlar.length}>
          {lotKayitlar.length > 0 ? (
            (showAllForms ? lotKayitlar : lotKayitlar.slice(0, INITIAL_FORM_COUNT)).map((form, index) => {
              const isExpanded = expandedFormId === form.id;
              const u = form.kaydedenKisiId ? userMap[form.kaydedenKisiId] : undefined;
              const senderFirst = form.kaydedenAdi || u?.firstName || '';
              const senderLast = form.kaydedenSoyadi || u?.lastName || '';
              const senderUser = form.kaydedenKullaniciAdi || u?.userName || '';
              const senderFullName = [senderFirst, senderLast].filter(Boolean).join(' ');
              return (
                <TouchableOpacity key={form.id} style={[styles.formCard, isExpanded && styles.formCardExpanded]}
                  onPress={() => setExpandedFormId(isExpanded ? null : form.id)} activeOpacity={0.7}>
                  <View style={styles.formCardHeader}>
                    <View style={styles.formCardLeft}>
                      <View style={styles.formNumberBg}><Text style={styles.formNumber}>#{index + 1}</Text></View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.formCardDate}>{formatDateTime(form.kayitTarihi)}</Text>
                        {(senderFullName || senderUser) ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                            <SimpleIcon name="person" size={12} color={Colors.textSecondary} />
                            <Text style={{ color: Colors.textSecondary, fontSize: 11, marginLeft: 3 }} numberOfLines={1}>
                              {senderFullName || senderUser}
                            </Text>
                          </View>
                        ) : null}
                        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 3 }}>
                          {form.etiketLot ? <View style={[styles.miniTag, { backgroundColor: Colors.infoBg }]}><Text style={{ color: Colors.info, fontSize: 10, fontWeight: '600' }}>Etiket: {form.etiketLot}</Text></View> : null}
                          {!isYRM && form.koliLot ? <View style={[styles.miniTag, { backgroundColor: Colors.warningLight }]}><Text style={{ color: Colors.warning, fontSize: 10, fontWeight: '600' }}>Koli: {form.koliLot}</Text></View> : null}
                          {form.operatorAdi ? <View style={[styles.miniTag, { backgroundColor: '#F0F0F0' }]}><Text style={{ color: '#607D8B', fontSize: 10, fontWeight: '600' }}>Op: {form.operatorAdi}</Text></View> : null}
                        </View>
                      </View>
                    </View>
                    <SimpleIcon name={isExpanded ? 'expand_less' : 'expand_more'} size={24} color={Colors.textSecondary} />
                  </View>
                  {isExpanded && (
                    <View style={styles.formCardDetails}>
                      <FormRow label="Fiş No" value={fisNo} />
                      {kod ? <FormRow label="Kod" value={kod} /> : null}
                      <FormRow label="Ürün Adı" value={resolvedUrunAdi || '-'} />
                      <FormRow label="P.No" value={resolvedPNo || '-'} />
                      <FormRow label="Üretim Tarihi" value={formatDate(resolvedUretimTarihi)} />
                      <FormRow label="TETT" value={formatDate(resolvedTett)} />
                      <FormRow label="İnjectleme" value={resolvedInjectleme || '-'} />
                      {istasyonAdi ? <FormRow label="Üretim Hattı" value={istasyonAdi} /> : null}
                      <FormRow label="Ambalaj Adı" value={parsedMaterials.ambalajAdi || '-'} />
                      <FormRow label="Kapak Adı" value={parsedMaterials.kapakAdi || '-'} />
                      <FormRow label="Kapak Barkod" value={form.kapakBarkod || '-'} />
                      <FormRow label="Etiket Adı" value={parsedMaterials.etiketAdi || '-'} />
                      <FormRow label="Etiket Barkod" value={resolvedEtiketBarkod || '-'} />
                      <FormRow label="Etiket Lot" value={form.etiketLot || '-'} />
                      {!isYRM && <>
                        <FormRow label="Koli Adı" value={parsedMaterials.koliAdi || '-'} />
                        <FormRow label="Koli Barkod" value={resolvedKoliBarkod || '-'} />
                        <FormRow label="Koli Lot" value={form.koliLot || '-'} />
                      </>}
                      {form.operatorAdi ? <FormRow label="Operatör" value={form.operatorAdi} /> : null}
                      <FormRow label="Kayıt Tarihi" value={formatDateTime(form.kayitTarihi)} isLast />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptySection}>
              <SimpleIcon name="assignment_late" size={36} color={Colors.textSecondary} />
              <Text style={styles.emptyText}>Kalite kontrol formu bulunamadı</Text>
            </View>
          )}
          {lotKayitlar.length > INITIAL_FORM_COUNT && (
            <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAllForms(prev => !prev)} activeOpacity={0.7}>
              <SimpleIcon name={showAllForms ? 'expand_less' : 'expand_more'} size={20} color={Colors.brandPrimary} />
              <Text style={styles.showMoreBtnText}>
                {showAllForms ? 'Daralt' : `Devamını Gör (${lotKayitlar.length - INITIAL_FORM_COUNT} form daha)`}
              </Text>
            </TouchableOpacity>
          )}
        </SectionCard>

        {/* Materials */}
        {hammaddeler.length > 0 && (
          <SectionCard title="Hammaddeler" icon="category" count={hammaddeler.length}>
            {hammaddeler.map((item, i) => (
              <View key={`${item.code}-${i}`} style={[styles.hammaddeRow, { backgroundColor: i % 2 === 0 ? 'transparent' : '#f8f9fa' }]}>
                <View style={styles.hammaddeDot} />
                <View style={styles.hammaddeInfo}>
                  <Text style={styles.hammaddeAdi} numberOfLines={1}>{item.malzemeAdi || '-'}</Text>
                  {item.code && <Text style={styles.hammaddeKod}>{item.code}</Text>}
                </View>
              </View>
            ))}
          </SectionCard>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgApp },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 14, backgroundColor: Colors.brandPrimary, ...Shadows.md },
  headerBtn: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  loadingText: { fontSize: 14, marginTop: 8, color: Colors.textSecondary },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  orderBanner: { borderRadius: 16, padding: 16, gap: 16, backgroundColor: Colors.bgWhite, ...Shadows.sm },
  bannerTop: { flexDirection: 'row', gap: 14 },
  orderIconBg: { width: 56, height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.brandPrimaryLight },
  bannerInfo: { flex: 1, gap: 4 },
  bannerTitle: { fontSize: 17, fontWeight: '700', lineHeight: 22, color: Colors.textPrimary },
  bannerCode: { fontSize: 13, color: Colors.textSecondary },
  bannerMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 2 },
  bannerMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bannerMetaText: { fontSize: 12, color: Colors.textSecondary },
  progressSection: { gap: 8 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  progressPercent: { fontSize: 14, fontWeight: '700' },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: Colors.borderLight },
  progressFill: { height: '100%', borderRadius: 3 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, marginBottom: 2, color: Colors.textSecondary },
  statValue: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  statDivider: { width: 1, height: 28, backgroundColor: Colors.borderLight },
  formSummaryRow: { flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: Colors.borderLight, paddingTop: 14 },
  formSummaryItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  formSummaryValue: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  formSummaryLabel: { fontSize: 11, color: Colors.textSecondary },
  formSummaryDivider: { width: 1, height: 20, backgroundColor: Colors.borderLight },
  card: { borderRadius: 16, padding: 16, gap: 4, backgroundColor: Colors.bgWhite, ...Shadows.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 12, gap: 8 },
  sectionIconBg: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.brandPrimaryLight },
  sectionTitle: { fontSize: 16, fontWeight: '700', flex: 1, color: Colors.textPrimary },
  countBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, backgroundColor: Colors.brandPrimaryLight },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.brandPrimary },
  formCard: { borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 14, marginBottom: 10, overflow: 'hidden' },
  formCardExpanded: { borderColor: Colors.brandPrimary + '40', backgroundColor: Colors.brandPrimaryLight + '20' },
  formCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  formCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  formNumberBg: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.brandPrimaryLight },
  formNumber: { fontSize: 13, fontWeight: '800', color: Colors.brandPrimary },
  formCardDate: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  formCardDetails: { borderTopWidth: 0.5, borderTopColor: Colors.borderLight, paddingHorizontal: 14, paddingVertical: 10, gap: 2 },
  formRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, paddingHorizontal: 4 },
  formRowLabel: { fontSize: 12.5, color: Colors.textSecondary, flex: 1 },
  formRowValue: { fontSize: 12.5, fontWeight: '600', flex: 1.5, textAlign: 'right', color: Colors.textPrimary },
  miniTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  emptySection: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  emptyText: { fontSize: 14, textAlign: 'center', maxWidth: 250, color: Colors.textSecondary },
  showMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderTopWidth: 0.5, borderTopColor: Colors.borderLight, marginTop: 4 },
  showMoreBtnText: { fontSize: 14, fontWeight: '600', color: Colors.brandPrimary },
  hammaddeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, gap: 10 },
  hammaddeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.brandPrimary },
  hammaddeInfo: { flex: 1, gap: 2 },
  hammaddeAdi: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  hammaddeKod: { fontSize: 12, color: Colors.textSecondary },
});
