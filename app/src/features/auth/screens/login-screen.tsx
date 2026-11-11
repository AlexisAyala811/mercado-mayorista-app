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
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
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
                <Text style={styles.brandKind}>CENTRO DE ACOPIO</Text>
              </View>
            </View>
            <Text
              accessibilityLabel="MAÑAY. Gestión comercial de papa y tubérculos"
              accessibilityRole="header"
              style={[styles.brandTitle, !isWide && styles.brandTitleCompact]}
            >
              Gestión comercial{"\n"}
              <Text style={styles.brandTitleAccent}>de papa y tubérculos</Text>
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
            {/* The two tiles of the mockup, with what the app really does
                (no scale is connected, CL-ST12). */}
            <View style={styles.facts}>
              <BrandFact icon="scale" label="PESAJE POR SACO" value="Kilos enteros y tara" />
              <BrandFact icon="inventory_2" label="VARIEDADES" value="Por lote y calidad" />
            </View>
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
            <View style={styles.cardTop}>
              <View style={styles.securePill}>
                <SymbolView fallback={null} name={{ android: "lock", ios: "lock", web: "lock" }} size={14} tintColor={accent.emerald.ink} />
                <Text style={styles.securePillText}>Acceso seguro</Text>
              </View>
              <Text style={styles.stationId}>TABLET MAÑAY</Text>
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
                    SELECCIÓN RÁPIDA DE OPERADOR:
                  </Text>
                  <Text style={styles.operatorsHint}>Tocar para autollenar</Text>
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
                label="Usuario de terminal"
                leadingIcon="badge"
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
                placeholder="Tu usuario asignado"
                returnKeyType="next"
                textContentType="username"
                value={username}
              />
              <FormField
                appearance="login"
                autoCapitalize="none"
                autoComplete="current-password"
                error={errors.password}
                label="Contraseña de acceso"
                labelAction={
                  <Pressable accessibilityRole="button" accessibilityState={{ expanded: forgotOpen }} hitSlop={8} onPress={() => setForgotOpen((current) => !current)}>
                    <Text style={styles.forgot}>¿Olvidó su clave?</Text>
                  </Pressable>
                }
                leadingIcon="key"
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
                placeholder="Tu contraseña"
                returnKeyType="done"
                secureTextEntry={!showPassword}
                trailing={
                  <Pressable accessibilityLabel={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} accessibilityRole="button" onPress={() => setShowPassword((current) => !current)} style={styles.eye}>
                    <SymbolView fallback={null} name={{ android: showPassword ? "visibility" : "visibility_off", ios: "eye", web: "visibility" }} size={22} tintColor="#64748B" />
                  </Pressable>
                }
                textContentType="password"
                value={password}
              />
              {forgotOpen ? (
                <Text accessibilityLiveRegion="polite" style={styles.forgotHelp}>
                  Pide al Mayorista que restablezca tu clave en Usuarios y reemplazos.
                </Text>
              ) : null}
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
                trailingVisual={<SymbolView fallback={null} name={{ android: "login", ios: "arrow.right.square", web: "login" }} size={20} tintColor="#FFFFFF" />}
              />
              <View style={styles.securityRow}>
                <SymbolView fallback={null} name={{ android: "verified_user", ios: "checkmark.shield", web: "verified_user" }} size={15} tintColor={accent.emerald.ink} />
                <Text style={styles.securityMessage}>
                  Conexión segura • Sincronización con el servidor
                </Text>
              </View>
              <View style={styles.divider} />
              <Text style={styles.helpMessage}>
                ¿No puedes ingresar? Comunícate con el Mayorista.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </AppScreen>
  );
}

