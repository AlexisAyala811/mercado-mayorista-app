// =============================================================
// PRUEBAS DEL DOMINIO — SIN ANGULAR
// =============================================================
// Este archivo se compila y se ejecuta con Node y TypeScript
// puro, SIN Angular, SIN navegador y SIN servidor.
//
// Que estas pruebas corran es la demostracion mas contundente
// de que el dominio y los casos de uso no dependen del framework.
// Si alguna capa interna importara Angular, esto NO compilaria.

import assert from 'assert';
import { Producto } from '../dominio/modelos/producto.modelo';
import { Carrito } from '../dominio/modelos/carrito.modelo';
import { Pedido } from '../dominio/modelos/pedido.modelo';
import { precioParaElCliente, totalConIgv } from '../dominio/modelos/precios';
import { RegistrarCompraCasoUso } from '../aplicacion/registrar-compra.caso-uso';
import { AgregarAlCarritoCasoUso } from '../aplicacion/agregar-al-carrito.caso-uso';
import { ConsultarCatalogoCasoUso } from '../aplicacion/consultar-catalogo.caso-uso';
import { RepositorioProductosMemoria } from '../infraestructura/repositorio-productos-memoria';
import { RepositorioPedidosMemoria } from '../infraestructura/repositorio-pedidos-memoria';
import { ProcesadorPagosSimulado } from '../infraestructura/procesador-pagos-simulado';
import { NotificadorConsola } from '../infraestructura/notificador-consola';

let pasadas = 0;

async function prueba(nombre: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    pasadas++;
    console.log(`   OK    ${nombre}`);
  } catch (error) {
    console.log(`   FALLO ${nombre}: ${(error as Error).message}`);
    process.exitCode = 1;
  }
}

function productoDemo(stock = 10): Producto {
  return new Producto('PR001', 'Alimento 15kg', 'alimento', 'perro', 100, stock, 'S01');
}

