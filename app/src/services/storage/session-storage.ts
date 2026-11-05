import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { parseStoredSession, type AuthenticatedSession } from '@/domain/auth/session';

const sessionKey = 'mercado.session.v1';

export async function readStoredSession() {
  const value =
    Platform.OS === 'web'
      ? readWebStorage()
      : await SecureStore.getItemAsync(sessionKey);
  return parseStoredSession(value);
}

export async function writeStoredSession(session: AuthenticatedSession) {
  const value = JSON.stringify(session);
  if (Platform.OS === 'web') {
    getWebStorage()?.setItem(sessionKey, value);
    return;
  }
  await SecureStore.setItemAsync(sessionKey, value);
}

export async function clearStoredSession() {
  if (Platform.OS === 'web') {
    getWebStorage()?.removeItem(sessionKey);
    return;
  }
  await SecureStore.deleteItemAsync(sessionKey);
}

function readWebStorage() {
  return getWebStorage()?.getItem(sessionKey) ?? null;
}

function getWebStorage() {
  return typeof localStorage === 'undefined' ? undefined : localStorage;
}
