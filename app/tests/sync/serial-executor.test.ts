import { createSerialExecutor } from '@/domain/sync/serial-executor';

it('serializes concurrent writes against the latest state', async () => {
  const run = createSerialExecutor();
  const values: number[] = [];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {release = resolve;});
  const first = run(async () => {await gate;values.push(1);});
  const second = run(async () => {values.push(values[0]+1);});
  await Promise.resolve();
  expect(values).toEqual([]);
  release();
  await Promise.all([first,second]);
  expect(values).toEqual([1,2]);
});
it('continues after a failed operation without hiding its error', async () => {
  const run = createSerialExecutor();
  const failure = run(async () => {throw new Error('storage failure');});
  const next = run(async () => 'recovered');
  await expect(failure).rejects.toThrow('storage failure');
  await expect(next).resolves.toBe('recovered');
});
