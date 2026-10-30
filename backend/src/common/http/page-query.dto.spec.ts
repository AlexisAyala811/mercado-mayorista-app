import { toPage } from './page-query.dto.js';

describe('toPage', () => {
  it('preserves the requested window and total count', () => {
    expect(toPage(['one', 'two'], 12, { limit: 2, offset: 4 })).toEqual({
      items: ['one', 'two'],
      limit: 2,
      offset: 4,
      total: 12,
    });
  });
});
