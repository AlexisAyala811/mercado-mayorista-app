# Mercado

Aplicación para tablet Android de gestión comercial de papa. El proyecto se desarrolla con Spec-Driven Development y usa Expo, React Native, TypeScript estricto y Expo Router.

## Arquitectura

- `src/app`: rutas y layouts de Expo Router.
- `src/features`: casos de uso y pantallas por módulo.
- `src/domain`: reglas de negocio y cálculos verificables.
- `src/data`: repositorios, persistencia y sincronización.
- `src/ui`: tokens y componentes de interfaz.
- `src/services`: adaptadores de plataforma e integraciones.
- `tests`: pruebas de dominio, interfaz, contrato y recorridos críticos.

## Verificación

```powershell
npm run check
```

El comando ejecuta TypeScript estricto, ESLint y Jest. Las pruebas de dominio se agregan cuando las reglas correspondientes quedan aprobadas en SDD.

Para verificar el código, exportar para la API QA local y comprobar los recursos PDF en una sola ejecución desde esta carpeta:

```powershell
pwsh -File scripts/verify-frontend-qa.ps1
```

El auxiliar se detiene ante el primer fallo, restaura la variable de API anterior y no inicia servicios ni modifica datos comerciales. Solo imprime el resultado global si los tres pasos terminan correctamente. Esta ejecución no acredita los recorridos reales, Android, accesibilidad ni semejanza con Figma. Si el entorno requiere revisión de permisos, ejecutar mediante esa vía autorizada; el auxiliar no elimina esa revisión.

## Configuración local

Copiar `.env.example` a `.env.local` y configurar `EXPO_PUBLIC_API_URL` con la dirección alcanzable del backend, incluyendo `/api/v1`. En un dispositivo Android físico debe utilizarse la IP de la computadora dentro de la red local; `localhost` apunta al propio dispositivo.

El acceso crea una sesión contra la API, conserva únicamente el token opaco y la identidad mínima en SecureStore, revalida la sesión al iniciar y protege el menú principal mediante Expo Router.

Los módulos aprobados incluyen compras, ventas, cuentas, caja, logística, catálogos, reportes, comprobantes, administración, auditoría, sincronización y analítica 007. Desde el 7 de octubre el sistema conserva cantidades/pesos por operación sin calcular existencias, descontar stock ni bloquear ventas por disponibilidad. La app envía UUID de operación para los reintentos, recarga las entidades ante conflictos y muestra los importes calculados por la API. La cola offline cifrada conserva las operaciones pendientes y expone confirmación, rechazo, revisión y reintento. La recepción offline completa ya se verificó en web contra una API y PostgreSQL de prueba.

## Exportación web

Expo incorpora las variables públicas al construir el bundle; cambiarlas después de exportar no cambia el archivo servido. `npm run export:web` exige la dirección explícita del backend en el entorno del proceso y rechaza configuración ausente o URL con credenciales/parámetros antes de exportar. El ejemplo siguiente corresponde exclusivamente a QA local:

```powershell
$env:EXPO_PUBLIC_API_URL='http://localhost:3000/api/v1'
npm run export:web
Remove-Item Env:EXPO_PUBLIC_API_URL
node scripts/verify-pdfjs-assets.mjs
```

Para otro entorno, usar su dirección alcanzable y volver a exportar. No incluir secretos en variables EXPO_PUBLIC. Servir los archivos de `dist` con resolución de las rutas estáticas y MIME adecuados para JavaScript, worker y wasm; una construcción correcta requiere además probar login, consultas y PDF desde el servidor elegido.

Cuando se exporte para QA a una carpeta alternativa dentro del workspace, `node scripts/verify-pdfjs-assets.mjs --export-root <carpeta>` compara sus recursos PDF y los de public con la dependencia instalada. La ruta relativa se resuelve desde mercado-app; sin argumento verifica dist.

Para QA local, `python scripts/serve-web-export.py` sirve exclusivamente en 127.0.0.1:8087, resuelve las rutas HTML exportadas y fija MIME de `.mjs`/`.wasm`. El servidor genérico de Python en Windows puede responder `text/plain` para el worker `.mjs` e impedir que el navegador lo cargue. Este auxiliar no es un servidor productivo.

## Cliente Android de desarrollo

La aplicación usa módulos nativos para almacenamiento seguro y visualización de PDF. Las pruebas de tablet requieren un cliente de desarrollo, generado desde `app.json`, que identifica el paquete como `com.mercado.gestion`. Los directorios nativos se generan y no constituyen la fuente de configuración.

Configurar `JAVA_HOME` con un JDK compatible y `ANDROID_HOME` con el SDK instalado. La ejecución local del 5 de octubre encontró un error de Prefab/CMake con Java 25; Java 21 compiló el APK de desarrollo x86_64, que se instaló y abrió en el emulador. No asumir que el JBR de una versión nueva de Android Studio funciona con todas las dependencias del proyecto.

En el emulador estándar, configurar `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api/v1` si la API de desarrollo escucha en el equipo anfitrión. La URL es configuración pública y no debe contener credenciales. Para un dispositivo físico, usar una dirección de red alcanzable.

```powershell
npm run android
```

El comando genera el proyecto nativo cuando es necesario, compila, instala y conecta el cliente con Metro. La disponibilidad de un bundle exportado no prueba instalación ni ejecución Android. Consultar `../docs/sdd/frontend-completion-audit.md` y `../docs/sdd/frontend-web-verification.md` para distinguir código implementado de recorridos verificados.

No se agregan funciones comerciales sin una especificación, plan y tareas listas para implementación.

La revisión vigente de dependencias se registra en `docs/security/dependency-audit.md`.

Los límites y la dirección permitida entre capas se documentan en `docs/architecture/dependency-boundaries.md`.
