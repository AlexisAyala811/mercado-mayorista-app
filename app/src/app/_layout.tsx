import { Stack, usePathname, useRouter, type Href } from "expo-router";
import { useMemo } from "react";
import { useInitialPurchaseDraftSession } from "@/features/reception/use-initial-purchase-draft-session";
import { StatusBar } from "expo-status-bar";

import {
  SessionProvider,
  useSession,
} from "@/features/auth/session/session-provider";
import { SyncQueueProvider } from "@/features/sync/sync-queue-provider";
import { useSyncStatus } from "@/features/sync/use-sync-status";
import { Modal, View } from "react-native";
import { AppScreen, FeedbackState, LoadingState } from "@/ui/components";
import { AppChromeProvider } from "@/ui/navigation/app-chrome";
import { BottomNav } from "@/ui/navigation/bottom-nav";

export default function RootLayout() {
  return (
    <SessionProvider>
      <SyncQueueProvider>
        <StatusBar style="dark" />
        <View style={{ flex: 1 }}>
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
  const pathname = usePathname();
  const router = useRouter();
  useInitialPurchaseDraftSession();
  // Spec 011 (CL-ST18): the state of the queue goes in the Stitch header.
  const sync = useSyncStatus();
  const connection = useMemo(
    () => (sync ? { ...sync, onPress: () => router.push("/sync-queue" as Href) } : null),
    // The text fields stand for the whole state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sync?.tone, sync?.title, sync?.detail, sync?.accessibilityLabel, router],
  );
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
  // Spec 011 (RQ-ST02, CL-ST18): the Stitch dock on every screen after sign-in, the menu included.
  const showBottomNav = Boolean(session) && pathname !== "/";
  return (
    <AppChromeProvider
      connection={connection}
      role={session ? (session.user.role === "wholesaler" ? "Mayorista" : "Encargado con reemplazo vigente") : null}
      username={session?.user?.username ?? null}
    >
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
          <Stack.Screen name="debts" />
          <Stack.Screen name="collections" />
          <Stack.Screen name="buyer-statement" />
          <Stack.Screen name="logistics" />
          <Stack.Screen name="reports" />
          <Stack.Screen name="analytics" />
          <Stack.Screen name="cost-settlements" />
          <Stack.Screen name="receipts" />
          <Stack.Screen name="catalog" />
          <Stack.Screen name="sales-history" />
          <Stack.Screen name="purchase-history" />
          <Stack.Screen name="administration" />
          <Stack.Screen name="audit" />
        </Stack.Protected>
      </Stack>
      {showBottomNav ? <BottomNav onMenu={pathname === "/home"} /> : null}
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
    </AppChromeProvider>
  );
}
