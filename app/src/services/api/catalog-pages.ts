import { loadCollectionPages } from "./collection-pages";

export async function loadCatalogPages<T extends { id: string }>(
  path: string,
  token: string,
): Promise<T[]> {
  return (await loadCollectionPages<T>(path, token, "El catálogo")).items;
}
