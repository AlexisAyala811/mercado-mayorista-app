import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { forgetOperator, parseRecentOperators, rememberOperator, type RecentOperator } from '@/domain/auth/recent-operators';

// Spec 011 (CL-ST16): operators that signed in on this tablet, kept only on
// the device, in the same secure store as the session.
const operatorsKey = 'mercado.operators.v1';

const webStorage = () => (typeof localStorage === 'undefined' ? undefined : localStorage);

export async function readRecentOperators(): Promise<RecentOperator[]> {
  try {
    const value = Platform.OS === 'web' ? (webStorage()?.getItem(operatorsKey) ?? null) : await SecureStore.getItemAsync(operatorsKey);
    return parseRecentOperators(value);
  } catch {
    return [];
  }
}

async function write(list: RecentOperator[]) {
  const value = JSON.stringify(list);
  if (Platform.OS === 'web') webStorage()?.setItem(operatorsKey, value);
  else await SecureStore.setItemAsync(operatorsKey, value);
}

// keep = «Mantener estación activa»: remembers the operator; unchecked, it
// removes them from the list. A storage failure never blocks the sign-in.
export async function recordOperatorSignIn(operator: RecentOperator, keep: boolean) {
  try {
    const current = await readRecentOperators();
    await write(keep ? rememberOperator(current, operator) : forgetOperator(current, operator.username));
  } catch {
    // The list is a convenience; the session is already valid.
  }
}
