import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { BrandMark } from '@/ui/components';

describe('BrandMark', () => {
  beforeAll(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('draws the MAÑAY logo with an accessible name and the requested size', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<BrandMark size={120} />);
    });
    const mark = renderer.root.findByProps({ testID: 'brand-mark' });
    expect(mark.props.accessibilityLabel).toBe('MAÑAY');
    expect(mark.props.source).toBeTruthy();
    expect(mark.props.style).toEqual({ height: 120, width: 120 });
  });
});
