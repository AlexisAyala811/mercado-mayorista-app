import {
  AESSealedData,
  AESEncryptionKey,
  aesDecryptAsync,
  aesEncryptAsync,
} from "expo-crypto";
import { File, Paths } from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type StorageScope = { businessId: string; userId: string };

export type RecordNamespace = "queue" | "sale-catalog" | "reception-catalog";

const decoder = new TextDecoder();
const encoder = new TextEncoder();
const pendingRecords = new Map<string, Promise<unknown>>();

function serializeRecord<T>(
  scope: StorageScope,
  namespace: RecordNamespace,
  work: () => Promise<T>,
): Promise<T> {
  const id = `${namespace}.${storageId(scope)}`;
  const previous = pendingRecords.get(id) ?? Promise.resolve();
  const result = previous.catch(() => undefined).then(work);
  const tail = result.then(
    () => undefined,
    () => undefined,
  );
  pendingRecords.set(id, tail);
  void tail.then(() => {
    if (pendingRecords.get(id) === tail) pendingRecords.delete(id);
  });
  return result;
}

function storageId(scope: StorageScope) {
  return `${scope.businessId}.${scope.userId}`;
}

function keyName(scope: StorageScope, namespace: RecordNamespace) {
  return `mercado.${namespace}.key.${storageId(scope)}`;
}

function recordName(scope: StorageScope, namespace: RecordNamespace) {
  return `mercado.${namespace}.data.${storageId(scope)}`;
}

function nativeFile(
  scope: StorageScope,
  namespace: RecordNamespace,
  suffix = "",
) {
  return new File(
    Paths.document,
    `mercado-${namespace}-${storageId(scope)}.bin${suffix}`,
  );
}

function webStorage() {
  if (!globalThis.localStorage)
    throw new Error("El almacenamiento del navegador no está disponible.");
  return globalThis.localStorage;
}

async function readKey(
  scope: StorageScope,
  namespace: RecordNamespace,
  allowCreate: boolean,
) {
  const name = keyName(scope, namespace);
  const encoded =
    Platform.OS === "web"
      ? webStorage().getItem(name)
      : await SecureStore.getItemAsync(name);
  if (encoded) return AESEncryptionKey.import(encoded, "hex");
  const hasData =
    Platform.OS === "web"
      ? webStorage().getItem(recordName(scope, namespace)) !== null
      : ["", ".previous", ".writing"].some(
          (suffix) => nativeFile(scope, namespace, suffix).exists,
        );
  if (!allowCreate || hasData)
    throw new Error(
      "No se encontró la clave de los pendientes cifrados. Conserva los datos del dispositivo para recuperación.",
    );

  const key = await AESEncryptionKey.generate();
  const value = await key.encoded("hex");
  if (Platform.OS === "web") webStorage().setItem(name, value);
  else await SecureStore.setItemAsync(name, value);
  return key;
}

export function readEncryptedRecord(
  scope: StorageScope,
  namespace: RecordNamespace,
): Promise<unknown> {
  return serializeRecord(scope, namespace, () => readRecord(scope, namespace));
}
export function writeEncryptedRecord(
  scope: StorageScope,
  namespace: RecordNamespace,
  value: unknown,
): Promise<void> {
  return serializeRecord(scope, namespace, () =>
    writeRecord(scope, namespace, value),
  );
}

async function readRecord(
  scope: StorageScope,
  namespace: RecordNamespace,
): Promise<unknown> {
  const combined =
    Platform.OS === "web"
      ? readWebBytes(recordName(scope, namespace))
      : await readNativeBytes(scope, namespace);
  if (!combined) return undefined;

  const key = await readKey(scope, namespace, false);
  const plaintext = await aesDecryptAsync(
    AESSealedData.fromCombined(combined),
    key,
  );
  if (!(plaintext instanceof Uint8Array))
    throw new Error(
      "No se pudo interpretar la cola cifrada. Conserva los datos del dispositivo.",
    );
  const parsed = JSON.parse(decoder.decode(plaintext)) as unknown;
  return parsed;
}

async function writeRecord(
  scope: StorageScope,
  namespace: RecordNamespace,
  value: unknown,
) {
  const key = await readKey(scope, namespace, true);
  const sealed = await aesEncryptAsync(
    encoder.encode(JSON.stringify(value)),
    key,
  );
  const combined = await sealed.combined();

  if (Platform.OS === "web") {
    webStorage().setItem(recordName(scope, namespace), bytesToBase64(combined));
    return;
  }

  const target = nativeFile(scope, namespace);
  const staged = nativeFile(scope, namespace, ".writing");
  const previous = nativeFile(scope, namespace, ".previous");
  staged.create({ overwrite: true });
  staged.write(combined);
  await verifyNativeBytes(staged, combined);
  // Expo can fall back to copy/delete when moving. Keep the last committed
  // ciphertext intact before replacing the destination; do not assume atomicity.
  if (target.exists) await target.copy(previous, { overwrite: true });
  await staged.move(target, { overwrite: true });
  await verifyNativeBytes(target, combined);
}

async function verifyNativeBytes(file: File, expected: Uint8Array) {
  const saved = await file.bytes();
  if (
    saved.length !== expected.length ||
    saved.some((byte, index) => byte !== expected[index])
  ) {
    throw new Error(
      "No se pudo verificar el guardado de los pendientes. Conserva los datos del dispositivo.",
    );
  }
}

async function readNativeBytes(
  scope: StorageScope,
  namespace: RecordNamespace,
) {
  const target = nativeFile(scope, namespace);
  if (target.exists) return target.bytes();
  const previous = nativeFile(scope, namespace, ".previous");
  if (previous.exists) return previous.bytes();
  if (nativeFile(scope, namespace, ".writing").exists) {
    throw new Error(
      "Hay un guardado interrumpido de pendientes. Conserva los datos del dispositivo para recuperación.",
    );
  }
  return null;
}

function readWebBytes(name: string) {
  const encoded = webStorage().getItem(name);
  if (encoded === null) return null;
  const binary = globalThis.atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return globalThis.btoa(binary);
}
