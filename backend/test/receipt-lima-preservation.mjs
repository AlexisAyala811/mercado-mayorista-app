import {Client} from 'pg';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
const database=process.env.DATABASE_NAME;
if(!/^mercado_ui_test_[a-f0-9]{32}$/.test(database??''))throw new Error('Expected the isolated UI QA database.');
const mode=process.argv[2];if(!['before','after'].includes(mode))throw new Error('Expected before or after.');
const client=new Client({host:'127.0.0.1',port:55437,user:'mercado_test',database,password:process.env.DATABASE_PASSWORD});
const path=new URL('../../tmp/receipt-lima-preservation-2026-10-13.json',import.meta.url);
try{
  await client.connect();
  const sale=(await client.query(`SELECT id,business_id AS "businessId",state,version,total_amount_cents::text AS "amountCents",(created_at AT TIME ZONE 'America/Lima')::date::text AS "civilDate" FROM sales WHERE id=$1`,['55f70ccc-926f-4b14-a79e-9bb007b19109'])).rows[0];
  if(!sale)throw new Error('The existing QA sale was not found.');
  const rows=(await client.query(`SELECT source_version AS "sourceVersion",sha256,content,retention_until AS "retentionUntil",invalidated_at AS "invalidatedAt" FROM receipt_documents WHERE business_id=$1 AND source_id=$2 AND source_type='sale' ORDER BY source_version`,[sale.businessId,sale.id])).rows.map(({content,...row})=>({...row,contentSha256:createHash('sha256').update(content).digest('hex'),bytes:content.length}));
  if(rows.some(row=>row.sha256!==row.contentSha256))throw new Error('Stored document hash differs from its content.');
  if(mode==='before'){
    if(!rows.length)throw new Error('Expected a preserved original QA document.');
    await writeFile(path,JSON.stringify({before:{checkedAt:new Date().toISOString(),sale,documents:rows}},null,2));
    console.log(JSON.stringify({mode,documentCount:rows.length,civilDate:sale.civilDate}));
  }else{
    const evidence=JSON.parse(await readFile(path,'utf8'));
    if(JSON.stringify(sale)!==JSON.stringify(evidence.before.sale))throw new Error('The commercial sale changed.');
    for(const old of evidence.before.documents){
      const retained=rows.find(row=>row.sourceVersion===old.sourceVersion);
      if(!retained||retained.contentSha256!==old.contentSha256||retained.bytes!==old.bytes||retained.retentionUntil.toISOString()!==old.retentionUntil)throw new Error('Original PDF content or retention changed.');
    }
    const corrected=rows.find(row=>row.sourceVersion===`${sale.state}:v${sale.version}:date-lima-v1`);
    if(!corrected||corrected.invalidatedAt)throw new Error('Expected the corrected current PDF version.');
    evidence.after={checkedAt:new Date().toISOString(),sale,documents:rows,originalContentAndRetentionPreserved:true,commercialSaleUnchanged:true};
    await writeFile(path,JSON.stringify(evidence,null,2));
    console.log(JSON.stringify({mode,documentCount:rows.length,civilDate:sale.civilDate,originalContentAndRetentionPreserved:true,commercialSaleUnchanged:true}));
  }
}finally{await client.end();}
