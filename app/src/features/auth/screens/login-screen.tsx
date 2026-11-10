import { useState } from "react";
import { Image } from "expo-image";
import { useFonts } from "expo-font";
import { SymbolView } from "@/ui/components/symbol";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import {
  operatorInitials,
  operatorRoleLabel,
  type RecentOperator,
} from "@/domain/auth/recent-operators";
import {
  hasLoginValidationErrors,
  validateLoginInput,
  validatePassword,
  validateUsername,
  type LoginValidationErrors,
} from "@/features/auth/validation/login-validation";
import { AppButton, AppScreen, BrandMark, FormField, LoadingState } from "@/ui/components";
import { accent, color, radius, spacing, typography } from "@/ui/tokens";

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
  onSubmit?: (credentials: LoginCredentials, options: { keepStation: boolean }) => void;
  // Spec 011 (RQ-ST12, CL-ST16): who already signed in on this tablet.
  operators?: RecentOperator[];
};

// Login of the Stitch mockup (spec 011, RQ-ST12): brand panel on the left and
// a floating card with the quick operator selection, the two fields and
// «Mantener estación activa». The scale and the terminal id of the mockup are
// left out (CL-ST12); the password is always typed.
export function LoginScreen({
  errorMessage,
  isSubmitting = false,
  hasPendingSessionRemoval = false,
  isClearingLocalSession = false,
  onRetrySessionRemoval,
  onSubmit,
  operators = [],
}: LoginScreenProps) {
  const { height, width } = useWindowDimensions();
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [keepStation, setKeepStation] = useState(true);
  const [errors, setErrors] = useState<LoginValidationErrors>({});
  const isWide = width >= 1000;
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
    onSubmit(credentials, { keepStation });
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
            <View style={styles.brandRow}>
              <View style={styles.brandBadge}>
                <BrandMark size={isWide ? 64 : 48} />
              </View>
              <View>
                <Text style={styles.brandName}>MAÑAY</Text>
                <Text style={styles.brandKind}>GESTIÓN COMERCIAL</Text>
              </View>
            </View>
            <Text
              accessibilityLabel="MAÑAY. Gestión comercial de papa"
              accessibilityRole="header"
              style={[styles.brandTitle, !isWide && styles.brandTitleCompact]}
            >
              Gestión comercial{"\n"}
              <Text style={styles.brandTitleAccent}>de papa</Text>
            </Text>
            <Text
              style={[
                styles.brandDescription,
                !isWide && styles.brandDescriptionCompact,
              ]}
            >
              Registra el pesaje por saco, las compras, las ventas y los
              comprobantes del mercado desde un solo lugar.
            </Text>
          </View>

          <View style={[styles.roleNotice, !isWide && styles.roleNoticeCompact]}>
            <View style={styles.roleIcon}>
              <SymbolView fallback={null} name={{ android: "badge", ios: "person.text.rectangle", web: "badge" }} size={22} tintColor="#6EE7B7" />
            </View>
            <View style={styles.roleCopy}>
              <Text style={styles.roleTitle}>Acceso por perfil asignado</Text>
              <Text style={styles.roleDescription}>
                Las opciones se habilitan según el perfil: Mayorista o
                Encargado con reemplazo vigente.
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.formPanel,
            isWide ? styles.formPanelWide : styles.formPanelCompact,
          ]}
        >
          <View style={[styles.formCard, !isWide && styles.formCardCompact]}>
            <View style={styles.securePill}>
              <SymbolView fallback={null} name={{ android: "lock", ios: "lock", web: "lock" }} size={16} tintColor={accent.emerald.ink} />
              <Text style={styles.securePillText}>Acceso seguro</Text>
            </View>
            <Text accessibilityRole="header" style={styles.formTitle}>
              Iniciar sesión
            </Text>
            <Text style={styles.formDescription}>
              Ingresa con tu usuario asignado para registrar compras y ventas.
            </Text>

            {operators.length ? (
              <View style={styles.operators}>
                <View style={styles.operatorsHeader}>
                  <Text accessibilityRole="header" style={styles.operatorsTitle}>
                    SELECCIÓN RÁPIDA DE OPERADOR
                  </Text>
                  <Text style={styles.operatorsHint}>Tocar para llenar el usuario</Text>
                </View>
                <View style={styles.operatorsGrid}>
                  {operators.map((operator) => {
                    const selected = operator.username === username;
                    return (
                      <Pressable
                        accessibilityHint="Llena el usuario. La contraseña se escribe."
                        accessibilityLabel={`${operator.username}, ${operatorRoleLabel(operator.role)}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        key={operator.username}
                        onPress={() => {
                          setUsername(operator.username);
                          setErrors((current) => ({ ...current, username: undefined }));
                        }}
                        style={[styles.operator, selected && styles.operatorSelected]}
                        testID={`operator-${operator.username}`}
                      >
                        <View style={[styles.operatorAvatar, operator.role === "wholesaler" && styles.operatorAvatarOwner]}>
                          <Text style={styles.operatorInitials}>{operatorInitials(operator.username)}</Text>
                        </View>
                        <View style={styles.operatorCopy}>
                          <Text numberOfLines={1} style={styles.operatorName}>{operator.username}</Text>
                          <Text numberOfLines={1} style={styles.operatorRole}>{operatorRoleLabel(operator.role)}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

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
              <Pressable
                accessibilityHint="Recuerda tu usuario en la selección rápida de esta tablet."
                accessibilityLabel="Mantener estación activa"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: keepStation }}
                onPress={() => setKeepStation((current) => !current)}
                style={styles.keep}
                testID="keep-station"
              >
                <View style={[styles.checkbox, keepStation && styles.checkboxChecked]}>
                  {keepStation ? <Text style={styles.checkboxMark}>✓</Text> : null}
                </View>
                <Text style={styles.keepText}>Mantener estación activa</Text>
              </Pressable>
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
                displayLabel={isSubmitting ? "Ingresando…" : "Iniciar sesión en MAÑAY"}
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
    width: "39%",
    paddingHorizontal: 52,
    paddingTop: 96,
    paddingBottom: 56,
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
  brandContent: { maxWidth: 400 },
  brandRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  // White tile so the greens of the MAÑAY logo read on the brand panel.
  brandBadge: {
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  brandName: {
    color: "#6EE7B7",
    fontFamily: "LoginInterBold",
    fontSize: 15,
    letterSpacing: 0.6,
    lineHeight: 20,
  },
  brandKind: {
    color: "#C4DBCD",
    fontFamily: "LoginInterSemiBold",
    fontSize: 13,
    letterSpacing: 0.6,
    lineHeight: 18,
  },
  brandTitle: {
    color: color.textOnBrand,
    fontFamily: "LoginInterBold",
    fontSize: 40,
    lineHeight: 46,
    marginTop: 28,
  },
  brandTitleCompact: { fontSize: 26, lineHeight: 32, marginTop: 16 },
  brandTitleAccent: { color: "#34D399" },
  brandDescription: {
    color: "#D1E4D9",
    fontFamily: "LoginInterRegular",
    fontSize: 17,
    lineHeight: 26,
    maxWidth: 380,
    marginTop: 20,
  },
  brandDescriptionCompact: { fontSize: 16, lineHeight: 24, marginTop: 12 },
  roleNotice: {
    backgroundColor: "rgba(27,59,44,0.7)",
    borderColor: "rgba(16,185,129,0.2)",
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: 40,
    maxWidth: 400,
    padding: spacing.md,
  },
  roleNoticeCompact: { marginTop: 20 },
  roleIcon: {
    alignItems: "center",
    backgroundColor: "rgba(16,185,129,0.15)",
    borderRadius: radius.sm,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  roleCopy: { flex: 1, gap: 4 },
  roleTitle: {
    color: color.textOnBrand,
    fontFamily: "LoginInterSemiBold",
    fontSize: 16,
    lineHeight: 20,
  },
  roleDescription: {
    color: "#C4DBCD",
    fontFamily: "LoginInterRegular",
    fontSize: 14,
    lineHeight: 21,
  },
  formPanel: { alignItems: "center", justifyContent: "center" },
  formPanelWide: { flex: 1, paddingHorizontal: 40, paddingVertical: 16 },
  formPanelCompact: { padding: 24 },
  formCard: {
    width: 500,
    backgroundColor: color.surfaceRaised,
    borderColor: "#E2E8F0",
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 40,
    paddingVertical: 28,
    boxShadow: "0px 16px 50px rgba(10,35,24,0.12)",
  },
  formCardCompact: { width: "100%", maxWidth: 500, padding: 24 },
  securePill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: accent.emerald.tint,
    borderColor: accent.emerald.line,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  securePillText: {
    color: accent.emerald.pillInk,
    fontFamily: "LoginInterSemiBold",
    fontSize: 13,
    lineHeight: 18,
  },
  formTitle: {
    color: "#0C2317",
    fontFamily: "LoginInterBold",
    fontSize: 28,
    lineHeight: 34,
  },
  formDescription: {
    color: color.textSecondary,
    fontFamily: "LoginInterRegular",
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6,
  },
  operators: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: 14,
    padding: 12,
  },
  operatorsHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "space-between",
  },
  operatorsTitle: {
    color: color.textSecondary,
    fontFamily: "LoginInterSemiBold",
    fontSize: 12,
    letterSpacing: 0.6,
    lineHeight: 16,
  },
  operatorsHint: {
    color: color.textSecondary,
    fontFamily: "LoginInterRegular",
    fontSize: 12,
    lineHeight: 16,
  },
  operatorsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  operator: {
    alignItems: "center",
    backgroundColor: color.surfaceRaised,
    borderColor: "#E2E8F0",
    borderRadius: radius.sm,
    borderWidth: 1,
    flexBasis: "45%",
    flexDirection: "row",
    flexGrow: 1,
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  operatorSelected: { backgroundColor: accent.emerald.tint, borderColor: color.successAccent },
  operatorAvatar: {
    alignItems: "center",
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  operatorAvatarOwner: { backgroundColor: accent.emerald.pill },
  operatorInitials: {
    color: accent.emerald.pillInk,
    fontFamily: "LoginInterBold",
    fontSize: 13,
  },
  operatorCopy: { flex: 1 },
  operatorName: {
    color: "#1E293B",
    fontFamily: "LoginInterBold",
    fontSize: 15,
    lineHeight: 19,
  },
  operatorRole: {
    color: color.textSecondary,
    fontFamily: "LoginInterRegular",
    fontSize: 13,
    lineHeight: 17,
  },
  fields: { marginTop: 14, gap: 12 },
  keep: { alignItems: "center", flexDirection: "row", gap: 10, minHeight: 44 },
  checkbox: {
    alignItems: "center",
    backgroundColor: color.surfaceRaised,
    borderColor: "#94A3B8",
    borderRadius: 6,
    borderWidth: 2,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  checkboxChecked: { backgroundColor: accent.emerald.ink, borderColor: accent.emerald.ink },
  checkboxMark: { color: color.textOnBrand, fontSize: 15, fontWeight: "800", lineHeight: 18 },
  keepText: {
    color: color.textSecondary,
    fontFamily: "LoginInterSemiBold",
    fontSize: 15,
    lineHeight: 20,
  },
  formActions: { marginTop: 10 },
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
    fontSize: 13,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 14,
  },
  divider: { backgroundColor: "#F1F5F9", height: 1, marginTop: 16 },
  helpMessage: {
    color: color.textSecondary,
    fontFamily: "LoginInterRegular",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 14,
  },
});
