import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { mApi } from '../config/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerPushToken(deviceId) {
  if (!Device.isDevice) return null;
  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('campus-safety', {
      name: 'Kampus guvenlik uyarilari',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const projectId = Constants.easConfig?.projectId
    || Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return null;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await mApi('/mobile/push-token', {
    method: 'PUT',
    body: JSON.stringify({
      expo_push_token: token,
      device_id: deviceId,
      platform: Platform.OS,
    }),
  });
  return token;
}
