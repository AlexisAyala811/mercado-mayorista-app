# Contexto User de COMPRA

Archivo MERCADO, nodo 1:346; instancia User 1:352, componente 1:12. Captura del marco obtenida con Figma en `tmp/figma-compra-reference-20261016.png`, solo referencia visual. No se importa como interfaz. Se omiten URLs temporales.

+<instance id="1:352" name="User" x="48" y="20" width="54" height="54">
  <vector id="I1:352;7758:12536" name="Icon" x="9" y="6.75" width="36" height="40.5" />
</instance>

IMPORTANT: After you call this tool, you MUST call get_design_context if trying to implement the design, since this tool only returns metadata. If you do not call get_design_context, the agent will not be able to implement the design.

+const imgIcon = "[ASSET_URL_OMITTED]";

export default function Icon() {
  return (
    <div className="relative size-full" data-node-id="I1:352;7758:12536" data-name="Icon">
      <div className="absolute inset-[-4.94%_-5.56%]">
        <img alt="" className="block max-w-none size-full" src={imgIcon} />
      </div>
    </div>
  );
}

SUPER CRITICAL: The generated React+Tailwind code MUST be converted to match the target project's technology stack and styling system.
1. Analyze the target codebase to identify: technology stack, styling approach, component patterns, and design tokens
2. Convert React syntax to the target framework/library
3. Transform all Tailwind classes to the target styling system while preserving exact visual design
4. Follow the project's existing patterns and conventions
DO NOT install any Tailwind as a dependency unless the user instructs you to do so.


Node ids have been added to the code as data attributes, e.g. `data-node-id="1:2"`.

The generated code contains image and SVG URL constants, e.g. const image = '[ASSET_URL_OMITTED]'. These URLs are temporary download sources and expire after 7 days. Download each asset into the project with curl -L, then replace its URL in the generated code with a reference to the downloaded asset. Never use the temporary URLs as runtime image sources.
