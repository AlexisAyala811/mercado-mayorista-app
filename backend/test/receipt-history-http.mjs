import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Client} from 'pg';
import {mkdir,writeFile} from 'node:fs/promises';
assert.match(process.env.DATABASE_NAME??'',/^mercado_ui_test_[a-f0-9]{32}$/);
const client=new Client({host:'127.0.0.1',port:55437,user:'mercado_test',database:process.env.DATABASE_NAME,password:process.env.DATABASE_PASSWORD});await client.connect();
const base='http://127.0.0.1:3000/api/v1';let token;
const request=(path,options={})=>fetch(`${base}${path}`,{...options,signal:AbortSignal.timeout(30000)});
try{
  const owner=(await client.query('SELECT id,business_id FROM users WHERE username=$1 AND role=$2 AND is_active',[process.env.MERCADO_TEST_USERNAME,'wholesaler'])).rows[0];assert.ok(owner);
  const commercial=async()=> (await client.query('SELECT (SELECT COUNT(*) FROM sales) AS sales,(SELECT COUNT(*) FROM purchase_settlements) AS purchases')).rows[0];
  const before=await commercial();
  const login=await request('/auth/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:process.env.MERCADO_TEST_USERNAME,password:process.env.MERCADO_TEST_PASSWORD})});assert.equal(login.status,201);token=(await login.json()).accessToken;
  const headers={Authorization:`Bearer ${token}`};const totals={};let selected;
  for(const kind of ['purchases','sales']){
    assert.equal((await request(`/receipts/history/${kind}`)).status,401);
    const response=await request(`/receipts/history/${kind}?limit=20&offset=0`,{headers});assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/application\/json/);
    const first=await response.json();assert.equal(first.limit,20);assert.equal(first.offset,0);assert.ok(first.items.length<=20);totals[kind]=first.total;
    assert.ok(first.items.every(row=>/^\d{4}-\d{2}-\d{2}$/.test(row.occurredOn)&&/^-?\d+$/.test(row.amountCents)));
    for(const query of ['limit=0','limit=101','offset=-1','limit=abc'])assert.equal((await request(`/receipts/history/${kind}?${query}`,{headers})).status,400);
    const response2=await request(`/receipts/history/${kind}?limit=20&offset=20`,{headers});assert.equal(response2.status,200);const second=await response2.json();assert.equal(second.offset,20);assert.equal(second.total,first.total);assert.ok(second.items.every(row=>!first.items.some(old=>old.id===row.id)));
    if(kind==='purchases')selected=first.items.find(row=>row.state==='confirmed');
  }
  assert.equal((await request('/receipts/history/invalid',{headers})).status,400);
  assert.ok(selected,'Expected an existing confirmed QA purchase');
  const pdfResponse=await request(`/receipts/purchases/${selected.id}.pdf`,{headers});assert.equal(pdfResponse.status,200);assert.match(pdfResponse.headers.get('content-type'),/application\/pdf/);assert.match(pdfResponse.headers.get('cache-control'),/no-store/);
  const pdf=Buffer.from(await pdfResponse.arrayBuffer());assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
  const hash=createHash('sha256').update(pdf).digest('hex');
  const saved=(await client.query("SELECT sha256 FROM receipt_documents WHERE business_id=$1 AND source_type='purchase' AND source_id=$2 AND invalidated_at IS NULL",[owner.business_id,selected.id])).rows;
  assert.ok(saved.some(row=>row.sha256===hash));assert.deepEqual(await commercial(),before);
  await mkdir('../tmp/pdfs',{recursive:true});await writeFile('../tmp/pdfs/receipt-api-real-2026-10-12.pdf',pdf);
  const evidence={verifiedAt:new Date().toISOString(),listStatus:200,anonymousStatus:401,invalidKindStatus:400,invalidPaginationStatus:400,independentPages:true,totals,pdfStatus:200,pdfBytes:pdf.length,pdfHashMatchesStored:true,commercialMutations:false,newActorsOrPermissions:0};
  await writeFile('../tmp/receipt-history-http-2026-10-12.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{
  if(token){const logout=await request('/auth/session',{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});assert.equal(logout.status,204);}
  await client.end();
}