async function main(): Promise<void> {
  const inicio = Date.now();
  console.log('\n=== PRUEBAS DEL DOMINIO (sin Angular, sin navegador) ===\n');

  console.log('-- Entidad Producto');
  await prueba('un producto con precio cero es invalido', () => {
    assert.throws(
      () => new Producto('P1', 'Collar', 'accesorio', 'perro', 0, 5, 'S01'),
      /mayor que cero/,
    );
  });

  await prueba('no se puede descontar mas stock del disponible', () => {
    const producto = productoDemo(3);
    assert.throws(() => producto.descontar(5), /Stock insuficiente/);
  });

  await prueba('descontar reduce el stock disponible', () => {
    const producto = productoDemo(10);
    producto.descontar(4);
    assert.strictEqual(producto.stockDisponible, 6);
  });

  console.log('\n-- Reglas de precio');
  await prueba('el precio al cliente incluye la comision del marketplace', () => {
    assert.strictEqual(precioParaElCliente(100), 110);
  });

  await prueba('el total incluye el IGV', () => {
    assert.strictEqual(totalConIgv(100), 118);
  });

  console.log('\n-- Entidad Carrito');
  await prueba('el carrito vacio no tiene items', () => {
    assert.strictEqual(Carrito.vacio().estaVacio(), true);
  });

  await prueba('agregar dos veces el mismo producto acumula la cantidad', () => {
    const producto = productoDemo(10);
    const carrito = Carrito.vacio().agregar(producto, 2).agregar(producto, 3);
    assert.strictEqual(carrito.cantidadDeItems, 5);
    assert.strictEqual(carrito.items.length, 1);
  });

  await prueba('el carrito rechaza mas unidades de las que hay en stock', () => {
    const producto = productoDemo(3);
    assert.throws(() => Carrito.vacio().agregar(producto, 5), /Stock insuficiente/);
  });

  await prueba('el total del carrito aplica comision e IGV', () => {
    const carrito = Carrito.vacio().agregar(productoDemo(10), 2);
    assert.strictEqual(carrito.calcularSubtotal(), 220);
    assert.strictEqual(carrito.calcularTotal(), 259.6);
  });

  console.log('\n-- Entidad Pedido');
  await prueba('un pedido no puede crearse vacio', () => {
    assert.throws(() => Pedido.crear('C01', [], 100, 'AUT'), /no puede estar vacio/);
  });

  await prueba('un pedido cancelado no puede cancelarse otra vez', () => {
    const carrito = Carrito.vacio().agregar(productoDemo(), 1);
    const pedido = Pedido.crear('C01', carrito.items, 118, 'AUT');
    pedido.cancelar();
    assert.throws(() => pedido.cancelar(), /ya no puede cancelarse/);
  });

  console.log('\n-- Casos de uso');
  await prueba('el catalogo solo muestra productos disponibles', async () => {
    const repositorio = new RepositorioProductosMemoria([
      productoDemo(5),
      new Producto('PR002', 'Rascador', 'accesorio', 'gato', 200, 0, 'S02'),
    ]);
    const productos = await new ConsultarCatalogoCasoUso(repositorio).ejecutar();
    assert.strictEqual(productos.length, 1);
    assert.strictEqual(productos[0].id, 'PR001');
  });

  await prueba('agregar al carrito usa el producto real del repositorio', async () => {
    const repositorio = new RepositorioProductosMemoria([productoDemo(10)]);
    const carrito = await new AgregarAlCarritoCasoUso(repositorio).ejecutar({
      carritoActual: Carrito.vacio(),
      productoId: 'PR001',
      cantidad: 2,
    });
    assert.strictEqual(carrito.cantidadDeItems, 2);
  });

  await prueba('registrar una compra cobra, descuenta stock y guarda el pedido', async () => {
    const productos = new RepositorioProductosMemoria([productoDemo(10)]);
    const pedidos = new RepositorioPedidosMemoria();
    const casoUso = new RegistrarCompraCasoUso(
      productos,
      pedidos,
      new ProcesadorPagosSimulado(),
      new NotificadorConsola(),
    );

    const producto = (await productos.buscarPorId('PR001'))!;
    const carrito = Carrito.vacio().agregar(producto, 2);

    const pedido = await casoUso.ejecutar({
      clienteId: 'C01',
      carrito,
      medioPago: '4111111111111111',
    });

    assert.strictEqual(pedido.total, 259.6);
    assert.strictEqual(pedido.estadoActual, 'pagado');
    assert.strictEqual((await productos.buscarPorId('PR001'))!.stockDisponible, 8);
    assert.strictEqual((await pedidos.listarPorCliente('C01')).length, 1);
  });

  await prueba('si el pago es rechazado no se registra el pedido', async () => {
    const productos = new RepositorioProductosMemoria([productoDemo(10)]);
    const pedidos = new RepositorioPedidosMemoria();
    const casoUso = new RegistrarCompraCasoUso(
      productos,
      pedidos,
      new ProcesadorPagosSimulado(false),
      new NotificadorConsola(),
    );

    const producto = (await productos.buscarPorId('PR001'))!;
    const carrito = Carrito.vacio().agregar(producto, 1);

    await assert.rejects(
      casoUso.ejecutar({ clienteId: 'C01', carrito, medioPago: '4111111111111111' }),
      /rechazado/,
    );
    assert.strictEqual((await pedidos.listarPorCliente('C01')).length, 0);
    // Importante: un pago rechazado NO debe consumir stock.
    assert.strictEqual((await productos.buscarPorId('PR001'))!.stockDisponible, 10);
  });

  await prueba('no se puede comprar un carrito vacio', async () => {
    const casoUso = new RegistrarCompraCasoUso(
      new RepositorioProductosMemoria([]),
      new RepositorioPedidosMemoria(),
      new ProcesadorPagosSimulado(),
      new NotificadorConsola(),
    );
    await assert.rejects(
      casoUso.ejecutar({ clienteId: 'C01', carrito: Carrito.vacio(), medioPago: '4111111111111111' }),
      /carrito vacio/,
    );
  });

  console.log(`\n   ${pasadas} pruebas en ${Date.now() - inicio} ms, sin levantar Angular.\n`);
}

main();
