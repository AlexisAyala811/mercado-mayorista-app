import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:3000/api/v1';let token;
const call=(path,options={})=>fetch(`${base}${path}`,{...options,signal:AbortSignal.timeout(15000)});
try{
  const ready=await call('/health/ready');assert.equal(ready.status,200);assert.equal((await ready.json()).status,'ok');
  const login=await call('/auth/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:process.env.MERCADO_TEST_USERNAME,password:process.env.MERCADO_TEST_PASSWORD})});assert.equal(login.status,201);token=(await login.json()).accessToken;
  const headers={Authorization:`Bearer ${token}`};const period='from=2026-10-01&to=2026-10-14';
  assert.equal((await call(`/reports/price-history?${period}`)).status,401);
  const response=await call(`/reports/price-history?${period}`,{headers});assert.equal(response.status,200);const all=await response.json();
  for(const item of all.items){for(const key of ['qualityId','qualityName','originId','originName','sourceLineId'])assert.ok(Object.hasOwn(item,key));}
  const unknown=await call(`/reports/price-history?${period}&qualityId=unreported&originId=unreported`,{headers});assert.equal(unknown.status,200);assert.deepEqual((await unknown.json()).items,all.items);
  const absent=await call(`/reports/price-history?${period}&qualityId=${randomUUID()}`,{headers});assert.equal(absent.status,200);assert.deepEqual((await absent.json()).items,[]);
  const invalid=await call(`/reports/price-history?${period}&qualityId=all`,{headers});assert.equal(invalid.status,400);
  const options=await call('/analytics/filters/qualities?limit=100&offset=0',{headers});assert.equal(options.status,200);
  const evidence={checkedAt:new Date().toISOString(),apiReady:true,realSessionLogin:true,priceHistoryStatus:200,anonymousStatus:401,invalidFilterStatus:400,observations:all.items.length,allMetadataFieldsPresent:true,legacyUnknownEqualsUnfiltered:true,absentKnownFilterEmpty:true,historicalOptionsStatus:200,commercialMutationsExecuted:false};
  await writeFile(new URL('../../tmp/references-report-live-http-20261014.json',import.meta.url),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{if(token)assert.equal((await call('/auth/session',{method:'DELETE',headers:{Authorization:`Bearer ${token}`}})).status,204);}
