import { logisticsRecords } from '@/features/logistics/logistics-records';
import type { LogisticsVehicle } from '@/services/api/operations-api';

const carrier = { id: 'c1', name: 'José Álvarez', phone: '999111222' };
const unassigned = { id: 'c2', name: 'Transportista libre', phone: null };
const inactive = { id: 'inactive', name: 'Nombre conservado', phone: '999888777' };
const vehicles: LogisticsVehicle[] = [
  { id: 'v1', plate: 'ABC-123', description: 'Camión rojo', carrierId: carrier.id, carrier },
  { id: 'v2', plate: 'DEF-456', description: null, carrierId: carrier.id, carrier },
  { id: 'v3', plate: 'GHI-789', description: null, carrierId: inactive.id, carrier: inactive },
  { id: 'v4', plate: 'JKL-101', description: null, carrierId: null, carrier: null },
];

it('keeps all vehicles and unassigned carriers with original identifiers and no fabricated association', () => {
  const rows = logisticsRecords([carrier, unassigned], vehicles, '');
  expect(rows.map(row => row.key)).toEqual(['vehicle:v1', 'vehicle:v2', 'vehicle:v3', 'vehicle:v4', 'carrier:c2']);
  expect(rows.filter(row => row.carrier?.id === carrier.id)).toHaveLength(2);
  expect(rows[2]).toMatchObject({ name: inactive.name, phone: inactive.phone, carrier: null, vehicle: { id: 'v3' } });
  expect(rows[3]).toMatchObject({ name: 'Sin transportista', phone: null, carrier: null, vehicle: { id: 'v4' } });
  expect(rows[4]).toMatchObject({ carrier: unassigned, vehicle: null });
});

it('searches the complete records literally, including a retained phone, and clearing restores every record', () => {
  const records = (query: string) => logisticsRecords([carrier, unassigned], vehicles, query).map(row => row.key);
  expect(records('jose alvarez')).toEqual(['vehicle:v1', 'vehicle:v2']);
  expect(records('999888777')).toEqual(['vehicle:v3']);
  expect(records('abc-123')).toEqual(['vehicle:v1']);
  expect(records('rojo')).toEqual(['vehicle:v1']);
  expect(records('LIBRE')).toEqual(['carrier:c2']);
  expect(records('.*')).toEqual([]);
  expect(records('   ')).toHaveLength(5);
});
