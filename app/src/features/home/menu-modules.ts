import type { Href } from 'expo-router';
import type { AndroidSymbol } from 'expo-symbols';

import { canAccessModule } from '@/features/auth/authorization/permissions';
import type { UserRole } from '@/domain/auth/session';
import type { AccentName } from '@/ui/tokens';
import type { HomeModule } from './components/module-card';

// MAÑAY menu (spec 011, RQ-ST11, CL-ST11 and CL-ST15): the Compra / Venta
// switch of the Stitch mockups with six cards per side, and the options
// Stitch does not draw in a "Más opciones" row. Each entry is filtered with
// the same rule the routes use, so the Encargado sees exactly what the server
// allows.
export type MenuSide = 'purchase' | 'sale';
export type MenuSection = MenuSide | 'more';
export type MenuModule = HomeModule & { section: MenuSection; route: Href };

export const menuSides: { id: MenuSide; title: string; icon: AndroidSymbol }[] = [
  { id: 'purchase', title: 'Compra', icon: 'shopping_bag' },
  { id: 'sale', title: 'Venta', icon: 'point_of_sale' },
];

const entry = (
  section: MenuSection,
  id: MenuModule['id'],
  accent: AccentName,
  icon: AndroidSymbol,
  route: Href,
  shortLabel: string,
  title: string,
  description: string,
  badge: string,
  foot: string,
): MenuModule => ({ accent, badge, description, foot, icon, id, route, section, shortLabel, title });

export const menuModules: MenuModule[] = [
  entry('purchase', 'purchases', 'amber', 'menu_book', '/purchase-flow', 'AN', 'Anote', 'Pesaje por saco y liquidación de la compra', 'Nuevo', 'Registrar compra'),
  entry('purchase', 'purchase-history', 'sky', 'fact_check', '/purchase-history', 'VC', 'Ver compras', 'Compras pagadas y con deuda', 'Compras', 'Historial de compras'),
  entry('purchase', 'logistics', 'indigo', 'local_shipping', '/logistics', 'CA', 'Carros', 'Transportistas y vehículos', 'Flota', 'Placas y conductores'),
  entry('purchase', 'debts', 'rose', 'payments', '/debts', 'DE', 'Deudas', 'Adelantos y saldos a proveedores', 'Proveedores', 'Saldos por pagar'),
  entry('purchase', 'analytics', 'teal', 'monitoring', '/analytics', 'AL', 'Analítica', 'Pizarra de precios pactados', 'Variedades', 'Últimas 8 semanas'),
  entry('purchase', 'reports', 'purple', 'description', '/reports', 'RE', 'Reportes', 'Compras del periodo y exportación', 'Mes actual', 'PDF y Excel'),
  entry('sale', 'sales', 'amber', 'menu_book', '/sale-flow', 'VE', 'Anote de venta', 'Venta y despacho a compradores', 'Despacho', 'Registrar venta'),
  entry('sale', 'sales-history', 'sky', 'receipt_long', '/sales-history', 'VV', 'Ver ventas', 'Ventas cobradas y con deuda', 'Ventas', 'Historial de ventas'),
  entry('sale', 'logistics', 'indigo', 'local_shipping', '/logistics', 'CA', 'Carros', 'Transportistas y vehículos', 'Flota', 'Placas y conductores'),
  entry('sale', 'collections', 'rose', 'point_of_sale', '/collections', 'CO', 'Cobranzas', 'Créditos y saldos por cobrar', 'Compradores', 'Saldos por cobrar'),
  entry('sale', 'analytics', 'teal', 'query_stats', '/analytics', 'AL', 'Analítica', 'Pizarra de precios pactados', 'Variedades', 'Últimas 8 semanas'),
  entry('sale', 'reports', 'purple', 'description', { pathname: '/reports', params: { lado: 'venta' } }, 'RE', 'Reportes', 'Ventas del periodo y exportación', 'Mes actual', 'PDF y Excel'),
  entry('more', 'sync-queue', 'slate', 'cloud_upload', '/sync-queue', 'PE', 'Pendientes de envío', 'Operaciones guardadas en la tablet y su estado', '', ''),
  entry('more', 'logistics-costs', 'slate', 'forklift', '/cost-settlements', 'FE', 'Flete y estiba', 'Registros pendientes y liquidaciones', '', ''),
  entry('more', 'receipts', 'slate', 'picture_as_pdf', '/receipts', 'PDF', 'Comprobantes', 'Documentos generados y su compartición', '', ''),
  entry('more', 'messaging', 'slate', 'chat', '/messaging', 'MN', 'Mensajería', 'Compartir por WhatsApp o correo y vencimientos', '', ''),
  entry('more', 'administration', 'slate', 'manage_accounts', '/administration', 'US', 'Usuarios y reemplazos', 'Encargados, credenciales y autorizaciones temporales', '', ''),
  entry('more', 'audit', 'slate', 'history', '/audit', 'AU', 'Auditoría', 'Responsable, fecha y motivo de cada cambio', '', ''),
];

export function modulesFor(role: UserRole) {
  return menuModules.filter((module) => canAccessModule(role, module.id));
}
