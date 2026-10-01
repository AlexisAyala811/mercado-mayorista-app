# Marketplace de productos para mascotas — Arquitectura Limpia con Angular

Curso: **IS-488 Arquitectura de Software** · UNSCH · Semestre 2026-II
Docente: Ing. Lizbeth Jaico Quispe

Proyecto generado con [Angular CLI](https://github.com/angular/angular-cli) v18.
Todo el código —clases, variables, funciones y comentarios— está en español.

---

## Puesta en marcha

```bash
npm install
npm start          # aplicación en http://localhost:4200
npm run pruebas    # pruebas del dominio, sin Angular
npm run build      # compilación de producción
```

No necesita base de datos, credenciales ni conexión a internet: el proyecto
arranca con adaptadores en memoria.

---

## Las cuatro capas

```
src/app/
│
├── dominio/                    ← EL CENTRO. No importa Angular ni nada.
│   ├── modelos/
│   │   ├── producto.modelo.ts      entidad y regla de stock
│   │   ├── carrito.modelo.ts       entidad inmutable y sus reglas
│   │   ├── pedido.modelo.ts        entidad y reglas de estado
│   │   └── precios.ts              comisión e IGV, en UN solo lugar
│   └── contratos/              ← los contratos viven AQUÍ, no afuera
│       ├── repositorio-productos.contrato.ts
│       ├── repositorio-pedidos.contrato.ts
│       ├── procesador-pagos.contrato.ts
│       └── notificador-cliente.contrato.ts
│
├── aplicacion/                 ← CASOS DE USO. Solo importan dominio.
│   ├── consultar-catalogo.caso-uso.ts
│   ├── agregar-al-carrito.caso-uso.ts
│   └── registrar-compra.caso-uso.ts
│
├── infraestructura/            ← ADAPTADORES. Intercambiables.
│   ├── tokens.ts                   InjectionToken de cada contrato
│   ├── repositorio-productos-memoria.ts
│   ├── repositorio-productos-http.ts       misma interfaz, API REST
│   ├── repositorio-pedidos-memoria.ts
│   ├── procesador-pagos-simulado.ts
│   ├── procesador-pagos-niubiz.ts          otro proveedor, mismo contrato
│   ├── notificador-consola.ts
│   └── notificador-whatsapp.ts             otro canal, mismo contrato
│
├── presentacion/               ← COMPONENTES ANGULAR
│   ├── estado-carrito.servicio.ts
│   ├── catalogo/catalogo.component.ts
│   └── carrito/carrito.component.ts
│
├── app.config.ts               ← RAÍZ DE COMPOSICIÓN
└── app.component.ts
```

---

## Los cuatro momentos para explicar en clase

### 1. El dominio no conoce Angular

Abra `dominio/modelos/producto.modelo.ts` y muestre que **no tiene ni una
sola importación**. Ni `@angular/core`, ni `HttpClient`, ni nada. Contiene
reglas que serían verdad aunque el marketplace funcionara con cuaderno.

### 2. El contrato vive en el dominio

Abra `dominio/contratos/repositorio-productos.contrato.ts` y haga notar
**la ruta del archivo**. El contrato está dentro del dominio, no en la
infraestructura. Quien necesita algo es quien define cómo lo necesita.

Este es el punto que más cuesta entender y conviene detenerse aquí.

### 3. El token es de Angular, el contrato no

Abra `infraestructura/tokens.ts`. Aquí sí aparece `@angular/core`, y por
eso este archivo está **fuera** del dominio.

¿Por qué hace falta un token? Porque las interfaces de TypeScript
desaparecen al compilar, así que Angular necesita algo concreto para
identificar qué inyectar. El contrato sigue siendo puro; el mecanismo de
inyección queda afuera.

### 4. La raíz de composición

Abra `app.config.ts`. Es el **único** archivo de toda la aplicación donde
aparecen los nombres de las implementaciones concretas.

Cada proveedor tiene comentada su alternativa. Para cambiar de memoria a
una API REST, o del pago simulado a Niubiz, se descomentan dos líneas.
Ni el dominio ni los casos de uso se enteran. Ese es el momento en que
los estudiantes ven para qué sirvió todo lo anterior.

---

## La demostración que cierra la clase

```bash
npm run pruebas
```

Las reglas de negocio se verifican en milisegundos, sin Angular, sin
navegador y sin servidor.

Note el archivo `tsconfig.pruebas.json`: compila **solamente** las carpetas
`dominio/`, `aplicacion/` y los adaptadores en memoria. Si alguna de esas
capas importara Angular, la compilación fallaría. Que las pruebas corran es
la prueba mecánica de que la regla de dependencia se está cumpliendo.

---

## Detalle: la comisión está escrita una sola vez

En `dominio/modelos/precios.ts` viven `COMISION_MARKETPLACE` e `IGV`.

El componente del carrito **no recalcula** el total: se lo pide a la entidad
`Carrito`. Por eso la regla no puede contradecirse entre la pantalla y el
cálculo del pedido, que es el error más común en los marketplaces reales.

---

## Flujo completo de "Registrar una compra"

```
Componente Carrito
   └─► RegistrarCompraCasoUso.ejecutar()
          ├─► carrito.estaVacio() ................ regla del DOMINIO
          ├─► producto.descontar() ............... regla del DOMINIO
          ├─► carrito.calcularTotal() ............ regla del DOMINIO
          ├─► procesadorPagos.cobrar() ........... CONTRATO
          ├─► Pedido.crear() ..................... regla del DOMINIO
          ├─► repositorioPedidos.guardar() ....... CONTRATO
          └─► notificadorCliente.confirmar() ..... CONTRATO
```

El caso de uso decide **el orden de los pasos**.
Las entidades deciden **qué es válido**.
Los contratos ocultan **con qué tecnología** se hace cada cosa.

---
