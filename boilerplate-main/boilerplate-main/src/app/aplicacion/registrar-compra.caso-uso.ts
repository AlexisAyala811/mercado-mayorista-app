// =============================================================
// APLICACION · Caso de uso principal
// =============================================================
// Coordina el flujo completo de la compra:
//   verificar stock -> calcular total -> cobrar -> crear pedido
//   -> guardar -> notificar
//
// Observe que NO contiene reglas de negocio: se las pide a las
// entidades. Y no conoce ninguna tecnologia: habla con contratos.

import { Carrito } from '../dominio/modelos/carrito.modelo';
import { Pedido } from '../dominio/modelos/pedido.modelo';
import { RepositorioProductos } from '../dominio/contratos/repositorio-productos.contrato';
import { RepositorioPedidos } from '../dominio/contratos/repositorio-pedidos.contrato';
import { ProcesadorPagos } from '../dominio/contratos/procesador-pagos.contrato';
import { NotificadorCliente } from '../dominio/contratos/notificador-cliente.contrato';

export interface RegistrarCompraComando {
  clienteId: string;
  carrito: Carrito;
  medioPago: string;
}

export class RegistrarCompraCasoUso {
  constructor(
    private readonly repositorioProductos: RepositorioProductos,
    private readonly repositorioPedidos: RepositorioPedidos,
    private readonly procesadorPagos: ProcesadorPagos,
    private readonly notificadorCliente: NotificadorCliente,
  ) {}

  async ejecutar(comando: RegistrarCompraComando): Promise<Pedido> {
    const { clienteId, carrito, medioPago } = comando;

    // 1. El carrito no puede estar vacio
    if (carrito.estaVacio()) {
      throw new Error('No se puede comprar un carrito vacio');
    }

    // 2. Verificar stock SIN modificarlo.
    // La compra todavía no ha sido aprobada; no debemos descontar stock
    // si el pago termina siendo rechazado. La regla de stock sigue viviendo
    // en Producto, pero la mutación se hace después de aprobar el pago.
    for (const linea of carrito.items) {
      if (!linea.producto.hayStockPara(linea.cantidad)) {
        throw new Error(`Stock insuficiente para ${linea.producto.nombre}`);
      }
    }

    // 3. Calcular el total: la REGLA vive en el carrito y en precios
    const total = carrito.calcularTotal();

    // 4. Cobrar a traves del CONTRATO, sin saber quien lo cumple
    const cobro = await this.procesadorPagos.cobrar(total, medioPago);
    if (!cobro.aprobado) {
      throw new Error(`El pago fue rechazado: ${cobro.motivoRechazo ?? 'sin detalle'}`);
    }

    // 5. El pago fue aprobado: ahora sí se descuenta el stock.
    for (const linea of carrito.items) {
      linea.producto.descontar(linea.cantidad);
    }

    // 6. Crear el pedido: la entidad valida que sea valido
    const pedido = Pedido.crear(clienteId, carrito.items, total, cobro.codigoAutorizacion);

    // 7. Persistir a traves de los CONTRATOS
    for (const linea of carrito.items) {
      await this.repositorioProductos.guardar(linea.producto);
    }
    await this.repositorioPedidos.guardar(pedido);

    // 8. Notificar a traves del CONTRATO
    await this.notificadorCliente.confirmarPedido(clienteId, pedido.id, total);

    return pedido;
  }
}
