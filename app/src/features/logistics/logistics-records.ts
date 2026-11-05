import type { Carrier, LogisticsVehicle } from '@/services/api/operations-api';
import { searchCarriers, searchVehicles } from '@/domain/logistics/logistics-search';

export type LogisticsRecord = {
  key: string;
  name: string;
  phone: string | null;
  carrier: Carrier | null;
  vehicle: LogisticsVehicle | null;
};

/** Presentation only: keep every vehicle and each carrier without a vehicle. */
export function logisticsRecords(carriers: Carrier[], vehicles: LogisticsVehicle[], search: string): LogisticsRecord[] {
  const activeCarriers = new Map(carriers.map(carrier => [carrier.id, carrier]));
  const assigned = new Set(vehicles.flatMap(vehicle => vehicle.carrierId ? [vehicle.carrierId] : []));
  const matchingVehicles = new Set(searchVehicles(vehicles, search).map(vehicle => vehicle.id));
  const records: LogisticsRecord[] = [];
  for (const vehicle of vehicles) {
    const editableCarrier = vehicle.carrierId ? activeCarriers.get(vehicle.carrierId) ?? null : null;
    const displayedCarrier = editableCarrier ?? vehicle.carrier ?? null;
    const carrierMatches = displayedCarrier && searchCarriers([displayedCarrier], search).length > 0;
    if (!matchingVehicles.has(vehicle.id) && !carrierMatches) continue;
    records.push({ key: `vehicle:${vehicle.id}`, name: displayedCarrier?.name ?? 'Sin transportista', phone: displayedCarrier?.phone ?? null, carrier: editableCarrier, vehicle });
  }
  for (const carrier of searchCarriers(carriers, search)) {
    if (!assigned.has(carrier.id)) records.push({ key: `carrier:${carrier.id}`, name: carrier.name, phone: carrier.phone, carrier, vehicle: null });
  }
  return records;
}
