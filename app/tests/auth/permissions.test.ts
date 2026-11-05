import { canAccessModule, isWholesaler } from '@/features/auth/authorization/permissions';

describe('authorization rules', () => {
  it('limits the assistant to purchases and sales', () => {
    expect(canAccessModule('assistant', 'purchases')).toBe(true);
    expect(canAccessModule('assistant', 'sales')).toBe(true);
    expect(canAccessModule('assistant', 'inventory')).toBe(false);
    expect(canAccessModule('assistant', 'administration')).toBe(false);
    expect(canAccessModule('assistant', 'analytics')).toBe(false);
  });

  it('allows the wholesaler to access every approved module', () => {
    expect(canAccessModule('wholesaler', 'accounts')).toBe(true);
    expect(canAccessModule('wholesaler', 'audit')).toBe(true);
    expect(canAccessModule('wholesaler', 'analytics')).toBe(true);
    expect(canAccessModule('wholesaler', 'inventory')).toBe(false);
    expect(canAccessModule('wholesaler', 'catalog')).toBe(false);
    expect(canAccessModule('assistant', 'catalog')).toBe(false);
    expect(isWholesaler('wholesaler')).toBe(true);
  });
});

it('denies unknown runtime roles even for capture modules',()=>{
  expect(canAccessModule('unknown' as Parameters<typeof canAccessModule>[0],'sales')).toBe(false);
  expect(canAccessModule('unknown' as Parameters<typeof canAccessModule>[0],'purchases')).toBe(false);
});
