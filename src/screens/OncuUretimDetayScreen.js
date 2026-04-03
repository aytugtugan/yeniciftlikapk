import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/SimpleIcon';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Spacing, Radius, Shadows } from '../theme';
import {
  getOncuEmirHeader,
  getOncuEmirCustomer,
  getOncuEmirBom,
  getOncuEmirlerByStation,
  getOncuStokEnvanter,
  getKaliteProsesKontrol,
} from '../api/oncuApi';
import { getTuketimler } from '../api/apiService';
import { AppDataContext } from '../context/AppDataContext';

export default function OncuUretimDetayScreen({ route, navigation }) {
  const ficheno = route.params?.ficheno || '';
  const hatName = route.params?.hatName || '';
  const { oncuToken: token } = useContext(AppDataContext);
  const { selectedFabrika } = useContext(AppDataContext);
  const { width } = useWindowDimensions();
  const isCompact = width < 600;

  const primaryColor = '#E53E3E';
  const backgroundColor = '#F5F5F5';
  const surfaceColor = Colors.bgWhite;
  const textColor = Colors.textPrimary;
  const secondaryTextColor = Colors.textSecondary;
  const borderColor = Colors.borderLight;

  // Data
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [header, setHeader] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [bom, setBom] = useState([]);
  const [stationEmir, setStationEmir] = useState(null);
  const [envanter, setEnvanter] = useState([]);
  const [tuketimler, setTuketimler] = useState([]);
  const [tuketimLoading, setTuketimLoading] = useState(false);
  const [showTuketimModal, setShowTuketimModal] = useState(false);
  const [prosesKontrol, setProsesKontrol] = useState(null);

  // Hammadde dialog
  const [selectedHammadde, setSelectedHammadde] = useState(null);
  const [showHammaddeDialog, setShowHammaddeDialog] = useState(false);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Load all data
  useEffect(() => {
    if (!ficheno || !token) return;

    const loadAll = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [headerRes, customerRes, bomRes] = await Promise.allSettled([
          getOncuEmirHeader(token, ficheno),
          getOncuEmirCustomer(token, ficheno),
          getOncuEmirBom(token, ficheno),
        ]);

        if (!isMountedRef.current) return;

        if (headerRes.status === 'fulfilled' && headerRes.value) setHeader(headerRes.value);
        if (customerRes.status === 'fulfilled' && customerRes.value) setCustomer(customerRes.value);
        if (bomRes.status === 'fulfilled') {
          const bomData = bomRes.value;
          setBom(Array.isArray(bomData) ? bomData : []);
        }

        // Kalite Proses Kontrol verileri
        try {
          const pkData = await getKaliteProsesKontrol(token, ficheno);
          if (isMountedRef.current && pkData) setProsesKontrol(pkData);
        } catch {
          if (isMountedRef.current) setProsesKontrol(null);
        }

        if (hatName) {
          try {
            const orders = await getOncuEmirlerByStation(token, hatName);
            if (!isMountedRef.current) return;
            if (Array.isArray(orders) && orders.length > 0) {
              const match = orders.find(o => o.ficheno === ficheno) || orders[0];
              setStationEmir(match || null);
            }
          } catch {
            if (isMountedRef.current) setStationEmir(null);
          }
        }
      } catch (err) {
        if (isMountedRef.current) setError(err.message || 'Veri yüklenirken hata oluştu');
      } finally {
        if (isMountedRef.current) setIsLoading(false);
      }
    };
    loadAll();
  }, [ficheno, hatName, token]);

  // Load envanter by product code
  useEffect(() => {
    const productCode = stationEmir?.code || header?.urunKodu || header?.UrunKodu;
    if (!productCode || !token) return;

    const loadEnvanter = async () => {
      try {
        const response = await getOncuStokEnvanter(token, { urunKodu: productCode, pageSize: 100 });
        if (!isMountedRef.current) return;
        const items = Array.isArray(response?.items) ? response.items : [];
        const normalized = items
          .filter(s => s && !s.urunKodu?.includes('_IHR'))
          .map(s => ({
            fabrikaNo: s.fabrikaNo || s.FabrikaNo,
            fabrikaAdi: s.fabrikaAdi || s.FabrikaAdi,
            stokMiktari: s.eldekiMiktar ?? s.EldekiMiktar ?? 0,
            birim: s.birim || s.Birim,
            urunKodu: s.urunKodu || s.UrunKodu,
          }));
        if (isMountedRef.current) setEnvanter(normalized);
      } catch {
        if (isMountedRef.current) setEnvanter([]);
      }
    };
    loadEnvanter();
  }, [stationEmir?.code, header?.urunKodu, header?.UrunKodu, token]);

  // Load tüketimler
  useEffect(() => {
    const fabrikaNo = selectedFabrika?.fabrikaKodu;
    if (!fabrikaNo || !ficheno) return;

    const loadTuketimler = async () => {
      setTuketimLoading(true);
      try {
        const data = await getTuketimler(fabrikaNo, ficheno);
        if (!isMountedRef.current) return;
        setTuketimler(Array.isArray(data) ? data : []);
      } catch {
        if (isMountedRef.current) setTuketimler([]);
      } finally {
        if (isMountedRef.current) setTuketimLoading(false);
      }
    };
    loadTuketimler();
  }, [selectedFabrika?.fabrikaKodu, ficheno]);

  // Computed values
  const productName = stationEmir?.mamulAdi || header?.urunAdi || header?.UrunAdi || 'Bilinmiyor';
  const productCode = stationEmir?.code || header?.urunKodu || header?.UrunKodu || 'Bilinmiyor';
  const orderNumber = stationEmir?.ficheno || ficheno;
  const planned = header?.planMiktar ?? header?.PlanMiktar ?? 0;
  const produced = header?.uretimMiktar ?? header?.UretimMiktar ?? 0;
  const remaining = header?.kalanMiktar ?? header?.KalanMiktar ?? Math.max(0, planned - produced);
  const progressPercentage = planned > 0 ? Math.min(1, produced / planned) : 0;

  const safeBom = Array.isArray(bom) ? bom : [];
  const hammaddeler = safeBom.map(b => ({
    malzemeKodu: b?.malzemeKodu || b?.MalzemeKodu,
    malzemeAdi: b?.malzemeAdi || b?.MalzemeAdi,
    bomMiktari: b?.bomMiktari ?? b?.BomMiktari,
    toplamIhtiyac: b?.toplamIhtiyac ?? b?.ToplamIhtiyac,
    birim: b?.birim || b?.Birim,
    stokMiktari: b?.stokMiktari ?? b?.StokMiktari,
    durum: b?.durum || b?.Durum,
  }));

  const formatMiktar = (miktar) => {
    if (miktar === undefined || miktar === null) return '-';
    return miktar.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Pie Chart
  const PieChart = ({ percentage, size }) => {
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - percentage);

    return (
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#E8F5E8" strokeWidth={strokeWidth} fill="none" />
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={Colors.success} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={strokeDashoffset} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        </Svg>
        <View style={styles.pieChartCenter}>
          <Text style={[styles.pieChartPercentage, { color: Colors.success }]}>{Math.round(percentage * 100)}%</Text>
          <Text style={[styles.pieChartLabel, { color: secondaryTextColor }]}>Tamamlandı</Text>
        </View>
      </View>
    );
  };

  // Ürün Bilgileri Card
  const ProductCard = () => (
    <View style={[styles.card, { backgroundColor: surfaceColor }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: textColor }]}>Ürün Bilgileri</Text>
        <Icon name="inventory" size={20} color={Colors.success} />
      </View>
      <View style={[styles.divider, { backgroundColor: borderColor }]} />
      <View style={styles.infoRow}>
        <View style={[styles.iconContainer, { backgroundColor: `${Colors.success}15` }]}>
          <Icon name="category" size={16} color={Colors.success} />
        </View>
        <View style={styles.infoContent}>
          <Text style={[styles.infoLabel, { color: secondaryTextColor }]}>Ürün Adı</Text>
          <Text style={[styles.infoValue, { color: textColor }]} numberOfLines={2}>{productName}</Text>
        </View>
      </View>
      <View style={styles.verticalInfo}>
        <View style={styles.infoRow}>
          <View style={[styles.iconContainerSmall, { backgroundColor: `${Colors.info}15` }]}>
            <Icon name="qr-code" size={14} color={Colors.info} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabelSmall, { color: secondaryTextColor }]}>Kod</Text>
            <Text style={[styles.infoValueSmall, { color: textColor }]} numberOfLines={1}>{productCode}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <View style={[styles.iconContainerSmall, { backgroundColor: `${Colors.purple}15` }]}>
            <Icon name="assignment" size={14} color={Colors.purple} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabelSmall, { color: secondaryTextColor }]}>Üretim Emri</Text>
            <Text style={[styles.infoValueSmall, { color: textColor }]} numberOfLines={1}>{orderNumber}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  // Stat Item
  const StatItem = ({ title, value, icon, color }) => (
    <View style={[styles.statItem, { backgroundColor: `${color}15` }]}>
      <Icon name={icon} size={16} color={color} />
      <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: secondaryTextColor }]}>{title}</Text>
    </View>
  );

  // Üretim İstatistikleri Card
  const ProductionStatsCard = () => (
    <View style={[styles.card, { backgroundColor: surfaceColor }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: textColor }]}>Üretim İstatistikleri</Text>
      </View>
      <View style={styles.statsCompact}>
        <PieChart percentage={progressPercentage} size={120} />
        <View style={styles.statsRow}>
          <StatItem title="Planlanan" value={planned.toString()} icon="assignment" color={Colors.info} />
          <StatItem title="Üretilen" value={produced.toString()} icon="check-circle" color={Colors.success} />
          <StatItem title="Kalan" value={remaining.toString()} icon="schedule" color={Colors.warning} />
        </View>
      </View>
    </View>
  );

  // Fabrika Stokları Card
  const FabrikaStokCard = () => (
    <View style={[styles.card, { backgroundColor: surfaceColor }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: textColor }]}>Fabrika Stokları</Text>
        <View style={styles.cardHeaderRight}>
          <Icon name="warehouse" size={20} color={Colors.success} />
          <Text style={[styles.countTextSmall, { color: secondaryTextColor }]}>({envanter.length})</Text>
        </View>
      </View>
      <View style={[styles.divider, { backgroundColor: borderColor }]} />
      {envanter.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="inventory" size={32} color={secondaryTextColor} />
          <Text style={[styles.emptyText, { color: secondaryTextColor }]}>Stok bilgisi bulunamadı</Text>
        </View>
      ) : (
        <View style={styles.stokList}>
          {envanter.map((stok, index) => (
            <View key={`${stok.fabrikaNo}-${index}`} style={[styles.stokItem, { backgroundColor: 'rgba(0,0,0,0.02)' }]}>
              <View style={styles.stokItemLeft}>
                <View style={[styles.iconContainerSmall, { backgroundColor: `${Colors.success}15` }]}> 
                  <Icon name="factory" size={18} color={Colors.success} />
                </View>
                <View style={styles.stokItemInfo}>
                  <Text style={[styles.stokLabel, { color: secondaryTextColor }]}>Fabrika</Text>
                  <Text style={[styles.stokValue, { color: textColor }]} numberOfLines={2}>{stok.fabrikaAdi || 'Bilinmeyen Fabrika'}</Text>
                </View>
              </View>
              <View style={[styles.stokBadge, { backgroundColor: `${Colors.info}15` }]}>
                <Icon name="inventory" size={14} color={Colors.info} />
                <Text style={styles.stokBadgeText}>{formatMiktar(stok.stokMiktari)} {stok.birim || ''}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  // Sipariş Bilgileri Card
  const OrderInfoCard = () => (
    <View style={[styles.card, { backgroundColor: surfaceColor }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: textColor }]}>Sipariş Bilgileri</Text>
        <Icon name="receipt" size={20} color={Colors.warning} />
      </View>
      <View style={[styles.divider, { backgroundColor: borderColor }]} />
      <OrderInfoItem label="Sipariş No" value={customer?.siparisNo || customer?.SiparisNo || 'Bilinmiyor'} icon="assignment" color={Colors.purple} />
      <OrderInfoItem label="Müşteri" value={customer?.cariAdi || customer?.CariAdi || 'Bilinmiyor'} icon="person" color={Colors.info} />
      <OrderInfoItem label="Şehir" value={customer?.sehir || customer?.Sehir || 'Bilinmiyor'} icon="location-on" color={Colors.success} />
      {(customer?.siparisAciklamasi || customer?.SiparisAciklamasi) ? <OrderInfoItem label="Sipariş Açıklaması" value={customer.siparisAciklamasi || customer.SiparisAciklamasi} icon="description" color={Colors.info} /> : null}
      {planned > 0 && <OrderInfoItem label="Planlanan Miktar" value={planned.toString()} icon="inventory" color={Colors.warning} />}
    </View>
  );

  const OrderInfoItem = ({ label, value, icon, color }) => (
    <View style={styles.orderInfoItem}>
      <View style={[styles.iconContainerSmall, { backgroundColor: `${color}15` }]}>
        <Icon name={icon} size={16} color={color} />
      </View>
      <View style={styles.orderInfoContent}>
        <Text style={[styles.infoLabelSmall, { color: secondaryTextColor }]}>{label}</Text>
        <Text style={[styles.orderInfoValue, { color: textColor }]} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );

  // Tüketim row renderer
  const renderTuketimItem = (item, index, list) => {
    const malzemeAdi = item.stokAdi || item.malzemeAdi || item.urunAdi || 'Bilinmiyor';
    const malzemeKodu = item.stokKodu || item.malzemeKodu || item.urunKodu || '';
    const miktar = item.miktar ?? item.Miktar ?? 0;
    const birim = item.birim || item.Birim || '';
    return (
      <View key={`${malzemeKodu}-${index}`} style={[styles.tuketimItem, index < list.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: borderColor }]}>
        <View style={styles.tuketimLeft}>
          <View style={[styles.iconContainerSmall, { backgroundColor: `${Colors.purple}15` }]}>
            <Icon name="category" size={14} color={Colors.purple} />
          </View>
          <View style={styles.tuketimInfo}>
            <Text style={[styles.tuketimName, { color: textColor }]}>{malzemeAdi}</Text>
            {malzemeKodu ? <Text style={[styles.tuketimCode, { color: secondaryTextColor }]} numberOfLines={1}>{malzemeKodu}</Text> : null}
          </View>
        </View>
        <View style={[styles.tuketimBadge, { backgroundColor: `${Colors.purple}15` }]}>
          <Text style={styles.tuketimBadgeText}>{formatMiktar(miktar)} {birim}</Text>
        </View>
      </View>
    );
  };

  // Tüketimler Card
  const TUKETIM_PREVIEW_COUNT = 5;
  const TuketimlerCard = () => {
    const previewItems = tuketimler.slice(0, TUKETIM_PREVIEW_COUNT);
    const hasMore = tuketimler.length > TUKETIM_PREVIEW_COUNT;
    return (
      <View style={[styles.card, { backgroundColor: surfaceColor }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: textColor }]}>Tüketimler</Text>
          <View style={styles.cardHeaderRight}>
            <Icon name="restaurant" size={20} color={Colors.purple} />
            {!tuketimLoading && <Text style={[styles.countTextSmall, { color: secondaryTextColor }]}>({tuketimler.length})</Text>}
          </View>
        </View>
        <View style={[styles.divider, { backgroundColor: borderColor }]} />
        {tuketimLoading ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: secondaryTextColor }]}>Yükleniyor...</Text>
          </View>
        ) : tuketimler.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="inventory" size={32} color={secondaryTextColor} />
            <Text style={[styles.emptyText, { color: secondaryTextColor }]}>Tüketim bilgisi bulunamadı</Text>
          </View>
        ) : (
          <View style={styles.tuketimList}>
            {previewItems.map((item, index) => renderTuketimItem(item, index, previewItems))}
            {hasMore && (
              <TouchableOpacity
                style={styles.tuketimShowMore}
                onPress={() => setShowTuketimModal(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.tuketimShowMoreText}>Devamını Gör ({tuketimler.length - TUKETIM_PREVIEW_COUNT} daha)</Text>
                <Icon name="expand-more" size={18} color={Colors.purple} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  // Tüketimler Modal
  const TuketimlerModal = () => (
    <Modal visible={showTuketimModal} transparent animationType="fade" onRequestClose={() => setShowTuketimModal(false)}>
      <View style={styles.tuketimModalOverlay}>
        <TouchableWithoutFeedback onPress={() => setShowTuketimModal(false)}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        <View style={[styles.tuketimModalContent, { backgroundColor: surfaceColor }]}>
          <View style={styles.tuketimModalHeader}>
            <Text style={[styles.tuketimModalTitle, { color: textColor }]}>Tüketimler ({tuketimler.length})</Text>
            <TouchableOpacity onPress={() => setShowTuketimModal(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Icon name="close" size={22} color={secondaryTextColor} />
            </TouchableOpacity>
          </View>
          <View style={[styles.divider, { backgroundColor: borderColor }]} />
          <ScrollView style={styles.tuketimModalScroll} nestedScrollEnabled bounces showsVerticalScrollIndicator>
            {tuketimler.map((item, index) => renderTuketimItem(item, index, tuketimler))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Kalite Proses Kontrol Card
  const ProsesKontrolCard = () => {
    if (!prosesKontrol) return null;
    const formatDate = (val) => {
      if (!val) return '-';
      try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      } catch {}
      return String(val);
    };
    const pkItems = [
      { label: 'Üretim Tarihi', value: formatDate(prosesKontrol.uretimTarihi), icon: 'event', color: Colors.info },
      { label: 'TETT', value: prosesKontrol.tett || '-', icon: 'schedule', color: Colors.warning },
      { label: 'PNO', value: prosesKontrol.pno || '-', icon: 'tag', color: Colors.purple },
      { label: 'İnjectleme Kodu', value: prosesKontrol.injectlemeKodu || '-', icon: 'qr-code', color: primaryColor },
      { label: 'Etiket Barkod', value: prosesKontrol.etiketBarkod || '-', icon: 'barcode', color: Colors.success },
      { label: 'Koli Barkod', value: prosesKontrol.koliBarkod || '-', icon: 'barcode', color: Colors.info },
    ];
    const pkHammaddeler = Array.isArray(prosesKontrol.hammaddeler) ? prosesKontrol.hammaddeler : [];
    return (
      <View style={[styles.card, { backgroundColor: surfaceColor }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: textColor }]}>Kalite Proses Kontrol</Text>
          <Icon name="verified" size={20} color={primaryColor} />
        </View>
        <View style={[styles.divider, { backgroundColor: borderColor }]} />
        {pkItems.map((item, i) => (
          <View key={i} style={styles.orderInfoItem}>
            <View style={[styles.iconContainerSmall, { backgroundColor: `${item.color}15` }]}>
              <Icon name={item.icon} size={16} color={item.color} />
            </View>
            <View style={styles.orderInfoContent}>
              <Text style={[styles.infoLabelSmall, { color: secondaryTextColor }]}>{item.label}</Text>
              <Text style={[styles.orderInfoValue, { color: textColor }]} numberOfLines={3}>{item.value}</Text>
            </View>
          </View>
        ))}
        {pkHammaddeler.length > 0 && (
          <>
            <View style={[styles.divider, { backgroundColor: borderColor, marginTop: 4 }]} />
            <Text style={[styles.infoLabelSmall, { color: secondaryTextColor, marginBottom: 8 }]}>Hammaddeler</Text>
            {pkHammaddeler.map((h, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <View style={[styles.iconContainerSmall, { backgroundColor: `${Colors.info}15` }]}>
                  <Icon name="category" size={14} color={Colors.info} />
                </View>
                <Text style={[styles.orderInfoValue, { color: textColor, flex: 1 }]} numberOfLines={2}>{h}</Text>
              </View>
            ))}
          </>
        )}
      </View>
    );
  };

  // Hammaddeler Card
  const HammaddelerCard = () => {
    const items = hammaddeler.filter(h => h.malzemeAdi);
    if (items.length === 0) return null;

    return (
      <View style={[styles.card, { backgroundColor: surfaceColor }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: textColor }]}>Hammaddeler ({items.length})</Text>
          <Icon name="category" size={20} color={Colors.info} />
        </View>
        <View style={[styles.divider, { backgroundColor: borderColor }]} />
        {items.map((hammadde, index) => (
          <React.Fragment key={`${hammadde.malzemeKodu}-${index}`}>
            <HammaddeItem hammadde={hammadde} />
            {index < items.length - 1 && <View style={[styles.separator, { backgroundColor: borderColor }]} />}
          </React.Fragment>
        ))}
      </View>
    );
  };

  // Hammadde Item
  const HammaddeItem = ({ hammadde }) => {
    const durumColor = (() => {
      const d = (hammadde.durum || '').toUpperCase();
      if (d.includes('YETERL') || d.includes('UYGUN')) return Colors.success;
      if (d.includes('YETERS') || d.includes('EKS')) return Colors.danger;
      return Colors.warning;
    })();
    const durumIcon = (() => {
      const d = (hammadde.durum || '').toUpperCase();
      if (d.includes('YETERL') || d.includes('UYGUN')) return 'check-circle';
      if (d.includes('YETERS') || d.includes('EKS')) return 'cancel';
      return 'info';
    })();

    return (
      <TouchableOpacity style={styles.hammaddeItem} onPress={() => { setSelectedHammadde(hammadde); setShowHammaddeDialog(true); }}>
        <View style={styles.hammaddeLeft}>
          <View style={[styles.iconContainerSmall, { backgroundColor: `${durumColor}15` }]}>
            <Icon name={durumIcon} size={14} color={durumColor} />
          </View>
          <View style={styles.hammaddeInfo}>
            <Text style={[styles.hammaddeName, { color: textColor }]} numberOfLines={2}>{hammadde.malzemeAdi || 'Bilinmiyor'}</Text>
            {hammadde.malzemeKodu && <Text style={[styles.hammaddeCode, { color: secondaryTextColor }]}>Kod: {hammadde.malzemeKodu}</Text>}
            {hammadde.stokMiktari !== undefined && (
              <Text style={[styles.hammaddeStok, { color: hammadde.stokMiktari > 0 ? Colors.success : Colors.danger }]}>
                Stok: {formatMiktar(hammadde.stokMiktari)} {hammadde.birim || ''}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.hammaddeRight}>
          {hammadde.toplamIhtiyac !== undefined && (
            <View style={styles.gerekenBadge}>
              <Text style={styles.gerekenText}>{isCompact ? `Gereken: ${formatMiktar(hammadde.toplamIhtiyac)}` : `Tüm Üretime Gereken: ${formatMiktar(hammadde.toplamIhtiyac)}`}</Text>
            </View>
          )}
          <View style={[styles.durumBadge, { backgroundColor: `${durumColor}15` }]}>
            <Text style={[styles.durumText, { color: durumColor }]}>{hammadde.durum || 'Bilinmiyor'}</Text>
          </View>
        </View>
        <Icon name="chevron-right" size={16} color={secondaryTextColor} />
      </TouchableOpacity>
    );
  };

  // Hammadde Dialog Modal
  const HammaddeDialog = () => {
    if (!selectedHammadde) return null;
    const displayName = selectedHammadde.malzemeAdi || 'Bilinmiyor';
    const codePart = selectedHammadde.malzemeKodu ? ` (${selectedHammadde.malzemeKodu})` : '';

    const durumColor = (() => {
      const d = (selectedHammadde.durum || '').toUpperCase();
      if (d.includes('YETERL') || d.includes('UYGUN')) return Colors.success;
      if (d.includes('YETERS') || d.includes('EKS')) return Colors.danger;
      return textColor;
    })();

    const DialogInfoRow = ({ label, value, icon, color }) => (
      <View style={styles.dialogInfoRow}>
        <View style={[styles.iconContainerSmall, { backgroundColor: `${color}15` }]}>
          <Icon name={icon} size={16} color={color} />
        </View>
        <View style={styles.dialogInfoContent}>
          <Text style={[styles.dialogInfoLabel, { color: secondaryTextColor }]}>{label}</Text>
          <Text style={[styles.dialogInfoValue, { color: textColor }]}>{value}</Text>
        </View>
      </View>
    );

    return (
      <Modal visible={showHammaddeDialog} transparent animationType="fade" onRequestClose={() => setShowHammaddeDialog(false)}>
        <TouchableWithoutFeedback onPress={() => setShowHammaddeDialog(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <View style={[styles.modalContent, { backgroundColor: surfaceColor }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${primaryColor}15` }]}> 
                <Icon name="inventory" size={20} color={primaryColor} />
              </View>
              <Text style={[styles.modalTitle, { color: textColor }]} numberOfLines={1}>Hammadde Detayları</Text>
              <TouchableOpacity onPress={() => setShowHammaddeDialog(false)} style={styles.closeButton}>
                <Icon name="close" size={16} color={secondaryTextColor} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.modalSubtitle, { color: primaryColor }]}>{displayName}{codePart}</Text>

              {/* Temel Bilgiler */}
              <View style={[styles.dialogCard, { backgroundColor: Colors.bgSurface }]}>
                <Text style={[styles.dialogCardTitle, { color: textColor }]}>Temel Bilgiler</Text>
                {selectedHammadde.malzemeKodu && <DialogInfoRow label="Hammadde Kodu" value={selectedHammadde.malzemeKodu} icon="qr-code" color={Colors.info} />}
                {selectedHammadde.birim && <DialogInfoRow label="Birim" value={selectedHammadde.birim} icon="straighten" color={Colors.purple} />}
                {selectedHammadde.bomMiktari !== undefined && (
                  <DialogInfoRow label="Birim Ürün Gereksinimi" value={`${formatMiktar(selectedHammadde.bomMiktari)} ${selectedHammadde.birim || ''}`} icon="restaurant" color={Colors.info} />
                )}
              </View>

              {/* Stok Durumu */}
              <View style={[styles.dialogCard, { backgroundColor: Colors.bgSurface }]}>
                <Text style={[styles.dialogCardTitle, { color: durumColor }]}>Stok Durumu</Text>
                {selectedHammadde.stokMiktari !== undefined && (
                  <DialogInfoRow label="Mevcut Stok" value={`${formatMiktar(selectedHammadde.stokMiktari)} ${selectedHammadde.birim || ''}`} icon="inventory-2" color={Colors.success} />
                )}
                {selectedHammadde.toplamIhtiyac !== undefined && (
                  <DialogInfoRow label="Gereken Miktar" value={`${formatMiktar(selectedHammadde.toplamIhtiyac)} ${selectedHammadde.birim || ''}`} icon="calculate" color={Colors.warning} />
                )}
                {selectedHammadde.durum && <DialogInfoRow label="Durum" value={selectedHammadde.durum} icon="info" color={Colors.warning} />}
              </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
    );
  };

  // Error / Invalid state
  if (!ficheno) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <View style={styles.errorContainer}>
          <Icon name="error" size={48} color={Colors.danger} />
          <Text style={[styles.errorText, { color: Colors.danger }]}>Geçersiz fiş numarası</Text>
          <TouchableOpacity style={[styles.goBackButton, { backgroundColor: primaryColor }]} onPress={() => navigation.goBack()}>
            <Text style={styles.goBackButtonText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>
          {isCompact ? 'Üretim Detayları' : `Üretim Detayları${hatName ? ` (${hatName})` : ''}`}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Loading bar */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingBar, { backgroundColor: primaryColor }]} />
        </View>
      )}

      {/* Error */}
      {error ? (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={48} color={Colors.danger} />
          <Text style={[styles.errorText, { color: Colors.danger }]}>{error}</Text>
          <TouchableOpacity style={[styles.goBackButton, { backgroundColor: primaryColor }]} onPress={() => navigation.goBack()}>
            <Text style={styles.goBackButtonText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ProductCard />
          <ProductionStatsCard />
          {isCompact ? (
            <>
              <FabrikaStokCard />
              <OrderInfoCard />
            </>
          ) : (
            <View style={styles.horizontalCards}>
              <View style={styles.flexCard}><FabrikaStokCard /></View>
              <View style={styles.flexCard}><OrderInfoCard /></View>
            </View>
          )}
          <ProsesKontrolCard />
          <TuketimlerCard />
          <HammaddelerCard />
        </ScrollView>
      )}

      <HammaddeDialog />
      <TuketimlerModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgWhite,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
    ...Shadows.sm,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.md, gap: 16, paddingBottom: 24 },
  horizontalCards: { flexDirection: 'row', gap: 16 },
  flexCard: { flex: 1 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  loadingBar: { height: 3, width: '100%' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, gap: 16 },
  errorText: { fontSize: 16, textAlign: 'center' },
  goBackButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.sm },
  goBackButtonText: { color: '#FFFFFF', fontWeight: '600' },

  // Card
  card: { borderRadius: 16, padding: 16, ...Shadows.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  countTextSmall: { fontSize: 14 },
  divider: { height: 0.5, marginBottom: 16 },
  separator: { height: 0.5, marginVertical: 8 },

  // Info Row
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  iconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  iconContainerSmall: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  infoLabelSmall: { fontSize: 11, fontWeight: '500' },
  infoValue: { fontSize: 16, fontWeight: '700' },
  infoValueSmall: { fontSize: 14, fontWeight: '600' },
  verticalInfo: { gap: 12 },

  // Pie Chart
  pieChartCenter: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  pieChartPercentage: { fontSize: 24, fontWeight: '700' },
  pieChartLabel: { fontSize: 12 },

  // Stats
  statsCompact: { alignItems: 'center', gap: 16 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statItem: { flex: 1, alignItems: 'center', padding: 8, borderRadius: 8, gap: 4 },
  statValue: { fontSize: 16, fontWeight: '700' },
  statTitle: { fontSize: 11 },

  // Stok
  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  emptyText: { fontSize: 14 },
  stokList: { gap: 8 },
  stokItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12 },
  stokItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  stokItemInfo: { flex: 1 },
  stokLabel: { fontSize: 11 },
  stokValue: { fontSize: 14, fontWeight: '600' },
  stokBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  stokBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.info },

  // Tüketimler
  tuketimList: { gap: 0 },
  tuketimItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  tuketimLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  tuketimInfo: { flex: 1 },
  tuketimName: { fontSize: 13, fontWeight: '500', flexWrap: 'wrap' },
  tuketimCode: { fontSize: 10, marginTop: 2 },
  tuketimBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, flexShrink: 0, marginLeft: 8 },
  tuketimBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.purple },
  tuketimShowMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 4 },
  tuketimShowMoreText: { fontSize: 13, fontWeight: '600', color: Colors.purple },
  tuketimModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  tuketimModalContent: { width: '100%', maxHeight: '85%', borderRadius: 16, padding: 16, ...Shadows.md },
  tuketimModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tuketimModalTitle: { fontSize: 16, fontWeight: '700' },
  tuketimModalScroll: { flexGrow: 1 },

  // Order Info
  orderInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  orderInfoContent: { flex: 1 },
  orderInfoValue: { fontSize: 14, fontWeight: '600' },

  // Hammadde
  hammaddeItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 8 },
  hammaddeLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  hammaddeInfo: { flex: 1 },
  hammaddeName: { fontSize: 14, fontWeight: '500' },
  hammaddeCode: { fontSize: 11, marginTop: 2 },
  hammaddeStok: { fontSize: 11, marginTop: 2 },
  hammaddeRight: { alignItems: 'flex-end', gap: 4 },
  gerekenBadge: { backgroundColor: Colors.warningLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  gerekenText: { fontSize: 11, fontWeight: '700', color: '#000' },
  durumBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  durumText: { fontSize: 10, fontWeight: '500' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '95%', maxWidth: 500, maxHeight: '80%', borderRadius: 24, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '600' },
  closeButton: { padding: 8 },
  modalBody: { padding: 16 },
  modalSubtitle: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  dialogCard: { borderRadius: 16, padding: 16, marginBottom: 16 },
  dialogCardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  dialogInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  dialogInfoContent: { flex: 1 },
  dialogInfoLabel: { fontSize: 12 },
  dialogInfoValue: { fontSize: 14, fontWeight: '500' },
});
