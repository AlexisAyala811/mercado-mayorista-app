import type { PotatoVariety, Provider } from "@/domain/reception/reception";
import type { Buyer } from "@/domain/sales/sale";
import type {CommercialCharacteristic} from '@/domain/catalog/commercial-characteristic';
import { apiRequest } from "./api-client";
import { loadCatalogPages } from "./catalog-pages";
export type CatalogKind = "providers" | "buyers" | "varieties" | 'qualities' | 'origins';
export async function loadCatalogs(token: string) {
  const [providers, buyers, varieties] = await Promise.all([
    loadCatalogPages<Provider>("/catalog/providers", token),
    loadCatalogPages<Buyer>("/catalog/buyers", token),
    loadCatalogPages<PotatoVariety>("/catalog/varieties", token),
  ]);
  return { providers, buyers, varieties };
}
export async function loadMasterCatalogs(token:string){
  const [base,qualities,origins]=await Promise.all([
    loadCatalogs(token),loadCatalogPages<CommercialCharacteristic>('/catalog/qualities',token),loadCatalogPages<CommercialCharacteristic>('/catalog/origins',token),
  ]);
  return {...base,qualities,origins};
}
export const createCatalogItem = <T>(
  token: string,
  kind: CatalogKind,
  body: unknown,
) => apiRequest<T>(`/catalog/${kind}`, { body, method: "POST", token });
export const updateCatalogItem = <T>(
  token: string,
  kind: CatalogKind,
  id: string,
  body: unknown,
) => apiRequest<T>(`/catalog/${kind}/${id}`, { body, method: "PATCH", token });
export const deactivateCatalogItem = (
  token: string,
  kind: CatalogKind,
  id: string,
) => apiRequest<void>(`/catalog/${kind}/${id}`, { method: "DELETE", token });
