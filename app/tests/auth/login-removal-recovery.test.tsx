import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import LoginRoute from "@/app/index";
import { LoginScreen } from "@/features/auth/screens/login-screen";

const mockRetry = jest.fn();
const mockLogin = jest.fn();
let mockClearing = false;
jest.mock("expo-font", () => ({ useFonts: () => [true, null] }));
jest.mock("expo-image", () => ({ Image: "test-image" }));
jest.mock("@/features/auth/session/session-provider", () => ({
  useSession: () => ({
    isSubmitting: false,
    login: mockLogin,
    loginError: "No se pudo retirar la sesión",
    hasPendingSessionRemoval: true,
    isClearingLocalSession: mockClearing,
    retrySessionRemoval: mockRetry,
  }),
}));
jest.mock("@/ui/components", () => {
  const react = jest.requireActual("react");
  const control = (props: object) => react.createElement("test-control", props);
  const section = (props: {
    children?: React.ReactNode;
    footer?: React.ReactNode;
  }) =>
    react.createElement("test-section", props, props.children, props.footer);
  return {
    AppScreen: control,
    AppButton: control,
    BrandMark: control,
    FormField: control,
    FormSection: section,
  };
});

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  mockClearing = false;
});

it("connects the visible recovery action to session removal and blocks button and keyboard login", async () => {
  let root!: ReactTestRenderer;
  await act(async () => {
    root = create(<LoginRoute />);
  });
  await act(async () => {
    root.root
      .find((node) => node.props.label === "Usuario de terminal" && node.props.onChangeText)
      .props.onChangeText("Test");
    root.root
      .find(
        (node) => node.props.label === "Contraseña de acceso" && node.props.onChangeText,
      )
      .props.onChangeText("test-only");
  });
  const login = root.root.find(
    (node) => node.props.label === "Iniciar sesión" && node.props.onPress,
  );
  expect(login.props.disabled).toBe(true);
  await act(async () => {
    login.props.onPress();
    root.root
      .find(
        (node) =>
          node.props.label === "Contraseña de acceso" && node.props.onSubmitEditing,
      )
      .props.onSubmitEditing();
  });
  expect(mockLogin).not.toHaveBeenCalled();
  await act(async () => {
    root.root
      .find(
        (node) =>
          node.props.label === "Reintentar cierre" && node.props.onPress,
      )
      .props.onPress();
  });
  expect(mockRetry).toHaveBeenCalledTimes(1);
  mockClearing = true;
  await act(async () => {
    root.update(<LoginRoute />);
  });
  expect(
    root.root.find(
      (node) => node.props.label === "Retirando sesión…" && node.props.onPress,
    ).props.disabled,
  ).toBe(true);
  expect(root.root.findByType(LoginScreen).props.hasPendingSessionRemoval).toBe(
    true,
  );
  await act(async () => {
    root.unmount();
  });
});
