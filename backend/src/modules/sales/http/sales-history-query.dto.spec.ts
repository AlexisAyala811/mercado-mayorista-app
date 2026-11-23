import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { SalesHistoryQueryDto } from './sales-history-query.dto.js';

const validate = (query: unknown) =>
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }).transform(query, { type: 'query', metatype: SalesHistoryQueryDto });
it('parses page numbers and accepts civil dates and trimmed participant text', async () => {
  const query = await validate({
    limit: '20',
    offset: '100',
    from: '2026-10-07',
    to: '2026-10-07',
    search: '  Comprador QA  ',
    state: 'confirmed',
  });
  expect(query).toMatchObject({
    limit: 20,
    offset: 100,
    search: 'Comprador QA',
    from: '2026-10-07',
    to: '2026-10-07',
  });
});
it.each([
  { from: '2026-02-30' },
  { to: '2026-10-07T12:00:00Z' },
  { from: '0000-01-01' },
  { search: ' ' },
  { limit: '101' },
  { buyerId: 'invalid' },
  { state: 'available' },
  { stock: 'true' },
])('rejects invalid history filter %j', async (query) => {
  await expect(validate(query)).rejects.toThrow(BadRequestException);
});
