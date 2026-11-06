import type { Href } from 'expo-router';

import { canAccessModule } from '@/features/auth/authorization/permissions';
import type { UserRole } from '@/domain/auth/session';
import type { HomeModule } from './components/module-card';

// MAÑAY menu (spec 011): Compra and Venta are shown at the same time, with the
// shared management options below. Each entry is filtered with the same rule
// the routes use, so the Encargado sees exactly what the server allows.
export type MenuSection = 'purchase' | 'sale' | 'management';
export type MenuModule = HomeModule & { section: MenuSection; route: Href };

export const menuSections: { id: MenuSection; title: string }[] = [
  { id: 'purchase', title: 'Compra' },
  { id: 'sale', title: 'Venta' },
  { id: 'management', title: 'Gestión' },
];

export const menuModules: MenuModule[] = [
  { id: 'purchases', section: 'purchase', route: '/purchase-flow', shortLabel: 'AN', title: 'Anote', description: 'Recepción, pesaje por saco y liquidación de la compra.' },
  { id: 'purchase-history', section: 'purchase', route: '/purchase-history', shortLabel: 'VC', title: 'Ver compras', description: 'Compras pagadas y con deuda.' },
  { id: 'logistics', section: 'purchase', route: '/logistics', shortLabel: 'CA', title: 'Carros', description: 'Transportistas y vehículos.' },
  { id: 'logistics-costs', section: 'purchase', route: '/cost-settlements', shortLabel: 'FE', title: 'Flete y estiba', description: 'Registros pendientes y liquidaciones.' },
  { id: 'debts', section: 'purchase', route: '/debts', shortLabel: 'DE', title: 'Deudas', description: 'Saldos con proveedores y pagos de compras a crédito.' },
  { id: 'sales', section: 'sale', route: '/sale-flow', shortLabel: 'VE', title: 'Ventas', description: 'Ventas y despachos a compradores.' },
  { id: 'sales-history', section: 'sale', route: '/sales-history', shortLabel: 'VV', title: 'Ver ventas', description: 'Ventas registradas y anulaciones.' },
  { id: 'collections', section: 'sale', route: '/collections', shortLabel: 'CO', title: 'Cobranzas', description: 'Saldos de compradores, cobros y estado de cuenta.' },
  { id: 'sync-queue', section: 'management', route: '/sync-queue', shortLabel: 'PE', title: 'Pendientes de envío', description: 'Operaciones guardadas en la tablet y su estado.' },
  { id: 'reports', section: 'management', route: '/reports', shortLabel: 'RE', title: 'Reportes', description: 'Historial comercial y evolución de precios.' },
  { id: 'analytics', section: 'management', route: '/analytics', shortLabel: 'AL', title: 'Analítica', description: 'Tendencias semanales de precios y cantidades.' },
  { id: 'receipts', section: 'management', route: '/receipts', shortLabel: 'PDF', title: 'Comprobantes', description: 'Documentos generados y su compartición.' },
  { id: 'messaging', section: 'management', route: '/messaging', shortLabel: 'MN', title: 'Mensajería', description: 'Compartir por WhatsApp o correo y vencimientos.' },
  { id: 'administration', section: 'management', route: '/administration', shortLabel: 'US', title: 'Usuarios y reemplazos', description: 'Encargados, credenciales y autorizaciones temporales.' },
  { id: 'audit', section: 'management', route: '/audit', shortLabel: 'AU', title: 'Auditoría', description: 'Responsable, fecha y motivo de cada cambio.' },
];

export function modulesFor(role: UserRole) {
  return menuModules.filter((module) => canAccessModule(role, module.id));
}
