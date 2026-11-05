import { HomeScreen } from '@/features/home/screens/home-screen';
import { useSession } from '@/features/auth/session/session-provider';
import type { HomeModule } from '@/features/home/components/module-card';
import { useRouter, type Href } from 'expo-router';
import { canAccessModule } from '@/features/auth/authorization/permissions';

const wholesalerModules: HomeModule[] = [
  { id: 'messaging', shortLabel: 'MN', title: 'Mensajería y notificaciones', description: 'Comparte PDF, Word e imágenes con clientes o proveedores y consulta vencimientos.' },
  { id: 'purchases', shortLabel: 'CO', title: 'Compras', description: 'Recepción, pesaje y liquidación de compras.' },
  { id: 'purchase-history', shortLabel: 'HC', title: 'Historial de compras', description: 'Recepciones, correcciones y anulaciones trazables.' },
  { id: 'sales', shortLabel: 'VE', title: 'Ventas', description: 'Ventas, despachos y devoluciones comerciales.' },
  { id: 'accounts', shortLabel: 'CU', title: 'Cuentas y caja', description: 'Deudas, pagos, cobros y movimientos.' },
  { id: 'logistics', shortLabel: 'LO', title: 'Logística', description: 'Transportistas, vehículos, flete y estiba.' },
  { id: 'logistics-costs', shortLabel: 'FE', title: 'Flete y estiba', description: 'Entradas pendientes y liquidaciones operativas.' },
  { id: 'reports', shortLabel: 'RE', title: 'Reportes', description: 'Historial comercial y evolución de precios.' },
  { id: 'analytics', shortLabel: 'AN', title: 'Analítica', description: 'Tendencias semanales de precios y cantidades.' },
  { id: 'receipts', shortLabel: 'PDF', title: 'Comprobantes', description: 'Historial, generación y compartición de documentos.' },
  { id: 'sales-history', shortLabel: 'DV', title: 'Historial y devoluciones', description: 'Anulaciones y devoluciones comerciales de ventas.' },
  { id: 'administration', shortLabel: 'US', title: 'Usuarios y reemplazos', description: 'Encargados, credenciales y autorizaciones temporales.' },
  { id: 'audit', shortLabel: 'AU', title: 'Auditoría', description: 'Trazabilidad de cambios, anulaciones y accesos.' },
];

export default function HomeRoute() {
  const router = useRouter();
  const { logout, session } = useSession();
  if (!session) return null;
  const isWholesaler = session.user.role === 'wholesaler';
  return (
    <HomeScreen
      modules={wholesalerModules.filter((module) => canAccessModule(session.user.role, module.id))}
      onOpenModule={(module) => {
        if (module.id === 'messaging') router.push('/messaging' as Href);
        if (module.id === 'purchases') router.push('/purchase-flow' as Href);
        if (module.id === 'purchase-history') router.push('/purchase-history' as Href);
        if (module.id === 'sales') router.push('/sale-flow' as Href);
        if (module.id === 'accounts') router.push('/accounts' as Href);
        if (module.id === 'logistics') router.push('/logistics' as Href);
        if (module.id === 'logistics-costs') router.push('/cost-settlements' as Href);
        if (module.id === 'reports') router.push('/reports' as Href);
        if (module.id === 'analytics') router.push('/analytics' as Href);
        if (module.id === 'receipts') router.push('/receipts' as Href);
        if (module.id === 'sales-history') router.push('/sales-history' as Href);
        if (module.id === 'administration') router.push('/administration' as Href);
        if (module.id === 'audit') router.push('/audit' as Href);
      }}
      onLogout={() => void logout()}
      roleLabel={isWholesaler ? 'Mayorista' : 'Encargado con reemplazo vigente'}
      userDisplayName={session.user.username}
    />
  );
}