function BrandFact({ icon, label, value }: { icon: "scale" | "inventory_2"; label: string; value: string }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={styles.fact}>
      <View style={styles.factIcon}>
        <SymbolView fallback={null} name={{ android: icon, ios: "square", web: icon }} size={18} tintColor="#6EE7B7" />
      </View>
      <View style={styles.factCopy}>
        <Text numberOfLines={1} style={styles.factLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.factValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1 },
  facts: { flexDirection: "row", gap: 10, marginTop: 24 },
  fact: { alignItems: "center", backgroundColor: "rgba(27,59,44,0.7)", borderColor: "rgba(16,185,129,0.2)", borderRadius: 12, borderWidth: 1, flex: 1, flexDirection: "row", gap: 10, padding: 10 },
  factIcon: { alignItems: "center", backgroundColor: "rgba(16,185,129,0.15)", borderRadius: 8, height: 32, justifyContent: "center", width: 32 },
  factCopy: { flex: 1, minWidth: 0 },
  factLabel: { color: "#6EE7B7", fontFamily: "LoginInterBold", fontSize: 10, letterSpacing: 0.5, lineHeight: 14 },
  factValue: { color: "#FFFFFF", fontFamily: "LoginInterSemiBold", fontSize: 13, lineHeight: 18 },
  cardTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  stationId: { backgroundColor: "#F1F5F9", borderRadius: 6, color: "#64748B", fontFamily: "monospace", fontSize: 11, paddingHorizontal: 8, paddingVertical: 3 },
  forgot: { color: accent.emerald.ink, fontFamily: "LoginInterSemiBold", fontSize: 13 },
  forgotHelp: { color: color.textSecondary, fontFamily: "LoginInterRegular", fontSize: 13, lineHeight: 18 },
  eye: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  securityRow: { alignItems: "center", flexDirection: "row", gap: 6, justifyContent: "center", marginTop: 10 },
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
    fontSize: 34,
    lineHeight: 40,
    marginTop: 24,
  },
  brandTitleCompact: { fontSize: 26, lineHeight: 32, marginTop: 16 },
  brandTitleAccent: { color: "#34D399" },
  brandDescription: {
    color: "#D1E4D9",
    fontFamily: "LoginInterRegular",
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 380,
    marginTop: 16,
  },
  brandDescriptionCompact: { fontSize: 16, lineHeight: 24, marginTop: 12 },
  roleNotice: {
    backgroundColor: "rgba(27,59,44,0.7)",
    borderColor: "rgba(16,185,129,0.2)",
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: 24,
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
    width: 440,
    backgroundColor: color.surfaceRaised,
    borderColor: "#E2E8F0",
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 32,
    paddingVertical: 24,
    boxShadow: "0px 16px 50px rgba(10,35,24,0.12)",
  },
  formCardCompact: { width: "100%", maxWidth: 440, padding: 24 },
  securePill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: accent.emerald.tint,
    borderColor: accent.emerald.line,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
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
    fontSize: 26,
    lineHeight: 32,
  },
  formDescription: {
    color: color.textSecondary,
    fontFamily: "LoginInterRegular",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  operators: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: 12,
    padding: 10,
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
  operatorsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  operator: {
    alignItems: "center",
    backgroundColor: color.surfaceRaised,
    borderColor: "#E2E8F0",
    borderRadius: radius.sm,
    borderWidth: 1,
    flexBasis: "45%",
    flexDirection: "row",
    flexGrow: 1,
    maxWidth: "49%",
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
  fields: { marginTop: 12, gap: 10 },
  keep: { alignItems: "center", flexDirection: "row", gap: 10, minHeight: 40 },
  checkbox: {
    alignItems: "center",
    backgroundColor: color.surfaceRaised,
    borderColor: "#94A3B8",
    borderRadius: 4,
    borderWidth: 2,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  checkboxChecked: { backgroundColor: accent.emerald.ink, borderColor: accent.emerald.ink },
  checkboxMark: { color: color.textOnBrand, fontSize: 13, fontWeight: "800", lineHeight: 16 },
  keepText: {
    color: color.textSecondary,
    fontFamily: "LoginInterSemiBold",
    fontSize: 15,
    lineHeight: 20,
  },
  formActions: { marginTop: 6 },
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
  },
  divider: { backgroundColor: "#F1F5F9", height: 1, marginTop: 12 },
  helpMessage: {
    color: color.textSecondary,
    fontFamily: "LoginInterRegular",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 10,
  },
});
