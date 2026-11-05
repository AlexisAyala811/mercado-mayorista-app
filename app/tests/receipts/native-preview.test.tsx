import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import Pdf from 'react-native-pdf';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ReceiptPreview } from '@/features/receipts/components/receipt-preview.native';
import { AppButton } from '@/ui/components';

jest.mock('react-native-pdf', () => ({ __esModule: true, default: jest.fn(() => null) }));

// React Native exposes these components through lazy getters. Load the existing
// application shell before timing the PDF error/retry interaction in a cold run.
void [Modal, Pressable, Text, View];

it('shows a recoverable PDF read failure without exposing internal errors', async () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  let root!: ReactTestRenderer;
  await act(async () => {
    root = create(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 1280, height: 800 }, insets: { top: 24, right: 0, bottom: 56, left: 0 } }}>
      <ReceiptPreview onClose={jest.fn()} title="Compra de prueba" uri="file:///private/comprobante.pdf" />
    </SafeAreaProvider>);
  });
  const before = root.root.findByType(Pdf);
  await act(async () => { before.props.onError(new Error('internal-path-and-parser-error')); });
  const failure = JSON.stringify(root.toJSON());
  expect(failure).toContain('No se pudo leer el comprobante');
  expect(failure).toContain('Reintentar');
  expect(failure).not.toContain('internal-path-and-parser-error');
  expect(root.root.findAllByType(Pdf)).toHaveLength(0);
  await act(async () => { root.root.findAllByType(AppButton).find((button) => button.props.label === 'Reintentar')!.props.onPress(); });
  expect(root.root.findByType(Pdf).props.source).toEqual({ uri: 'file:///private/comprobante.pdf' });
  expect(JSON.stringify(root.toJSON())).not.toContain('No se pudo leer el comprobante');
  await act(async () => { root.unmount(); });
});
