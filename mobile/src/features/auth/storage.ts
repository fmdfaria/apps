import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { SessionTokens, User } from '@/features/auth/types';

const ACCESS_TOKEN_KEY = 'auth.accessToken';
const REFRESH_TOKEN_KEY = 'auth.refreshToken';
const USER_KEY = 'auth.user';

async function secureStoreAvailable() {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

async function setItem(key: string, value: string) {
  if (await secureStoreAvailable()) {
    await SecureStore.setItemAsync(key, value);
    return;
  }

  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(key, value);
  }
}

async function getItem(key: string) {
  if (await secureStoreAvailable()) {
    return SecureStore.getItemAsync(key);
  }

  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(key) ?? null;
  }

  return null;
}

async function removeItem(key: string) {
  if (await secureStoreAvailable()) {
    await SecureStore.deleteItemAsync(key);
    return;
  }

  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(key);
  }
}

export async function storeTokens(tokens: SessionTokens) {
  await Promise.all([
    setItem(ACCESS_TOKEN_KEY, tokens.accessToken),
    setItem(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function getAccessToken() {
  return getItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken() {
  return getItem(REFRESH_TOKEN_KEY);
}

export async function storeUser(user: User) {
  await setItem(USER_KEY, JSON.stringify(user));
}

export async function getStoredUser() {
  const raw = await getItem(USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export async function clearSessionStorage() {
  await Promise.all([removeItem(ACCESS_TOKEN_KEY), removeItem(REFRESH_TOKEN_KEY), removeItem(USER_KEY)]);
}
