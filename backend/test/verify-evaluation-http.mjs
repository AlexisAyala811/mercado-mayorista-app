import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { writeFile } from 'node:fs/promises';
assert.match(process.env.DATABASE_NAME ?? '',/^mercado_ui_test_[a-f0-9]{32}$/);
const client=new Client({host:'127.0.0.1',port:55437,user:'mercado_test',database:process.env.DATABASE_NAME,password:process.env.DATABASE_PASSWORD});
await client.connect();
const base='http://127.0.0.1:3000/api/v1';let token;
const request=(path,options={})=>fetch(`${base}${path}`,{...options,signal:AbortSignal.timeout(30000)});
try {
  const before=(await client.query('SELECT COUNT(*)::int AS count FROM analytics_evaluations')).rows[0].count;
  const publicationsBefore=(await client.query('SELECT COUNT(*)::int AS count FROM analytics_publications')).rows[0].count;
  const login=await request('/auth/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:process.env.MERCADO_TEST_USERNAME,password:process.env.MERCADO_TEST_PASSWORD})});
  assert.equal(login.status,201);token=(await login.json()).accessToken;
  const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
  const varieties=await request('/analytics/filters/varieties?limit=100&offset=0',{headers});assert.equal(varieties.status,200);
  const varietyId=(await varieties.json()).items[0].id;
  const asOf=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima'}).format(new Date());
  const body={clientOperationId:randomUUID(),varietyId,asOf};
  const publicationListResponse=await request(`/analytics/publications?varietyId=${varietyId}&limit=20&offset=0`,{headers});assert.equal(publicationListResponse.status,200);
  const publicationPage=await publicationListResponse.json();assert.equal(publicationPage.limit,20);assert.ok(publicationPage.items.every(item=>!('forecast' in item)));
  const list=await request(`/analytics/evaluations?varietyId=${varietyId}&limit=20&offset=0`,{headers});assert.equal(list.status,200);
  const page=await list.json();assert.equal(page.limit,20);assert.ok(Array.isArray(page.items));assert.ok(page.items.every(item=>!('evidence' in item)));
  const badList=await request('/analytics/evaluations?varietyId=invalid&limit=20&offset=0',{headers});assert.equal(badList.status,400);
  const anonymous=await request('/analytics/evaluations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(anonymous.status,401);
  const insufficient=await request('/analytics/evaluations',{method:'POST',headers,body:JSON.stringify(body)});assert.equal(insufficient.status,422);
  const invalid=await request('/analytics/evaluations',{method:'POST',headers,body:JSON.stringify({...body,clientOperationId:'invalid'})});assert.equal(invalid.status,400);
  const future=new Date(`${asOf}T00:00:00Z`);future.setUTCDate(future.getUTCDate()+1);
  const futureResponse=await request('/analytics/evaluations',{method:'POST',headers,body:JSON.stringify({...body,asOf:future.toISOString().slice(0,10)})});assert.equal(futureResponse.status,422);
  const missing=await request(`/analytics/evaluations/${randomUUID()}`,{headers});assert.equal(missing.status,404);
  const publicationBody={evaluationId:randomUUID(),clientOperationId:randomUUID(),reviewed:true};
  const missingPreview=await request(`/analytics/evaluations/${publicationBody.evaluationId}/publication-preview`,{headers});assert.equal(missingPreview.status,404);
  const falseReview=await request('/analytics/publications',{method:'POST',headers,body:JSON.stringify({...publicationBody,reviewed:false})});assert.equal(falseReview.status,400);
  const missingPublicationSource=await request('/analytics/publications',{method:'POST',headers,body:JSON.stringify(publicationBody)});assert.equal(missingPublicationSource.status,404);
  assert.equal((await client.query('SELECT COUNT(*)::int AS count FROM analytics_publications')).rows[0].count,publicationsBefore);
  const after=(await client.query('SELECT COUNT(*)::int AS count FROM analytics_evaluations')).rows[0].count;assert.equal(after,before);
  const evidence={verifiedAt:new Date().toISOString(),listStatus:200,listTotal:page.total,publicationListStatus:200,publicationListTotal:publicationPage.total,invalidListFilterStatus:400,anonymousStatus:401,insufficientHistoryStatus:422,invalidRequestStatus:400,futureStatus:422,missingVersionStatus:404,missingPublicationPreviewStatus:404,falseReviewStatus:400,missingPublicationEvaluationStatus:404,newVersionsSaved:after-before,newPublicationsSaved:0,commercialMutations:false,successfulRealHistoryEvaluationTested:false};
  await writeFile('../tmp/evaluation-http-2026-10-12.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
} finally {
  if(token){const logout=await request('/auth/session',{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});assert.equal(logout.status,204);}
  await client.end();
}
