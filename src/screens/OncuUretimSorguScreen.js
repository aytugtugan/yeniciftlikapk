import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import Icon from '../components/SimpleIcon';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Radius, Shadows } from '../theme';
import {
  getOncuFabrikalar,
  getOncuIstasyonlar,
  getOncuEmirlerByStation,
  getOncuEmirHeader,
} from '../api/oncuApi';
import { AppDataContext } from '../context/AppDataContext';

export default function OncuUretimSorguScreen() {
  const navigation = useNavigation();
  const { oncuToken: token } = useContext(AppDataContext);
  const { width } = useWindowDimensions();
  const isCompact = width < 600;
  const primaryColor = Colors.brandPrimary;
  const backgroundColor = Colors.bgApp;
  const cardBackground = Colors.bgWhite;
  const textColor = Colors.textPrimary;
  const secondaryTextColor = Colors.textSecondary;
  const borderColor = Colors.borderLight;
  const successColor = Colors.success;
  const warningColor = Colors.warning;
  const dangerColor = Colors.danger;

  // Data
  const [factory, setFactory] = useState(null);
  const [stations, setStations] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stationOrderCounts, setStationOrderCounts] = useState({});

  // Selection
  const [selectedStation, setSelectedStation] = useState(null);

  // UI
  const [isLoadingStations, setIsLoadingStations] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [error, setError] = useState(null);
  const [isStationExpanded, setIsStationExpanded] = useState(true);
  const [isStationManuallyExpanded, setIsStationManuallyExpanded] = useState(false);

  // Load factories and auto-select Yeni Çiftlik
  useEffect(() => {
    if (!token) return;
    const loadFactory = async () => {
      try {
        const data = await getOncuFabrikalar(token);
        if (!Array.isArray(data)) return;
        const match = data.find(f => {
          const name = (f.displayName || f.DisplayName || f.name || f.Name || '').toLowerCase();
          return name.includes('yeni') && (name.includes('çiftlik') || name.includes('ciftlik'));
        });
        if (match) {
          setFactory(match);
        } else if (data.length > 0) {
          setFactory(data[0]);
        }
      } catch (err) {
        setError('Fabrikalar yüklenemedi');
      }
    };
    loadFactory();
  }, [token]);

  // Load stations when factory available
  useEffect(() => {
    if (!token || !factory) return;
    const loadStations = async () => {
      setIsLoadingStations(true);
      setStations([]);
      setStationOrderCounts({});
      try {
        const code = factory.factoryCode || factory.FactoryCode || factory.code || factory.Code || factory.id || factory.Id;
        const data = await getOncuIstasyonlar(token, code.toString());
        setStations(data);

        // Count orders per station
        const counts = {};
        for (const station of data) {
          const key = station.name || station.code || '';
          try {
            const stationOrders = await getOncuEmirlerByStation(token, key);
            counts[key] = stationOrders.length;
          } catch {
            counts[key] = 0;
          }
        }
        setStationOrderCounts(counts);
      } catch (err) {
        setError('İstasyonlar yüklenemedi');
      } finally {
        setIsLoadingStations(false);
      }
    };
    loadStations();
  }, [token, factory]);

  // Auto-collapse station when selected
  useEffect(() => {
    if (selectedStation) {
      setIsStationExpanded(false);
      setIsStationManuallyExpanded(false);
    }
  }, [selectedStation]);

  // Load orders when station selected
  useEffect(() => {
    if (!token || !selectedStation) return;
    const loadOrders = async () => {
      setIsLoadingOrders(true);
      setOrders([]);
      try {
        const stationKey = selectedStation.name || selectedStation.code || '';
        const data = await getOncuEmirlerByStation(token, stationKey);

        // Header bilgisini de çek her emir için
        const enriched = await Promise.all(
          data.map(async order => {
            try {
              const header = await getOncuEmirHeader(token, order.ficheno);
              return {
                ...order,
                planMiktar: header?.planMiktar ?? header?.PlanMiktar ?? order.planMiktar ?? 0,
                uretimMiktar: header?.uretimMiktar ?? header?.UretimMiktar ?? order.uretimMiktar ?? 0,
              };
            } catch {
              return order;
            }
          }),
        );
        setOrders(enriched);
      } catch (err) {
        setError('Emirler yüklenemedi');
      } finally {
        setIsLoadingOrders(false);
      }
    };
    loadOrders();
  }, [token, selectedStation]);

  const stationCount = stations.filter(
    s => (stationOrderCounts[s.name || s.code || ''] || 0) > 0,
  ).length;

  const handleStationSelect = station => {
    if (selectedStation?.name === station.name) {
      setIsStationManuallyExpanded(false);
    } else {
      setSelectedStation(station);
    }
  };

  const handleStationHeaderClick = () => {
    if (selectedStation) {
      setIsStationManuallyExpanded(!isStationManuallyExpanded);
    } else {
      setIsStationExpanded(!isStationExpanded);
    }
  };

  const handleOrderSelect = order => {
    const rawFicheno = order.ficheno?.trim();
    const rawHatName = (selectedStation?.name || '').trim();
    if (!rawFicheno) return;
    navigation.navigate('OncuUretimDetay', { ficheno: rawFicheno, hatName: rawHatName });
  };

  // Token check
  if (!token) {
    return (
      <View style={[styles.container, { backgroundColor, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={[styles.loadingText, { color: secondaryTextColor }]}>Bağlanılıyor...</Text>
      </View>
    );
  }

  // Workflow Step Card
  const WorkflowStepCard = ({ title, description, iconName, isCompleted, dynamicCount, isCollapsible, isExpanded, onHeaderClick, children }) => {
    const isActive = !isCompleted;
    const cardBorderColor = isActive ? `${primaryColor}80` : borderColor;
    const iconBgColor = isCompleted || isActive ? primaryColor : '#9CA3AF';

    return (
      <View style={[styles.workflowCard, { backgroundColor: cardBackground, borderColor: cardBorderColor, borderWidth: isActive ? 2 : 1 }]}>
        <TouchableOpacity style={styles.workflowHeader} onPress={onHeaderClick} activeOpacity={0.7} disabled={!isCollapsible && !isCompleted}>
          <View style={styles.workflowHeaderLeft}>
            <View style={[styles.stepIcon, { backgroundColor: iconBgColor }]}>
              <Icon name={iconName} size={24} color="#FFFFFF" />
            </View>
            <View style={styles.workflowTitleContainer}>
              <Text style={[styles.workflowTitle, { color: isActive ? primaryColor : textColor }]}>{title}</Text>
              <Text style={[styles.workflowDescription, { color: secondaryTextColor }]}>{description}</Text>
            </View>
          </View>
          <View style={styles.workflowHeaderRight}>
            <View style={[styles.countBadge, { backgroundColor: isCompleted || isActive ? `${primaryColor}1A` : 'rgba(156,163,175,0.1)' }]}>
              <Text style={[styles.countText, { color: isCompleted || isActive ? primaryColor : '#9CA3AF' }]}>
                {dynamicCount !== undefined ? dynamicCount : '?'}
              </Text>
            </View>
            {isCollapsible && isCompleted && (
              <TouchableOpacity style={[styles.expandButton, { backgroundColor: `${primaryColor}1A` }]} onPress={onHeaderClick}>
                <Icon name={isExpanded ? 'expand-less' : 'expand-more'} size={20} color={primaryColor} />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
        {isExpanded && (
          <>
            <View style={[styles.divider, { backgroundColor: borderColor }]} />
            <View style={styles.workflowContent}>{children}</View>
          </>
        )}
      </View>
    );
  };

  // Station Item
  const StationItem = ({ station, isSelected, hasOrders, orderCount, onPress }) => (
    <TouchableOpacity
      style={[styles.stationItem, { backgroundColor: isSelected ? `${primaryColor}1A` : cardBackground, borderColor: isSelected ? primaryColor : hasOrders ? successColor : borderColor, borderWidth: isSelected ? 2 : 1 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.stationLeft}>
        <View style={[styles.stationDot, { backgroundColor: hasOrders ? successColor : '#9CA3AF' }]} />
        <Icon name="precision-manufacturing" size={20} color={isSelected ? primaryColor : hasOrders ? successColor : secondaryTextColor} />
        <Text style={[styles.stationName, { color: isSelected ? primaryColor : textColor, fontWeight: isSelected ? '700' : '500' }]}>
          {station.name || station.code || 'Bilinmeyen Hat'}
        </Text>
      </View>
      <View style={[styles.orderCountBadge, { backgroundColor: hasOrders ? primaryColor : '#9CA3AF' }]}>
        <Text style={styles.orderCountText}>{orderCount}</Text>
      </View>
    </TouchableOpacity>
  );

  // Order Item - mirrors the removed UretimEmirleri page card layout
  const OrderItem = ({ order, onPress }) => {
    const planMiktar = order.planMiktar || 0;
    const uretimMiktar = order.uretimMiktar || 0;
    const progress = planMiktar > 0 ? Math.min(100, (uretimMiktar / planMiktar) * 100) : 0;
    const statusColor = progress >= 100 ? successColor : progress >= 50 ? warningColor : dangerColor;
    const statusBg = progress >= 100 ? Colors.successLight : progress >= 50 ? Colors.warningLight : Colors.dangerLight;
    const statusLabel = progress >= 100 ? 'Tamamlandı' : progress >= 50 ? 'Devam Ediyor' : 'Başlangıç';
    const stationName = selectedStation?.name || selectedStation?.code || 'Bilinmiyor';
    const stationCode = selectedStation?.code || selectedStation?.name || '-';
    const kalan = Math.max(0, planMiktar - uretimMiktar);
    const productName = order.mamulAdi || order.name || 'Bilinmiyor';
    const productCodeValue = order.code || '-';

    return (
      <TouchableOpacity style={styles.orderItem} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.cardTop}>
          <View style={styles.fisNoWrap}>
            <Text style={styles.fisNoLabel}>FİŞ</Text>
            <Text style={styles.fisNoValue}>{order.uretimEmriNo || order.ficheno}</Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: statusBg }]}> 
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabelCard}>İSTASYON</Text>
            <Text style={styles.infoValueCard}>{stationName}</Text>
            <Text style={styles.infoCodeCard}>{stationCode}</Text>
          </View>
          <View style={styles.infoSep} />
          <View style={[styles.infoItem, styles.productInfoItem]}>
            <Text style={styles.infoLabelCard}>ÜRÜN</Text>
            <Text style={styles.infoValueCard} numberOfLines={2}>{productName}</Text>
            <Text style={styles.infoCodeCard}>{productCodeValue}</Text>
          </View>
        </View>

        <View style={styles.numbersBar}>
          <View style={styles.numberItem}>
            <Text style={styles.numberLabel}>Planlanan</Text>
            <Text style={styles.numberValue}>{planMiktar.toLocaleString('tr-TR')}</Text>
          </View>
          <View style={styles.numberDivider} />
          <View style={styles.numberItem}>
            <Text style={styles.numberLabel}>Üretilen</Text>
            <Text style={[styles.numberValue, { color: statusColor }]}>{uretimMiktar.toLocaleString('tr-TR')}</Text>
          </View>
          <View style={styles.numberDivider} />
          <View style={styles.numberItem}>
            <Text style={styles.numberLabel}>Kalan</Text>
            <Text style={styles.numberValue}>{kalan.toLocaleString('tr-TR')}</Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.orderProgressBar}>
            <View style={[styles.orderProgressFill, { width: `${progress}%`, backgroundColor: statusColor }]} />
          </View>
          <Text style={[styles.orderProgressText, { color: secondaryTextColor }]}>%{Math.round(progress)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4, width: 36 }}>
          <Icon name="arrow-back-ios" size={20} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor, flex: 1 }]}>{isCompact ? 'Üretim Emri Seçimi' : 'Aktif Üretim Emirleri'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Station Selection */}
        <WorkflowStepCard
          title={selectedStation ? `Seçilen hat: ${selectedStation.name || selectedStation.code}` : 'Hat Seçimi'}
          description={selectedStation ? 'Hat seçimini değiştirmek için tıklayın!' : 'Üretim hattını seçin'}
          iconName="business"
          isCompleted={!!selectedStation}
          dynamicCount={stationCount}
          isCollapsible={true}
          isExpanded={isStationExpanded || isStationManuallyExpanded}
          onHeaderClick={handleStationHeaderClick}
        >
          {isLoadingStations ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={primaryColor} />
            </View>
          ) : stations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="business" size={48} color={primaryColor} />
              <Text style={[styles.emptyTitle, { color: primaryColor }]}>Aktif Hat Bulunamadı</Text>
              <Text style={[styles.emptyDescription, { color: secondaryTextColor }]}>Bu fabrikada şu anda aktif üretim emri olan hat bulunmamaktadır.</Text>
            </View>
          ) : (
            <View style={styles.selectionList}>
              {stations.map((station, index) => {
                const stationKey = station.name || station.code || '';
                const orderCount = stationOrderCounts[stationKey] || 0;
                return (
                  <StationItem
                    key={station.code || station.name || index}
                    station={station}
                    isSelected={selectedStation?.name === station.name}
                    hasOrders={orderCount > 0}
                    orderCount={orderCount}
                    onPress={() => handleStationSelect(station)}
                  />
                );
              })}
            </View>
          )}
        </WorkflowStepCard>

        {/* Order Selection */}
        <WorkflowStepCard
          title="Üretim Emri Seçimi"
          description="Detaylarını görmek için üretim emri seçin"
          iconName="assignment"
          isCompleted={false}
          dynamicCount={orders.length}
          isExpanded={true}
        >
          {!selectedStation ? (
            <View style={styles.placeholderContainer}>
              <Icon name="assignment" size={48} color="#D1D5DB" />
              <Text style={[styles.placeholderText, { color: secondaryTextColor }]}>Önce hat seçiniz</Text>
            </View>
          ) : isLoadingOrders ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={primaryColor} />
            </View>
          ) : orders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="assignment" size={48} color="#D1D5DB" />
              <Text style={[styles.emptyTitle, { color: secondaryTextColor }]}>Üretim Emri Bulunamadı</Text>
              <Text style={[styles.emptyDescription, { color: secondaryTextColor }]}>Bu hat için aktif üretim emri bulunmuyor.</Text>
            </View>
          ) : (
            <View style={styles.ordersList}>
              {orders.map(order => (
                <OrderItem key={order.ficheno} order={order} onPress={() => handleOrderSelect(order)} />
              ))}
            </View>
          )}
        </WorkflowStepCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
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
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: 16 },
  loadingText: { marginTop: 16, fontSize: 14 },
  errorTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  errorText: { fontSize: 14, marginTop: 8, textAlign: 'center' },

  // Workflow Card
  workflowCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 4, ...Shadows.md },
  workflowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  workflowHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  stepIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  workflowTitleContainer: { flex: 1 },
  workflowTitle: { fontWeight: '700', fontSize: 16, marginBottom: 4 },
  workflowDescription: { fontWeight: '400', fontSize: 12 },
  workflowHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  countText: { fontWeight: '700', fontSize: 14 },
  expandButton: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  divider: { height: 1, marginHorizontal: 16 },
  workflowContent: { padding: 16 },
  selectionList: { gap: 12 },

  // Station Item
  stationItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12 },
  stationLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  stationDot: { width: 8, height: 8, borderRadius: 4 },
  stationName: { fontSize: 16, flex: 1 },
  orderCountBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, minWidth: 32, alignItems: 'center' },
  orderCountText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  // Order Item
  orderItem: { backgroundColor: Colors.bgWhite, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: 12, ...Shadows.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  fisNoWrap: { gap: 2 },
  fisNoLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: Colors.textSecondary },
  fisNoValue: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.round },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  infoGrid: { flexDirection: 'row', alignItems: 'stretch', marginBottom: 14 },
  infoItem: { flex: 1 },
  productInfoItem: { flex: 1.3 },
  infoSep: { width: 1, backgroundColor: Colors.borderLight, marginHorizontal: 12 },
  infoLabelCard: { fontSize: 11, fontWeight: '700', letterSpacing: 0.7, color: Colors.textSecondary, marginBottom: 4 },
  infoValueCard: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  infoCodeCard: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  numbersBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgSurface, borderRadius: Radius.md, paddingVertical: 12, paddingHorizontal: 10, marginBottom: 14 },
  numberItem: { flex: 1, alignItems: 'center', gap: 2 },
  numberLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },
  numberValue: { fontSize: 15, color: Colors.textPrimary, fontWeight: '700' },
  numberDivider: { width: 1, alignSelf: 'stretch', backgroundColor: Colors.borderLight },
  progressSection: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderProgressBar: { flex: 1, height: 6, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 999, overflow: 'hidden' },
  orderProgressFill: { height: '100%', borderRadius: 999 },
  orderProgressText: { fontSize: 12, fontWeight: '700' },
  ordersList: { gap: 0 },

  // Placeholder & Empty States
  loadingContainer: { padding: 32, alignItems: 'center' },
  placeholderContainer: { padding: 24, alignItems: 'center', gap: 8 },
  placeholderText: { fontSize: 14 },
  emptyContainer: { padding: 20, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyDescription: { fontSize: 14, textAlign: 'center' },
});
