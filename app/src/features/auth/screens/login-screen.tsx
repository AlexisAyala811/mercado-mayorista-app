import { useState } from "react";
import { Image } from "expo-image";
import { useFonts } from "expo-font";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import {
  hasLoginValidationErrors,
  validateLoginInput,
  validatePassword,
  validateUsername,
  type LoginValidationErrors,
} from "@/features/auth/validation/login-validation";
import { AppButton, AppScreen, BrandMark, FormField, LoadingState } from "@/ui/components";
import { color, radius, spacing, typography } from "@/ui/tokens";

type LoginCredentials = {
  password: string;
  username: string;
};

type LoginScreenProps = {
  errorMessage?: string | null;
  isSubmitting?: boolean;
  hasPendingSessionRemoval?: boolean;
  isClearingLocalSession?: boolean;
  onRetrySessionRemoval?: () => void;
  onSubmit?: (credentials: LoginCredentials) => void;
};

export function LoginScreen({
  errorMessage,
  isSubmitting = false,
  hasPendingSessionRemoval = false,
  isClearingLocalSession = false,
  onRetrySessionRemoval,
  onSubmit,
}: LoginScreenProps) {
  const { height, width } = useWindowDimensions();
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [errors, setErrors] = useState<LoginValidationErrors>({});
  const isWide = width >= 1200;
  const [fontsLoaded, fontError] = useFonts({
    LoginInterRegular: require("@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf"),
    LoginInterSemiBold: require("@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf"),
    LoginInterBold: require("@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf"),
  });
  const canSubmit = Boolean(
    onSubmit &&
    username.trim() &&
    password &&
    !isSubmitting &&
    !hasPendingSessionRemoval,
  );

  function handleSubmit() {
    const credentials = { password, username: username.trim() };
    const nextErrors = validateLoginInput(credentials);
    setErrors(nextErrors);

    if (
      hasLoginValidationErrors(nextErrors) ||
      !onSubmit ||
      isSubmitting ||
      hasPendingSessionRemoval
    )
      return;
    onSubmit(credentials);
  }

  if (!fontsLoaded && !fontError)
    return (
      <AppScreen>
        <LoadingState label="Preparando acceso" />
      </AppScreen>
    );
  return (
    <AppScreen
      edgeToEdge
      contentContainerStyle={styles.screen}
      testID="login-screen"
    >
      <View
        style={[
          styles.shell,
          isWide ? styles.shellWide : styles.shellCompact,
          isWide ? { minHeight: height } : null,
        ]}
      >
        <View
          style={[
            styles.brandPanel,
            isWide ? styles.brandPanelWide : styles.brandPanelCompact,
          ]}
        >
          <Image
            source={require("../../../../assets/figma/original/login/decoracion-superior.svg")}
            contentFit="contain"
            accessibilityElementsHidden
            style={styles.decorationTop}
          />
          <Image
            source={require("../../../../assets/figma/original/login/decoracion-inferior.svg")}
            contentFit="contain"
            accessibilityElementsHidden
            style={styles.decorationBottom}
          />
          <View style={styles.brandContent}>
            <View style={styles.brandBadge}>
              <BrandMark size={isWide ? 112 : 72} />
            </View>
            <Text
              accessibilityRole="header"
              style={[styles.brandTitle, !isWide && styles.brandTitleCompact]}
            >
              MAÑAY
            </Text>
            <Text style={styles.brandSubtitle}>Gestión comercial de papa</Text>
            <Text
              style={[
                styles.brandDescription,
                !isWide && styles.brandDescriptionCompact,
              ]}
            >
              Registra y consulta las operaciones del mercado desde un solo
              lugar.
            </Text>
          </View>

          <View
            style={[styles.roleNotice, !isWide && styles.roleNoticeCompact]}
          >
            <Text style={styles.roleTitle}>Acceso por rol</Text>
            <Text style={styles.roleDescription}>
              Las acciones disponibles se habilitan según el perfil asignado.
            </Text>
          </View>

          {isWide ? (
            <Text style={styles.brandFooter}>
              Mercado · Gestión de operaciones
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.formPanel,
            isWide ? styles.formPanelWide : styles.formPanelCompact,
          ]}
        >
          <View style={[styles.formCard, !isWide && styles.formCardCompact]}>
            <Text accessibilityRole="header" style={styles.formTitle}>
              Bienvenido
            </Text>
            <Text style={styles.formDescription}>
              Ingresa tus credenciales para continuar.
            </Text>
            <View style={styles.fields}>
              {errorMessage ? (
                <View
                  accessibilityLiveRegion="assertive"
                  style={styles.loginError}
                >
                  <Text style={styles.loginErrorText}>{errorMessage}</Text>
                </View>
              ) : null}
              <FormField
                appearance="login"
                autoCapitalize="none"
                autoComplete="username"
                autoCorrect={false}
                error={errors.username}
                label="Usuario"
                onBlur={() => {
                  setErrors((current) => ({
                    ...current,
                    username: validateUsername(username),
                  }));
                }}
                onChangeText={(value) => {
                  setUsername(value);
                  if (errors.username)
                    setErrors((current) => ({
                      ...current,
                      username: undefined,
                    }));
                }}
                placeholder="Ingresa tu usuario"
                returnKeyType="next"
                textContentType="username"
                value={username}
              />
              <FormField
                appearance="login"
                autoCapitalize="none"
                autoComplete="current-password"
                error={errors.password}
                label="Contraseña"
                onBlur={() => {
                  setErrors((current) => ({
                    ...current,
                    password: validatePassword(password),
                  }));
                }}
                onChangeText={(value) => {
                  setPassword(value);
                  if (errors.password)
                    setErrors((current) => ({
                      ...current,
                      password: undefined,
                    }));
                }}
                onSubmitEditing={handleSubmit}
                placeholder="Ingresa tu contraseña"
                returnKeyType="done"
                secureTextEntry
                textContentType="password"
                value={password}
              />
            </View>
            <View style={styles.formActions}>
              {hasPendingSessionRemoval ? (
                <AppButton
                  appearance="login"
                  disabled={isClearingLocalSession || !onRetrySessionRemoval}
                  label={
                    isClearingLocalSession
                      ? "Retirando sesión…"
                      : "Reintentar cierre"
                  }
                  onPress={onRetrySessionRemoval}
                  tone="secondary"
                />
              ) : null}
              <AppButton
                appearance="login"
                disabled={!canSubmit}
                label={isSubmitting ? "Ingresando…" : "Iniciar sesión"}
                onPress={handleSubmit}
              />
              <Text style={styles.securityMessage}>
                Tu información se valida de forma segura.
              </Text>
              <View style={styles.divider} />
              <Text style={styles.helpMessage}>
                Si no puedes acceder, comunícate con la persona responsable del
                mercado.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1 },
  shell: { width: "100%", backgroundColor: color.surface },
  shellWide: { flexDirection: "row" },
  shellCompact: { flexDirection: "column" },
  brandPanel: {
    backgroundColor: color.brand,
    overflow: "hidden",
    position: "relative",
  },
  brandPanelWide: {
    width: "37.5%",
    paddingHorizontal: 56,
    paddingTop: 180,
    paddingBottom: 65,
  },
  brandPanelCompact: { padding: 24 },
  decorationTop: {
    position: "absolute",
    left: 255,
    top: -148,
    width: 450,
    height: 450,
  },
  decorationBottom: {
    position: "absolute",
    left: -185,
    bottom: -91,
    width: 350,
    height: 350,
  },
  brandContent: { maxWidth: 392 },
  // White tile so the greens of the MAÑAY logo read on the brand panel.
  brandBadge: {
    alignSelf: "flex-start",
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.xl,
    padding: spacing.sm,
  },
  brandSubtitle: {
    color: color.brandMuted,
    fontFamily: "LoginInterSemiBold",
    fontSize: 20,
    lineHeight: 28,
    marginTop: spacing.sm,
  },
  brandTitle: {
    color: color.textOnBrand,
    fontFamily: "LoginInterBold",
    fontSize: 46,
    lineHeight: 56,
    marginTop: 34,
  },
  brandTitleCompact: { fontSize: 26, lineHeight: 32, marginTop: 16 },
  brandDescription: {
    color: color.brandMuted,
    fontFamily: "LoginInterRegular",
    fontSize: 19,
    lineHeight: 29,
    maxWidth: 360,
    marginTop: 30,
  },
  brandDescriptionCompact: { fontSize: 16, lineHeight: 24, marginTop: 16 },
  roleNotice: { marginTop: 125, maxWidth: 345, gap: 15 },
  roleNoticeCompact: { marginTop: 24 },
  roleTitle: {
    color: color.textOnBrand,
    fontFamily: "LoginInterSemiBold",
    fontSize: 15,
    lineHeight: 18,
  },
  roleDescription: {
    color: color.brandMuted,
    fontFamily: "LoginInterRegular",
    fontSize: 16,
    lineHeight: 24,
  },
  brandFooter: {
    color: color.brandMuted,
    fontFamily: "LoginInterRegular",
    fontSize: 14,
    lineHeight: 17,
    marginTop: "auto",
    paddingTop: 32,
  },
  formPanel: { alignItems: "center", justifyContent: "center" },
  formPanelWide: { flex: 1, paddingLeft: 60, paddingVertical: 32 },
  formPanelCompact: { padding: 24 },
  formCard: {
    width: 520,
    minHeight: 650,
    backgroundColor: color.surfaceRaised,
    borderRadius: 24,
    paddingHorizontal: 44,
    paddingTop: 50,
    paddingBottom: 64,
    boxShadow: "0px 14px 30px rgba(13,31,20,0.14)",
  },
  formCardCompact: {
    width: "100%",
    maxWidth: 520,
    minHeight: 0,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  formTitle: {
    color: color.textPrimary,
    fontFamily: "LoginInterBold",
    fontSize: 32,
    lineHeight: 39,
  },
  formDescription: {
    color: color.textSecondary,
    fontFamily: "LoginInterRegular",
    fontSize: 17,
    lineHeight: 21,
    marginTop: 9,
  },
  fields: { marginTop: 41, gap: 20 },
  formActions: { marginTop: 40 },
  loginError: {
    backgroundColor: color.dangerMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  loginErrorText: {
    color: color.danger,
    ...typography.bodySmall,
    fontWeight: "600",
  },
  securityMessage: {
    color: color.textSecondary,
    fontFamily: "LoginInterRegular",
    fontSize: 14,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 26,
  },
  divider: { backgroundColor: color.border, height: 1, marginTop: 31 },
  helpMessage: {
    color: color.textSecondary,
    fontFamily: "LoginInterRegular",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 25,
  },
});
