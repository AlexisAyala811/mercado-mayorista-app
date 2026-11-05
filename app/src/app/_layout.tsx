import { Stack } from "expo-router";
import { useInitialPurchaseDraftSession } from "@/features/reception/use-initial-purchase-draft-session";
import { StatusBar } from "expo-status-bar";

import {
  SessionProvider,
  useSession,
} from "@/features/auth/session/session-provider";
import { SyncQueueProvider } from "@/features/sync/sync-queue-provider";
import { SyncStatusBanner } from "@/features/sync/sync-status-banner";
import { Modal, View } from "react-native";
import { AppScreen, FeedbackState, LoadingState } from "@/ui/components";

export default function RootLayout() {
  return (
    <SessionProvider>
      <SyncQueueProvider>
        <StatusBar style="dark" />
        <View style={{ flex: 1 }}>
          <SyncStatusBanner />
          <RootNavigator />
        </View>
      </SyncQueueProvider>
    </SessionProvider>
  );
}

export function RootNavigator() {
  const {
    bootstrapError,
    isBootstrapping,
    isRevalidating,
    retryBootstrap,
    session,
  } = useSession();
  useInitialPurchaseDraftSession();
  if (isBootstrapping) {
    return (
      <AppScreen
        contentContainerStyle={{ justifyContent: "center" }}
        scrollable={false}
      >
        <LoadingState label="Validando la sesión" />
      </AppScreen>
    );
  }
  if (bootstrapError && !session) {
    return (
      <AppScreen
        contentContainerStyle={{ justifyContent: "center" }}
        scrollable={false}
      >
        <FeedbackState
          actionLabel="Reintentar"
          message={bootstrapError}
          onAction={retryBootstrap}
          title="No se pudo validar la sesión"
          tone="error"
        />
      </AppScreen>
    );
  }
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="index" />
        </Stack.Protected>
        <Stack.Protected guard={Boolean(session)}>
          <Stack.Screen name="home" />
          <Stack.Screen name="messaging" />
          <Stack.Screen name="purchase-flow" />
          <Stack.Screen name="sale-flow" />
          <Stack.Screen name="sync-queue" />
          <Stack.Screen name="inventory" />
          <Stack.Screen name="accounts" />
          <Stack.Screen name="logistics" />
          <Stack.Screen name="reports" />
          <Stack.Screen name="analytics" />
          <Stack.Screen name="cost-settlements" />
          <Stack.Screen name="receipts" />
          <Stack.Screen name="catalog" />
          <Stack.Screen name="inventory-adjustment" />
          <Stack.Screen name="sales-history" />
          <Stack.Screen name="purchase-history" />
          <Stack.Screen name="administration" />
          <Stack.Screen name="audit" />
        </Stack.Protected>
      </Stack>
      <Modal
        visible={
          Boolean(session) && (isRevalidating || Boolean(bootstrapError))
        }
        animationType="none"
        onRequestClose={() => {}}
      >
        <AppScreen
          contentContainerStyle={{ justifyContent: "center" }}
          scrollable={false}
        >
          {bootstrapError ? (
            <FeedbackState
              actionLabel="Reintentar"
              message={bootstrapError}
              onAction={retryBootstrap}
              title="No se pudo revalidar la sesión"
              tone="error"
            />
          ) : (
            <LoadingState label="Revalidando la sesión" />
          )}
        </AppScreen>
      </Modal>
    </>
  );
}
