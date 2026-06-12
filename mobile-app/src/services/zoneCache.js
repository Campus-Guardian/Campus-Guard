import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { mApi } from '../config/api';

const CACHE_KEY = 'cg_zone_cache';
const STATE_KEY = 'cg_local_zone_state';

function pointInPolygon(latitude, longitude, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const yi = polygon[i][0];
    const xi = polygon[i][1];
    const yj = polygon[j][0];
    const xj = polygon[j][1];
    const intersects = ((yi > latitude) !== (yj > latitude))
      && (longitude < ((xj - xi) * (latitude - yi)) / ((yj - yi) || Number.EPSILON) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

export async function refreshZoneCache() {
  const result = await mApi('/zones');
  const zones = (result.data || []).filter((zone) => zone.is_active !== false);
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(zones));
  return zones;
}

export async function evaluateLocalZones(location) {
  if (!location || location.accuracy == null || location.accuracy > 25) return;
  const [zonesValue, stateValue] = await Promise.all([
    AsyncStorage.getItem(CACHE_KEY),
    AsyncStorage.getItem(STATE_KEY),
  ]);
  const zones = zonesValue ? JSON.parse(zonesValue) : [];
  const state = stateValue ? JSON.parse(stateValue) : {};
  const now = Date.now();

  for (const zone of zones) {
    if (!['danger', 'restricted'].includes(zone.type) || !Array.isArray(zone.polygon)) continue;
    const key = String(zone.id);
    const current = state[key] || { insideCount: 0, outsideCount: 0, alerted: false, lastAt: 0 };
    if (now - current.lastAt > 15000) {
      current.insideCount = 0;
      current.outsideCount = 0;
    }

    const inside = pointInPolygon(location.latitude, location.longitude, zone.polygon);
    current.lastAt = now;
    current.insideCount = inside ? current.insideCount + 1 : 0;
    current.outsideCount = inside ? 0 : current.outsideCount + 1;

    if (current.insideCount >= 2 && !current.alerted) {
      current.alerted = true;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'CampusGuard bolge uyarisi',
          body: `${zone.name} alanina girdiniz. Lutfen bolgeden ayrilin.`,
          data: { zone_id: zone.id, local_only: true },
        },
        trigger: null,
      });
    } else if (current.outsideCount >= 2) {
      current.alerted = false;
    }
    state[key] = current;
  }

  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
}
