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
  look: Pick<HomeModule, 'badgeAccent' | 'footAccent' | 'footIcon'> = {},
): MenuModule => ({ accent, badge, description, foot, icon, id, route, section, shortLabel, title, ...look });

// Stitch details of the cards: the Anote pill and foot are green with a bolt,
// Carros has a green dot and Reportes an icon before the foot line.
const anote = { badgeAccent: 'emerald', footAccent: 'emerald', footIcon: 'bolt' } as const;
const carros = { footIcon: 'dot' } as const;
const reportes = { footIcon: 'download' } as const;

export const menuModules: MenuModule[] = [
  entry('purchase', 'purchases', 'amber', 'menu_book', '/purchase-flow', 'AN', 'Anote', 'Pesaje de bultos y sacos en cancha', 'NUEVO', 'Pesaje inmediato', anote),
  entry('purchase', 'purchase-history', 'sky', 'fact_check', '/purchase-history', 'VC', 'Ver compras', 'Historial de tickets y entregas', 'Compras', 'Historial de compras'),
  entry('purchase', 'logistics', 'indigo', 'local_shipping', '/logistics', 'CA', 'Carros', 'Transportistas y vehículos', 'Flota', 'Placas y conductores', carros),
  entry('purchase', 'debts', 'rose', 'payments', '/debts', 'DE', 'Deudas', 'Adelantos y saldos a productores', 'Proveedores', 'Saldos por pagar'),
  entry('purchase', 'analytics', 'teal', 'monitoring', '/analytics', 'AL', 'Analítica', 'Pizarra de precios pactados', 'Variedades', 'Últimas 8 semanas'),
  entry('purchase', 'reports', 'purple', 'description', '/reports', 'RE', 'Reportes', 'Compras del periodo y exportación', 'Mes actual', 'PDF y Excel', reportes),
  entry('sale', 'sales', 'amber', 'menu_book', '/sale-flow', 'VE', 'Anote', 'Registro de pesaje y despacho a clientes', 'DESPACHO', 'Venta inmediata', anote),
  entry('sale', 'sales-history', 'sky', 'receipt_long', '/sales-history', 'VV', 'Ver ventas', 'Historial de notas de venta y despachos', 'Ventas', 'Historial de ventas'),
  entry('sale', 'logistics', 'indigo', 'local_shipping', '/logistics', 'CA', 'Carros', 'Transportistas y vehículos', 'Flota', 'Placas y conductores', carros),
  entry('sale', 'collections', 'rose', 'point_of_sale', '/collections', 'CO', 'Cobranzas', 'Créditos, adelantos y saldos por cobrar', 'Compradores', 'Saldos por cobrar'),
  entry('sale', 'analytics', 'teal', 'query_stats', '/analytics', 'AL', 'Analítica', 'Pizarra de precios pactados y cotización', 'Precios hoy', 'Últimas 8 semanas'),
  entry('sale', 'reports', 'purple', 'description', { pathname: '/reports', params: { lado: 'venta' } }, 'RE', 'Reportes', 'Ventas del periodo y exportación', 'Mes actual', 'PDF y Excel', reportes),
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
