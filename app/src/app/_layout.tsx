import { Stack, usePathname, useRouter, type ErrorBoundaryProps, type Href } from "expo-router";
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
import { ChangePasswordScreen } from "@/features/auth/screens/change-password-screen";

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

// Spec 011 (CL-ST36): a failure while drawing a screen no longer closes the
// app. Expo Router shows this in place of the route that failed; what was
// captured stays in the encrypted queue.
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <AppScreen contentContainerStyle={{ justifyContent: "center" }} scrollable={false}>
      <FeedbackState
        actionLabel="Reintentar"
        message="Lo que ya guardaste sigue en la tablet. Vuelve a intentar; si se repite, cierra y abre la aplicación."
        onAction={() => void retry()}
        title="Algo falló en esta pantalla"
        tone="error"
      />
    </AppScreen>
  );
}

export function RootNavigator() {
  const {
    bootstrapError,
    changePassword,
    isBootstrapping,
    isRevalidating,
    logout,
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
  // Spec 023: the Administrator only has «Comerciantes»; no business dock.
  const isAdmin = session?.user.role === "admin";
  const mustChangePassword = Boolean(session?.user.mustChangePassword);
  const showBottomNav = Boolean(session) && !isAdmin && pathname !== "/";
  return (
    <AppChromeProvider
      connection={connection}
      role={session ? roleLabel(session.user.role) : null}
      username={session?.user?.username ?? null}
    >
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="index" />
        </Stack.Protected>
        <Stack.Protected guard={Boolean(session) && !isAdmin}>
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
        <Stack.Protected guard={isAdmin}>
          <Stack.Screen name="merchants" />
        </Stack.Protected>
      </Stack>
      {showBottomNav && !mustChangePassword ? (
        <BottomNav onMenu={pathname === "/home"} />
      ) : null}
      {/* One blocking layer over the navigator: revalidation, its failure or,
          spec 023 (CL-23-03), the forced password change after a temporary one. */}
      <Modal
        visible={
          Boolean(session) &&
          (isRevalidating || Boolean(bootstrapError) || mustChangePassword)
        }
        animationType="none"
        onRequestClose={() => {}}
      >
        {session && mustChangePassword && !isRevalidating && !bootstrapError ? (
          <ChangePasswordScreen
            onChangePassword={changePassword}
            onLogout={() => void logout()}
            username={session.user.username}
          />
        ) : (
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
        )}
      </Modal>
    </AppChromeProvider>
  );
}

function roleLabel(role: string) {
  if (role === "wholesaler") return "Mayorista";
  if (role === "admin") return "Administrador";
  return "Encargado con reemplazo vigente";
}
