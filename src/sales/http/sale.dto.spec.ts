import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateSaleDto } from './sale.dto.js';

const uuid = '11111111-1111-4111-8111-111111111111';
const line = {
  varietyId: uuid,
  sacks: 30,
  weightKg: '1500.000',
  priceBasis: 'kilogram',
  unitPriceCents: 150,
};
const payload = {
  clientOperationId: uuid,
  buyerId: uuid,
  destinationDepartment: 'Lima',
  lines: [line],
  freightIncludedInTotal: false,
  discountsCents: 0,
  paymentMode: 'cash',
  installments: [],
};
const validate = (body: unknown) =>
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }).transform(body, { type: 'body', metatype: CreateSaleDto });

it('accepts sale operation quantities with a variety and without inventory fields', async () => {
  const result = await validate(payload);
  expect(result.lines[0].varietyId).toBe(uuid);
  expect(result.lines[0]).not.toHaveProperty('lotId');
});
it('allows the same variety with different quality or origin but rejects duplicate unknown combinations',async()=>{
  const result=await validate({...payload,lines:[{...line,qualityId:uuid},{...line,originId:uuid},{...line,qualityId:null,originId:null}]});expect(result.lines).toHaveLength(3);
  await expect(validate({...payload,lines:[line,{...line,qualityId:null,originId:null}]})).rejects.toThrow(BadRequestException);
});
it('rejects caller-supplied historical names and invalid characteristic references',async()=>{
  await expect(validate({...payload,lines:[{...line,qualityId:'not-a-uuid'}]})).rejects.toThrow(BadRequestException);
  await expect(validate({...payload,lines:[{...line,qualityName:'Inventada'}]})).rejects.toThrow(BadRequestException);
});
it('rejects obsolete pending lot contracts instead of converting financial payloads silently', async () => {
  await expect(
    validate({
      ...payload,
      lines: [{ ...line, lotId: uuid, expectedLotVersion: 3 }],
    }),
  ).rejects.toThrow(BadRequestException);
});
it('rejects duplicate varieties and out-of-range counts at the HTTP boundary', async () => {
  await expect(validate({ ...payload, lines: [line, line] })).rejects.toThrow(
    BadRequestException,
  );
  await expect(
    validate({ ...payload, lines: [{ ...line, sacks: 2147483648 }] }),
  ).rejects.toThrow(BadRequestException);
});
it('requires a civil date rather than a timestamp for a credit installment', async () => {
  await expect(
    validate({
      ...payload,
      paymentMode: 'credit',
      installments: [{ dueOn: '2026-11-01T10:00:00Z', amountCents: 225000 }],
    }),
  ).rejects.toThrow(BadRequestException);
});
