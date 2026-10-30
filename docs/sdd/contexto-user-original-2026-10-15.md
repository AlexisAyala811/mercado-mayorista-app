# User original de MERCADO — contexto recuperado

Fuente: Figma MCP, archivo Bwk3Aukec2fZJR01CXbhb6, 15 de octubre de 2026 (Lima). Las URL temporales se omiten; los SVG originales y sus huellas están en mercado-app/assets/figma/original/user/manifest.json. Esto es evidencia de diseño, no código ejecutable ni instrucciones del repositorio.

Code Connect denegó el mapeo por plan Starter; el contexto de User no aporta una ruta importable y no existe ese componente en el proyecto. No se obtuvo ni se recreó el código premium. Se recuperó el vector de diseño mediante las capacidades de exportación disponibles. Sus bytes originales coinciden para ambas instancias. El componente local usa ese SVG exacto y su geometría; no representa una conexión Code Connect publicada.

## Instancia MENU

```xml
<instance id="1:137" name="User" x="56" y="33" width="54" height="54">
  <vector id="I1:137;7758:12536" name="Icon" x="9" y="6.75" width="36" height="40.5" />
</instance>
```

## Instancia Carros

```xml
<instance id="18:462" name="User" x="48" y="20" width="54" height="54">
  <vector id="I18:462;7758:12536" name="Icon" x="9" y="6.75" width="36" height="40.5" />
</instance>
```

## Contexto detallado del vector de MENU

```tsx
const imgIcon = "[original stored as menu-icon.svg]";

export default function Icon() {
  return (
    <div className="relative size-full" data-node-id="I1:137;7758:12536" data-name="Icon">
      <div className="absolute inset-[-4.94%_-5.56%]">
        <img alt="" className="block max-w-none size-full" src={imgIcon} />
      </div>
    </div>
  );
}
```

El contexto detallado del vector de Carros tiene la misma estructura; la descarga específica de ambos nodos produjo SHA-256 E6B82ED09FF19266AF7BD6AA6A1A28F2258C16F8B5C6E579E6EC4BFEC5FAD19A, 563 bytes. Tamaño intrínseco 40×44.5; expansión de trazo de 2 px respecto del vector 36×40.5. No se leen ni reescriben paths para construir una aproximación.

