import { ApiUnavailableError, apiRequest } from "@/services/api/api-client";
import { loadCatalogs,loadMasterCatalogs } from "@/services/api/catalog-api";

jest.mock("@/services/api/api-client", () => ({
  ...jest.requireActual("@/services/api/api-client"),
  apiRequest: jest.fn(),
}));
beforeEach(() => jest.resetAllMocks());

it('loads quality and origin options beyond the first central page for master data administration',async()=>{
  jest.mocked(apiRequest).mockImplementation(async path=>{
    const url=new URL(path,'http://local.test');const offset=Number(url.searchParams.get('offset'));
    const extended=url.pathname==='/catalog/qualities'||url.pathname==='/catalog/origins';
    const count=extended?(offset===0?100:1):0;
    return {items:Array.from({length:count},(_,index)=>({id:`${url.pathname}-${offset+index}`,name:`Opción ${offset+index}`})),total:extended?101:0};
  });
  const result=await loadMasterCatalogs('verified-token');
  expect(result.qualities[100].id).toBe('/catalog/qualities-100');expect(result.origins[100].id).toBe('/catalog/origins-100');
});

it("makes items beyond the first hundred available in every shared catalog", async () => {
  jest.mocked(apiRequest).mockImplementation(async (path) => {
    const url = new URL(path, "http://local.test");
    const offset = Number(url.searchParams.get("offset"));
    const count = offset === 0 ? 100 : 1;
    return {
      items: Array.from({ length: count }, (_, index) => ({
        id: `${url.pathname}-${offset + index}`,
        name: `Record ${offset + index}`,
      })),
      total: 101,
    };
  });
  const catalogs = await loadCatalogs("verified-token");
  for (const [kind, items] of Object.entries(catalogs)) {
    expect(items).toHaveLength(101);
    expect(items[100].id).toBe(`/catalog/${kind}-100`);
    expect(apiRequest).toHaveBeenCalledWith(
      `/catalog/${kind}?limit=100&offset=100`,
      { token: "verified-token" },
    );
  }
  expect(apiRequest).toHaveBeenCalledTimes(6);
});

it("rejects the shared result if a later central page fails, preserving retry instead of partial filters", async () => {
  jest.mocked(apiRequest).mockImplementation(async (path) => {
    if (path.startsWith("/catalog/varieties") && path.includes("offset=100"))
      throw new ApiUnavailableError();
    const varieties = path.startsWith("/catalog/varieties");
    return {
      items: Array.from({ length: varieties ? 100 : 1 }, (_, i) => ({
        id: `${path}-${i}`,
        name: "Test",
      })),
      total: varieties ? 101 : 1,
    };
  });
  await expect(loadCatalogs("verified-token")).rejects.toBeInstanceOf(
    ApiUnavailableError,
  );
});
