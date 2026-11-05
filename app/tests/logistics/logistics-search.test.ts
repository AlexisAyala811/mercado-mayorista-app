import {
  searchCarriers,
  searchVehicles,
} from "@/domain/logistics/logistics-search";
const carriers = [
  { id: "a", name: "José Álvarez", phone: "999123456" },
  { id: "b", name: "Rosa", phone: null },
];
const vehicles = [
  {
    id: "v1",
    plate: "ABC-123",
    description: "Camión de José",
    carrier: carriers[0],
  },
  { id: "v2", plate: "XYZ-456", description: null, carrier: null },
];
it("finds a carrier by accent-insensitive name or literal phone", () => {
  expect(searchCarriers(carriers, "JOSE ALVAREZ")).toEqual([carriers[0]]);
  expect(searchCarriers(carriers, "123456")).toEqual([carriers[0]]);
  expect(searchCarriers(carriers, "not present")).toEqual([]);
  expect(searchCarriers(carriers, "")).toEqual(carriers);
});
it("finds vehicles by plate, description or associated carrier without inventing data", () => {
  expect(searchVehicles(vehicles, "abc-123")).toEqual([vehicles[0]]);
  expect(searchVehicles(vehicles, "JOSE")).toEqual([vehicles[0]]);
  expect(searchVehicles(vehicles, "Camion")).toEqual([vehicles[0]]);
  expect(searchVehicles(vehicles, "%")).toEqual([]);
  expect(vehicles[1].carrier).toBeNull();
});
