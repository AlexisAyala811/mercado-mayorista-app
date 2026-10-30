import {Client} from 'pg';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const database=process.env.DATABASE_NAME;
if(!/^mercado_ui_test_[a-f0-9]{32}$/.test(database??''))throw new Error('Expected isolated UI QA database.');
const mode=process.argv[2];if(!['before','created','invoiced','pending','returned'].includes(mode))throw new Error('Unsupported phase.');
const marker='QA frontend devolucion 20261013';
const artifact=new URL('../../tmp/frontend-return-qa-20261013.json',import.meta.url);
const client=new Client({host:'127.0.0.1',port:55437,user:'mercado_test',database,password:process.env.DATABASE_PASSWORD});
try{
  await client.connect();await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const anchor=(await client.query('SELECT business_id FROM sales WHERE id=$1',['55f70ccc-926f-4b14-a79e-9bb007b19109'])).rows[0];
  if(!anchor)throw new Error('Expected existing QA anchor.');
  const businessId=anchor.business_id;
  const counts={};for(const table of ['sales','sale_returns','cash_movements','inventory_lots','inventory_movements']){
    counts[table]=(await client.query(`SELECT count(*)::int AS n FROM ${table} WHERE business_id=$1`,[businessId])).rows[0].n;
  }
  const sales=(await client.query('SELECT id,state,version,client_operation_id,total_amount_cents::text,payment_mode FROM sales WHERE business_id=$1 AND driver_name=$2',[businessId,marker])).rows;
  let evidence;
  if(mode==='before'){
    if(sales.length)throw new Error('QA marker already exists; preserve prior run.');
    try{await readFile(artifact);throw new Error('Evidence already exists; preserve prior run.');}catch(error){if(error.code!=='ENOENT')throw error;}
    evidence={marker,businessId,before:{checkedAt:new Date().toISOString(),counts}};
  }else{
    evidence=JSON.parse(await readFile(artifact,'utf8'));
    if(evidence.businessId!==businessId||sales.length!==1)throw new Error('Expected one scoped QA sale.');
    const sale=sales[0];
    const lines=(await client.query('SELECT id,lot_id,lot_version,sacks,weight_kg::text,unit_price_cents::text,subtotal_cents::text FROM sale_lines WHERE sale_id=$1',[sale.id])).rows;
    const returns=(await client.query('SELECT id,client_operation_id,total_refund_cents::text,cash_refund_cents::text,account_credit_cents::text,sale_version_before,sale_version_after FROM sale_returns WHERE business_id=$1 AND sale_id=$2',[businessId,sale.id])).rows;
    const cash=(await client.query("SELECT direction,category,amount_cents::text,source_type,source_id,client_operation_id FROM cash_movements WHERE business_id=$1 AND (source_id=$2 OR source_id IN (SELECT id FROM sale_returns WHERE business_id=$1 AND sale_id=$2))",[businessId,sale.id])).rows;
    if(sale.state!=='confirmed'||sale.total_amount_cents!=='2500'||sale.payment_mode!=='cash'||lines.length!==1||lines[0].lot_id!==null||lines[0].lot_version!==null||lines[0].weight_kg!=='10.000'||lines[0].sacks!==1)throw new Error('Unexpected sale agreement.');
    const incoming=cash.filter(row=>row.direction==='in');const outgoing=cash.filter(row=>row.direction==='out');
    if(mode==='returned')console.log(JSON.stringify({phase:'observed',saleId:sale.id,version:sale.version,returnCount:returns.length,refunds:returns.map(row=>({total:row.total_refund_cents,cash:row.cash_refund_cents,credit:row.account_credit_cents})),cash:cash.map(row=>({direction:row.direction,amount:row.amount_cents,category:row.category}))}));
    if(incoming.length!==1||incoming[0].amount_cents!=='2500')throw new Error('Expected one sale cash entry.');
    for(const table of ['inventory_lots','inventory_movements'])if(counts[table]!==evidence.before.counts[table])throw new Error('Unexpected inventory mutation.');
    if(mode==='created'||mode==='invoiced'||mode==='pending'){
      if(sale.version!==0||returns.length||outgoing.length)throw new Error('Unexpected initial return/version.');
    }else{
      if(sale.version!==1||returns.length!==1||returns[0].total_refund_cents!=='1250'||returns[0].cash_refund_cents!=='1250'||returns[0].account_credit_cents!=='0'||outgoing.length!==1||outgoing[0].amount_cents!=='1250')throw new Error('Expected one partial commercial refund.');
      const returnedLines=(await client.query('SELECT returned_sacks,returned_weight_kg::text,authorized_gross_cents::text,net_cost_reduction_cents FROM sale_return_lines WHERE sale_return_id=$1',[returns[0].id])).rows;
      if(returnedLines.length!==1||returnedLines[0].returned_weight_kg!=='5.000'||returnedLines[0].authorized_gross_cents!=='1250'||returnedLines[0].net_cost_reduction_cents!==null)throw new Error('Unexpected return quantities or legacy costing.');
    }
    const documents=(await client.query("SELECT id,source_type,source_id,source_version,sha256,content,invalidated_at,retention_until FROM receipt_documents WHERE business_id=$1 AND (source_id=$2 OR source_id IN (SELECT id FROM sale_returns WHERE business_id=$1 AND sale_id=$2))",[businessId,sale.id])).rows.map(({content,...row})=>({...row,bytes:content.length,contentSha256:createHash('sha256').update(content).digest('hex')}));
    if(documents.some(row=>row.sha256!==row.contentSha256))throw new Error('Stored document differs from its hash.');
    if((mode==='invoiced'||mode==='pending')&&(documents.length!==1||documents[0].invalidated_at))throw new Error('Expected one current original sale PDF.');
    if(mode==='returned'){
      if(!evidence.invoiced)throw new Error('Original invoice evidence is required.');
      const original=evidence.invoiced.documents[0];const retained=documents.find(row=>row.id===original.id);
      if(!retained?.invalidated_at||retained.contentSha256!==original.contentSha256||retained.bytes!==original.bytes||retained.retention_until.toISOString()!==original.retention_until)throw new Error('Original invoice was not invalidated and preserved.');
    }
    evidence[mode]={checkedAt:new Date().toISOString(),counts,sale,lines,returns,cash,documents};
  }
  await client.query('COMMIT');await writeFile(artifact,JSON.stringify(evidence,null,2));
  console.log(JSON.stringify({phase:mode,counts,saleId:sales[0]?.id,verified:true}));
}finally{await client.end();}
