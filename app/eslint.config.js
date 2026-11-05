// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: ["react", "react-native"],
        patterns: [
          {
            group: ["expo", "expo-*", "@/app/**", "@/features/**", "@/ui/**", "@/data/**", "@/services/**"],
            message: "El dominio debe permanecer independiente de la interfaz, Expo y las implementaciones externas."
          },
          {
            regex: "^(?:\\.\\.?/)+(?:app|features|ui|data|services)(?:/|$)",
            message: "El dominio no puede depender de capas externas mediante rutas relativas."
          }
        ]
      }]
    }
  },
  {
    files: ["src/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: ["@/app/**", "@/features/**", "@/domain/**", "@/data/**", "@/services/**"],
            message: "Los componentes visuales compartidos no deben conocer rutas, negocio ni infraestructura."
          },
          {
            regex: "^(?:\\.\\.?/)+(?:app|features|domain|data|services)(?:/|$)",
            message: "La capa UI no puede saltar sus límites mediante rutas relativas."
          }
        ]
      }]
    }
  },
  {
    files: ["src/data/**/*.{ts,tsx}", "src/services/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: ["@/app/**", "@/features/**", "@/ui/**"],
            message: "La infraestructura no debe depender de navegación, casos de uso concretos ni componentes visuales."
          },
          {
            regex: "^(?:\\.\\.?/)+(?:app|features|ui)(?:/|$)",
            message: "La infraestructura no puede saltar sus límites mediante rutas relativas."
          }
        ]
      }]
    }
  },
  {
    files: ["src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/domain/**", "@/data/**", "@/services/**"],
          message: "Las rutas deben delegar el comportamiento a pantallas y casos de uso de features."
        }]
      }]
    }
  }
]);
