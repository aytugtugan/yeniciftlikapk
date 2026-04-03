import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar, BackHandler,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SimpleIcon from '../components/SimpleIcon';
import { Colors, Shadows } from '../theme';
import { AppDataContext } from '../context/AppDataContext';
import {
  getOncuFabrikalar, getOncuIstasyonlar, getOncuEmirlerByStation,
} from '../api/oncuApi';

export default function KaliteUretimSorguScreen({ navigation, route }) {
  const preCode = route.params?.preCode;
  const preStationName = route.params?.preStationName;
  const preFactoryCode = route.params?.preFactoryCode;
  const { oncuToken } = useContext(AppDataContext);
  const insets = useSafeAreaInsets();
  const initialLoadDone = useRef(false);
  const hasNavigated = useRef(false);
  const preCodeProcessedRef = useRef(null);

  const [stationsLoading, setStationsLoading] = useState(true);
  const [stationsError, setStationsError] = useState(null);
  const [stations, setStations] = useState([]);
  const [hatEmirDurumlari, setHatEmirDurumlari] = useState({});
  const [hatEmirSayilari, setHatEmirSayilari] = useState({});

  const [selectedStation, setSelectedStation] = useState(null);
  const [onlyShowMatched, setOnlyShowMatched] = useState(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [tamamlamaYuzdeleri, setTamamlamaYuzdeleri] = useState({});

  useFocusEffect(useCallback(() => {
    hasNavigated.current = false;
    const onBack = () => { navigation.goBack(); return true; };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [navigation]));

  const loadStations = async () => {
    if (!oncuToken) return;
    setStationsLoading(true);
    setStationsError(null);
    try {
      const factories = await getOncuFabrikalar(oncuToken);
      const allStations = [];
      await Promise.all(
        (factories || []).map(async (f) => {
          try {
            const code = f.factoryCode?.toString() || f.id?.toString() || '';
            if (!code) return;
            const fStations = await getOncuIstasyonlar(oncuToken, code);
            fStations.forEach(s => { s.factoryCode = code; });
            allStations.push(...fStations);
          } catch {}
        }),
      );
      const durumlar = {};
      const sayilar = {};
      await Promise.all(
        allStations.map(async (station) => {
          try {
            const o = await getOncuEmirlerByStation(oncuToken, station.name);
            durumlar[station.name] = o.length > 0;
            sayilar[station.name] = o.length;
          } catch {
            durumlar[station.name] = false;
            sayilar[station.name] = 0;
          }
        }),
      );
      setStations(allStations);
      setHatEmirDurumlari(durumlar);
      setHatEmirSayilari(sayilar);

      // preCode varsa ve henüz işlenmediyse, eşleşen istasyonu bul
      if (preCode && preCodeProcessedRef.current !== preCode) {
        preCodeProcessedRef.current = preCode;
        const preCodeNorm = preCode.trim().toUpperCase();
        const matchedStation = allStations.find(s => {
          const codeNorm = (s.code || '').trim().toUpperCase();
          const nameNorm = (s.name || '').trim().toUpperCase();
          return codeNorm === preCodeNorm
            || nameNorm === preCodeNorm
            || (preCodeNorm.length >= 3 && (codeNorm.includes(preCodeNorm) || preCodeNorm.includes(codeNorm)))
            || nameNorm.includes(preCodeNorm);
        });
        if (matchedStation) {
          setOnlyShowMatched(matchedStation);
          loadOrders(matchedStation);
        } else {
          setOnlyShowMatched(null);
        }
      }
    } catch (err) {
      setStationsError(err.message || 'İstasyonlar yüklenemedi');
    } finally {
      setStationsLoading(false);
    }
  };

  const loadOrders = async (station) => {
    if (!oncuToken) return;
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const data = await getOncuEmirlerByStation(oncuToken, station.name);
      const yuzde = {};
      data.forEach((o) => {
        if (o.ficheno) {
          const plan = o.planMiktar || 0;
          const uretim = o.uretimMiktar || 0;
          yuzde[o.ficheno.trim()] = plan > 0 ? Math.round((uretim / plan) * 100) : 0;
        }
      });
      setOrders(data);
      setTamamlamaYuzdeleri(yuzde);
    } catch (err) {
      setOrdersError(err.message || 'Emirler yüklenemedi');
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (!initialLoadDone.current && oncuToken) {
      initialLoadDone.current = true;
      // If we already have station info from the scan, directly load orders
      if (preStationName && preFactoryCode) {
        const directStation = { name: preStationName, code: preCode || '', factoryCode: preFactoryCode };
        setOnlyShowMatched(directStation);
        preCodeProcessedRef.current = preCode;
        loadOrders(directStation);
        // Also load stations in background for the list fallback
        loadStations();
      } else {
        loadStations();
      }
    }
  }, [oncuToken]);

  const handleStationSelect = (station) => {
    setSelectedStation(station);
    setOnlyShowMatched(null);
    loadOrders(station);
  };

  const handleOrderPress = (order, stationName, stationFactoryCode) => {
    const ficheno = (order.ficheno || '').trim();
    if (!ficheno || hasNavigated.current) return;
    hasNavigated.current = true;
    navigation.push('KaliteSorguData', { ficheno, hatName: stationName.trim(), stationFactoryCode });
  };

  const getYuzdeColor = (y) => {
    if (y >= 100) return Colors.success;
    if (y >= 50) return Colors.warning;
    return Colors.orange;
  };

  const activeStation = onlyShowMatched || selectedStation;
  const preCodeProcessed = preCodeProcessedRef.current === preCode;
  const isLoadingPreselect = preCode && !preCodeProcessed && !onlyShowMatched && !selectedStation;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.brandPrimary} />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <SimpleIcon name="arrow_back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Üretim Sorgu</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Hat listesi - preCode eşleşmezse veya manuel girişte göster */}
        {!activeStation && !isLoadingPreselect && (
          <View>
            <Text style={styles.sectionTitle}>Hat Seçiniz:</Text>
            {stationsLoading && (
              <View style={styles.center}><ActivityIndicator size="large" color={Colors.brandPrimary} /></View>
            )}
            {stationsError && <Text style={styles.errorText}>Hata: {stationsError}</Text>}
            {!stationsLoading && !stationsError && stations.map((station, i) => {
              const emirVar = hatEmirDurumlari[station.name] === true;
              const emirSayisi = hatEmirSayilari[station.name] || 0;
              const isSelected = selectedStation?.code === station.code;
              return (
                <TouchableOpacity key={station.code || i}
                  style={[styles.stationCard, isSelected && { backgroundColor: `${Colors.brandPrimary}15` }]}
                  activeOpacity={0.7}
                  onPress={() => handleStationSelect(station)}>
                  <SimpleIcon name={emirVar ? 'check_circle' : 'cancel'} size={20}
                    color={emirVar ? Colors.success : Colors.danger} />
                  <Text style={[styles.stationName, isSelected && { color: Colors.brandPrimary }]} numberOfLines={1}>{station.name}</Text>
                  <View style={styles.emirBadge}>
                    <Text style={styles.emirLabel}>Emir:</Text>
                    <Text style={styles.emirCount}>{emirSayisi}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Preselect loading */}
        {isLoadingPreselect && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.brandPrimary} />
            <Text style={{ color: Colors.textPrimary, fontSize: 14, marginTop: 8 }}>Hat barkodu işleniyor...</Text>
          </View>
        )}

        {/* Seçili hattın emirleri */}
        {activeStation && (
          <View>
            <Text style={styles.sectionTitle}>
              {onlyShowMatched ? `Taranan Hat: ${activeStation.name}` : `Seçilen Hat: ${activeStation.name}`}
            </Text>
            {ordersLoading && (
              <View style={styles.center}><ActivityIndicator size="large" color={Colors.brandPrimary} /></View>
            )}
            {ordersError && <Text style={styles.errorText}>Hata: {ordersError}</Text>}
            {!ordersLoading && orders.length === 0 && !ordersError && (
              <View style={styles.emptyCard}>
                <SimpleIcon name="cancel" size={20} color={Colors.danger} />
                <Text style={styles.emptyText}>Bu hatta üretim emri bulunmamaktadır.</Text>
              </View>
            )}
            {orders.map((order, i) => {
              const fk = (order.ficheno || '').trim();
              const yuzde = tamamlamaYuzdeleri[fk];
              return (
                <TouchableOpacity key={order.ficheno || i} style={styles.orderCard} activeOpacity={0.7}
                  onPress={() => handleOrderPress(order, activeStation.name, activeStation.factoryCode)}>
                  <View style={styles.orderHeader}>
                    <View style={styles.orderIconBg}>
                      <SimpleIcon name="precision_manufacturing" size={20} color={Colors.brandPrimary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.ficheno} numberOfLines={1}>Fiş No: {order.ficheno}</Text>
                    </View>
                    {fk && yuzde !== undefined && (
                      <View style={[styles.yuzdeBadge, { backgroundColor: getYuzdeColor(yuzde) }]}>
                        <Text style={styles.yuzdeText}>%{yuzde}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.productName} numberOfLines={2}>{order.mamulAdi || order.code || ''}</Text>
                  <Text style={styles.productCode}>Kod: {order.code}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgApp },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingBottom: 14, backgroundColor: Colors.brandPrimary, ...Shadows.md,
  },
  headerBtn: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#FFF' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: Colors.brandPrimary, marginBottom: 8 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32 },
  errorText: { fontSize: 14, textAlign: 'center', color: Colors.danger, paddingVertical: 16 },
  stationCard: {
    flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10,
    marginBottom: 6, backgroundColor: Colors.bgSurface, ...Shadows.sm, gap: 8,
  },
  stationName: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  emirBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgWhite,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 4,
  },
  emirLabel: { fontSize: 11, color: Colors.textSecondary },
  emirCount: { fontSize: 13, fontWeight: '700', color: Colors.brandPrimary },
  emptyCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dangerLight,
    padding: 14, borderRadius: 10, gap: 8,
  },
  emptyText: { fontSize: 14, color: Colors.textPrimary },
  orderCard: {
    padding: 14, borderRadius: 12, marginBottom: 10,
    backgroundColor: Colors.bgSurface, ...Shadows.sm,
  },
  orderHeader: { flexDirection: 'row', alignItems: 'center' },
  orderIconBg: {
    width: 36, height: 36, borderRadius: 8, justifyContent: 'center',
    alignItems: 'center', backgroundColor: Colors.brandPrimaryLight,
  },
  ficheno: { fontSize: 14, fontWeight: '700', color: Colors.brandPrimary },
  yuzdeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  yuzdeText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  productName: { fontSize: 13, color: Colors.textPrimary, marginTop: 8 },
  productCode: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
});
