# Verificación del diseño MAÑAY, fase 1: base visual

**Fecha:** 5 de noviembre de 2026 · **Especificación:** [spec 011, T1101–T1105](../../specs/011-manay-app-design/tasks.md) · **Rama:** `feat/011-fase1-base`

## Qué cambió

| Tarea | Cambio |
| --- | --- |
| T1101 | `ui/tokens.ts` con los colores de `DESIGN.md`: verde oliva `#1F3A2F`, lienzo `#F9FAFB`, texto pizarra `#0B1C30` y `#475569`, bordes `#CBD5E1`, estados pagado (`#065F46` sobre `#ECFDF5`) y deuda (`#991B1B` sobre `#FEF2F2`), acentos `#10B981` y `#EF4444`. `report-tokens.ts` con los neutros MAÑAY |
| T1102 | `tests/ui/contrast.test.ts`: relación de contraste WCAG de cada par de tokens con texto. Todos los valores de `DESIGN.md` pasaron sin ajustes |
| T1103 | `purchasePalette` y el tema del menú son variantes del tema MAÑAY (campos blancos con borde fino, radios del sistema); desaparecen los grises del Figma anterior |
| T1104 | `BrandMark` con `assets/brand/manay-logo.png` y nombre accesible «MAÑAY». Icono de Android, icono heredado y pantalla de inicio generados con solo el isotipo (sin texto, como recomienda la guía de iconos de Expo consultada en Context7). La app se llama «MAÑAY» en la tablet; `userInterfaceStyle` pasa a `light` (CL-MD03). El paquete Android `com.mercado.gestion` no cambia para no tratarla como otra app |
| T1105 | Altura y ancho mínimos de 48 px en botones de reportes, campos y selectores; los colores fijos del botón de reportes pasan a los tokens |

## Contraste

| Par | Mínimo | Resultado |
| --- | --- | --- |
| Texto principal sobre lienzo y tarjetas, marca sobre tarjetas, texto sobre la marca, pagado, deuda, valores de reportes | AAA 7:1 | Cumple |
| Texto secundario, marca sobre su tinte, aviso, títulos y detalles de reportes | AA 4,5:1 | Cumple |

## Resultados

| Verificación | Resultado |
| --- | --- |
| `npm run typecheck` | Sin errores |
| `npm run lint` | Sin errores |
| Jest | 617 pruebas en 85 suites (602 anteriores + 14 de contraste + 1 de `BrandMark`) |
| Emulador `Mercado_Tablet_API36` (1280 × 800) | Compilación con JDK 17 en 9 min 28 s; pantalla de inicio con el isotipo, acceso y nueva recepción con los colores MAÑAY |

## Observaciones

- El menú sigue con tarjetas grises: su pantalla dibuja sus propios colores y se rehace en la fase 2 (T1111).
- El acceso conserva la etiqueta «MERCADO» y sus textos; se cambian en la fase 2 (T1110).
- `form-field` conserva dos colores fijos de la apariencia de acceso; se revisan con T1110.

## Pendiente

- Revisión en 2560 × 1600, teléfono de 360 px, texto al 200 % y TalkBack (T1150).
