# Nivel 1 · Diagrama de contexto del sistema

> **Proyecto:** Gestión comercial mayorista de papa · **Modelo:** C4 · **Nivel:** 1 · **Versión:** 2.0 · **Actualización:** 29 de octubre de 2026

## Objetivo

Mostrar Mercado como un único sistema: quién lo usa, qué necesidad atiende y con qué sistemas externos se relaciona. No incluye aplicaciones internas, módulos ni tecnologías; eso corresponde a los niveles 2 y 3.

## Diagrama

![Contexto del sistema Mercado](../../img/nivel1-contexto.png)

Fuente editable: [nivel1-contexto.svg](../../img/fuentes-svg/nivel1-contexto.svg).

## Personas

| Persona | Necesidad | Interacción con Mercado |
| --- | --- | --- |
| Mayorista | Gestionar y supervisar el negocio | Registra operaciones, consulta cuentas, reportes y auditoría, registra pagos, cobros, flete y estiba, genera documentos y los envía, y controla los reemplazos |
| Encargado | Mantener la operación durante la ausencia del Mayorista | Con credenciales propias y un reemplazo vigente, registra pesajes, compras y ventas |

## Sistemas

| Sistema | Tipo | Responsabilidad |
| --- | --- | --- |
| Mercado | En alcance | Registrar recepción, pesos por saco, compras, ventas, despachos, pagos, deudas, flete y estiba; generar comprobantes y estados de cuenta |
| WhatsApp / correo | Externo | Hacer llegar al comprador o proveedor el documento que el Mayorista decide enviar |

El envío es manual: Mercado abre WhatsApp o el correo en el dispositivo con el archivo adjunto y el Mayorista confirma el contacto (ADR-03). No hay integración servidor a servidor con un proveedor de mensajería.

## Relaciones

| Origen | Destino | Relación |
| --- | --- | --- |
| Mayorista | Mercado | Registra, consulta y supervisa las operaciones y saldos de su negocio |
| Encargado | Mercado | Registra pesajes, compras y ventas durante un reemplazo vigente |
| Mercado | WhatsApp / correo | Entrega comprobantes, estados de cuenta, imágenes o documentos cuando el Mayorista los envía |
| WhatsApp / correo | Proveedor o comprador | Recibe el documento |

## Participantes comerciales

Proveedores, compradores, transportistas y grupos de estibadores se registran como datos de las operaciones. Solo proveedores y compradores reciben documentos, a través de WhatsApp o correo; ninguno tiene cuenta de acceso.

## Límites del contexto

- Sin control de existencias: las cantidades y pesos son el detalle de cada operación.
- La captura funciona temporalmente sin conexión; un registro pendiente no es una operación confirmada.
- La predicción de precios solo se habilita al cumplir CL-08.
- El MVP no incluye pasarela de pagos, ERP, courier, GPS, balanzas integradas ni facturación electrónica.

Siguiente vista: [Nivel 2 · Contenedores](Nivel2-DiagramadeContenedores.md).
