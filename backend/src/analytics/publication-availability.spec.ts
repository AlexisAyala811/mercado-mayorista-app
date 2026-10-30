import type { EntityManager } from 'typeorm';
import { publicationAvailability } from './publication-availability.js';

it('limits the lookup to business and variety and reports no publication without inventing eligibility',async()=>{
  const query=vi.fn().mockResolvedValue([]);
  const result=await publicationAvailability({query} as unknown as EntityManager,'business','variety','2026-10-12T15:00:00.000Z');
  expect(query).toHaveBeenCalledTimes(1);expect(query.mock.calls[0]?.[1]).toEqual(['business','variety']);
  expect(result).toMatchObject({state:'not_published',publicationId:null,evaluationId:null});
});
it('propagates infrastructure errors instead of claiming a publication is invalid',async()=>{
  const error=new Error('database unavailable');const query=vi.fn().mockRejectedValue(error);
  await expect(publicationAvailability({query} as unknown as EntityManager,'business','variety','2026-10-12T15:00:00.000Z')).rejects.toBe(error);
});
