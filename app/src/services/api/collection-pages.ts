import type { Page } from "@/domain/reception/reception";
import { apiRequest } from "./api-client";

export async function loadCollectionPages<T extends { id: string }>(
  path: string,
  token: string,
  label = "El listado",
): Promise<Page<T>> {
  const items = new Map<string, T>();
  let offset = 0;
  let total: number | undefined;
  while (true) {
    const page = await apiRequest<Page<T>>(
      `${path}?limit=100&offset=${offset}`,
      { token },
    );
    if (
      !page ||
      !Array.isArray(page.items) ||
      !Number.isSafeInteger(page.total) ||
      page.total < 0 ||
      page.items.length > 100
    )
      throw new Error(`${label} central no devolvió una página válida.`);
    if (total !== undefined && page.total !== total)
      throw new Error(
        `${label} central cambió durante la consulta. Reintenta para actualizarlo.`,
      );
    total = page.total;
    for (const item of page.items) {
      if (
        !item ||
        typeof item.id !== "string" ||
        !item.id ||
        items.has(item.id)
      )
        throw new Error(
          `${label} central quedó incompleto o contiene registros repetidos. Reintenta la consulta.`,
        );
      items.set(item.id, item);
    }
    offset += page.items.length;
    if (offset === total)
      return {
        items: [...items.values()],
        limit: items.size,
        offset: 0,
        total,
      };
    if (!page.items.length || offset > total)
      throw new Error(
        `${label} central quedó incompleto. Reintenta la consulta.`,
      );
  }
}
