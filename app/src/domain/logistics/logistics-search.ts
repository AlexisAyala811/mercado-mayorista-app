type CarrierReference = { name: string; phone: string | null };
type VehicleReference = {
  plate: string;
  description: string | null;
  carrier?: CarrierReference | null;
};
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-PE");
const matches = (text: string, search: string) =>
  normalize(text).includes(normalize(search.trim()));
export function searchCarriers<T extends CarrierReference>(
  items: T[],
  search: string,
): T[] {
  return items.filter((item) =>
    matches(`${item.name} ${item.phone ?? ""}`, search),
  );
}
export function searchVehicles<T extends VehicleReference>(
  items: T[],
  search: string,
): T[] {
  return items.filter((item) =>
    matches(
      `${item.plate} ${item.description ?? ""} ${item.carrier?.name ?? ""}`,
      search,
    ),
  );
}
