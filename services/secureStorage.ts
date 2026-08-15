import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Cross-platform storage for the Hermes session token.
 *
 * `expo-secure-store` wraps the OS keychain (iOS) / Keystore (Android) and is
 * the recommended mechanism for sensitive values in Expo apps, but it has no
 * web implementation — browsers don't expose OS-level secure storage to a
 * page. On web this falls back to `localStorage`, which is what Expo's own
 * Router authentication guide recommends for the same reason.
 *
 * This is a known ceiling, not an oversight: `localStorage` is readable by
 * any script on the page (XSS risk). The stronger long-term answer is to
 * have the backend set the session as an httpOnly cookie for the web client
 * instead of returning a bearer token the frontend has to store at all — see
 * docs/authentication.md. Until that exists, this adapter is the pragmatic
 * default and keeps the rest of the app storage-mechanism-agnostic.
 */

const SESSION_KEY = 'hermes.session';

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const sessionStorage = {
  async read(): Promise<string | null> {
    return getItem(SESSION_KEY);
  },
  async write(serializedSession: string): Promise<void> {
    return setItem(SESSION_KEY, serializedSession);
  },
  async clear(): Promise<void> {
    return deleteItem(SESSION_KEY);
  },
};
