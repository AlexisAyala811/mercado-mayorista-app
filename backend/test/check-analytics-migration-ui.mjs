import assert from 'node:assert/strict';
import dataSource from '../dist/database/data-source.js';
assert.match(process.env.DATABASE_NAME ?? '',/^mercado_ui_test_[a-f0-9]{32}$/);
assert.ok(process.argv[2]===undefined||process.argv[2]==='publications'||process.argv[2]==='outcomes');
const expected=process.argv[2]==='outcomes'?'AnalyticsOutcomes1791763200023':process.argv[2]==='publications'?'AnalyticsPublications1791763200022':'AnalyticsEvaluations1791763200021';
await dataSource.initialize();
try {
  const applied=new Set((await dataSource.query('SELECT name FROM migrations')).map(row=>row.name));
  const pending=dataSource.migrations.filter(migration=>!applied.has(migration.name)).map(migration=>migration.name);
  assert.deepEqual(pending,[expected]);
  console.log('Only the new append-only analytics migration is pending in the isolated UI database.');
} finally {await dataSource.destroy();}
