import type { AuthenticatedSession } from "@/domain/auth/session";
import { isSessionExpired } from "@/domain/auth/session";
import type {
  PotatoVariety,
  Provider,
  Vehicle,
} from "@/domain/reception/reception";
import type { Buyer } from "@/domain/sales/sale";
import type {CommercialCharacteristic} from '@/domain/catalog/commercial-characteristic';
import { ApiError, ApiUnavailableError } from "@/services/api/api-client";
import {
  readEncryptedRecord,
  writeEncryptedRecord,
  type StorageScope,
} from "@/services/storage/encrypted-record-storage";

type CharacteristicCatalogs={qualities?:CommercialCharacteristic[];origins?:CommercialCharacteristic[]};
type Catalogs = {
  sale: { buyers: Buyer[]; varieties: PotatoVariety[]; vehicles: Vehicle[] }&CharacteristicCatalogs;
  reception: {
    providers: Provider[];
    varieties: PotatoVariety[];
    vehicles: Vehicle[];
  }&CharacteristicCatalogs;
};
type Kind = keyof Catalogs;
type Snapshot<K extends Kind> = {
  version: 1|2;
  kind: K;
  businessId: string;
  userId: string;
  savedAt: string;
  data: Catalogs[K];
};
export type CatalogResult<T> = T & {
  catalogNotice?: string;
  catalogSource?: "central" | "local";
};
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function assertSession(
  session: AuthenticatedSession,
): StorageScope {
  if (
    !session?.user ||
    isSessionExpired(session) ||
    !Number.isFinite(Date.parse(session.user.expiresAt)) ||
    Date.parse(session.user.expiresAt) <= Date.now()
  )
    throw new ApiError(
      "La sesión debe estar vigente para consultar los catálogos.",
      401,
    );
  if (session.user.role !== "wholesaler" && session.user.role !== "assistant")
    throw new ApiError("La identidad no tiene un rol autorizado para captura.", 403);
  if (!uuid.test(session.user.businessId) || !uuid.test(session.user.userId))
    throw new Error("La identidad no permite recuperar catálogos locales.");
  return { businessId: session.user.businessId, userId: session.user.userId };
}
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function text(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max;
}
function nullableText(value: unknown, max: number) {
  return value === null || text(value, max);
}
function rows(
  value: unknown,
  fields: (row: Record<string, unknown>) => boolean,
) {
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();
  return value.every((row) => {
    if (
      !record(row) ||
      typeof row.id !== "string" ||
      !uuid.test(row.id) ||
      ids.has(row.id) ||
      !fields(row)
    )
      return false;
    ids.add(row.id);
    return true;
  });
}
function validate<K extends Kind>(
  kind: K,
  value: unknown,
  scope: StorageScope,
): Snapshot<K> {
  if (
    !record(value) ||
    (value.version !== 1&&value.version!==2) ||
    value.kind !== kind ||
    value.businessId !== scope.businessId ||
    value.userId !== scope.userId ||
    typeof value.savedAt !== "string" ||
    !Number.isFinite(Date.parse(value.savedAt)) ||
    !record(value.data)
  )
    throw new Error(
      "La copia local de catálogos no es válida para esta identidad.",
    );
  const data = value.data;
  const qualities=data.qualities??(value.version===1?[]:undefined);
  const origins=data.origins??(value.version===1?[]:undefined);
  const named = (row: Record<string, unknown>) =>
    text(row.name, 160) && !!row.name.trim();
  const valid =
    rows(qualities,row=>named(row)&&text(row.name,120)&&row.kind==='quality'&&row.isActive===true)&&
    rows(origins,row=>named(row)&&text(row.name,120)&&row.kind==='origin'&&row.isActive===true)&&
    rows(data.varieties, named) &&
    rows(
      data.vehicles,
      (row) => text(row.plate, 32) && nullableText(row.description, 240),
    ) &&
    (kind === "sale"
      ? rows(
          data.buyers,
          (row) =>
            named(row) &&
            nullableText(row.phone, 32) &&
            nullableText(row.destinationDepartment, 160) &&
            (row.creditLimitCents === null ||
              (typeof row.creditLimitCents === "string" &&
                row.creditLimitCents.length <= 20 &&
                /^\d+$/.test(row.creditLimitCents))),
        )
      : rows(
          data.providers,
          (row) => named(row) && nullableText(row.phone, 32),
        ));
  if (!valid)
    throw new Error("La copia local de catálogos está incompleta o dañada.");
  const varieties = (data.varieties as PotatoVariety[]).map(({ id, name }) => ({
    id,
    name,
  }));
  const vehicles = (data.vehicles as Vehicle[]).map(
    ({ id, plate, description }) => ({ id, plate, description }),
  );
  const projected =
    kind === "sale"
      ? {
          varieties,
          vehicles,
          buyers: (data.buyers as Buyer[]).map(
            ({ id, name, phone, destinationDepartment, creditLimitCents }) => ({
              id,
              name,
              phone,
              destinationDepartment,
              creditLimitCents,
            }),
          ),
        }
      : {
          varieties,
          vehicles,
          providers: (data.providers as Provider[]).map(
            ({ id, name, phone }) => ({ id, name, phone }),
          ),
        };
  return {
    version: 2,
    kind,
    ...scope,
    savedAt: value.savedAt,
    data: {...projected,qualities:(qualities as CommercialCharacteristic[]).map(({id,name,kind,isActive})=>({id,name,kind,isActive})),origins:(origins as CommercialCharacteristic[]).map(({id,name,kind,isActive})=>({id,name,kind,isActive}))},
  } as Snapshot<K>;
}
export async function loadOperationCatalogs<K extends Kind>(
  kind: K,
  session: AuthenticatedSession,
  fetchCentral: () => Promise<Catalogs[K]>,
): Promise<CatalogResult<Catalogs[K]>> {
  const scope = assertSession(session);
  const namespace = kind === "sale" ? "sale-catalog" : "reception-catalog";
  let data: Catalogs[K];
  try {
    data = await fetchCentral();
  } catch (cause) {
    assertSession(session);
    if (!(cause instanceof ApiUnavailableError)) throw cause;
    let value:unknown;
    try { value = await readEncryptedRecord(scope, namespace); }
    catch { throw new Error('No se pudo recuperar la copia cifrada de catálogos. Conserva los datos del dispositivo y consulta nuevamente con conexión.'); }
    if (value === undefined)
      throw new Error(
        "No hay una copia local de estos catálogos. Conéctate y consulta una vez antes de registrar operaciones sin internet.",
      );
    const snapshot = validate(kind, value, scope);
    assertSession(session);
    return {
      ...snapshot.data,
      catalogSource: "local",
      catalogNotice: `Catálogos guardados el ${new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", dateStyle: "short", timeStyle: "short" }).format(new Date(snapshot.savedAt))} · El servidor revalidará participantes, variedades y características al sincronizar.${record(value)&&value.version===1?' La copia anterior no contiene listas de calidad y procedencia; actualiza con conexión para seleccionarlas.':''}`,
    };
  }
  assertSession(session);
  const snapshot = validate(
    kind,
    { version: 2, kind, ...scope, savedAt: new Date().toISOString(), data:{...data,qualities:data.qualities??[],origins:data.origins??[]} },
    scope,
  );
  try {
    await writeEncryptedRecord(scope, namespace, snapshot);
  } catch {
    return {
      ...data,
      catalogSource: "central",
      catalogNotice:
        "Catálogos centrales cargados. No se pudo guardar su copia para reiniciar sin conexión; reintenta la consulta antes de desconectarte.",
    };
  }
  return { ...data, catalogSource: "central" };
}
