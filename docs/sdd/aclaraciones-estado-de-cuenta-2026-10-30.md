# Aclaraciones del estado de cuenta del comprador

Estado: **resueltas el 30 de octubre de 2026**, excepto el diseño visual (CL-EC07). Especificación: [009 Estado de cuenta del comprador](../../specs/009-buyer-account-statement/spec.md).

Las preguntas se presentaron con una propuesta recomendada y alternativas; el usuario eligió en el selector de la sesión de trabajo.

| ID | Opciones presentadas | Respuesta del usuario |
| --- | --- | --- |
| CL-EC01 | Solo con saldo pendiente · También las pagadas de un periodo | «Solo con saldo pendiente» |
| CL-EC02 | Por venta con sus cuotas · Una línea por venta · Extracto de movimientos | «Por venta con sus cuotas» (vio el ejemplo con abonos, devoluciones, saldo y cuotas vencidas) |
| CL-EC03 | Siempre el momento actual · Permitir una fecha pasada | «Siempre el momento actual» |
| CL-EC04 | Solo compradores ahora · Incluir proveedores ya | «Solo compradores ahora» |
| CL-EC05 | No mostrar el límite · Mostrar límite y disponible | Sin preferencia; se adopta la propuesta «No mostrarlo» |
| CL-EC06 | Imagen hasta 10 ventas · Varias imágenes · Una imagen larga | «Imagen hasta 10 ventas» |

## Consecuencias para el plan

- La consulta toma solo cuentas por cobrar abiertas del comprador, con saldo mayor que cero, en el negocio del usuario.
- No hace falta reconstruir saldos históricos: el corte es la hora del servidor al generar.
- Las devoluciones se presentan separadas de los abonos, a partir de la parte de cada devolución que redujo la cuenta.
- La imagen se genera solo con hasta 10 ventas con saldo; el PDF siempre está disponible.
- El documento no muestra límite de crédito.
- Pendiente: diseño en Figma (CL-EC07) antes de cerrar la convergencia visual.
