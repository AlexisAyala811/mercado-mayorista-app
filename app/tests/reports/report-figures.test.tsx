import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

import { averagePricePerKilogram, dailyBars, varietyBars } from '@/domain/shared/report-figures';
import { ReportCharts } from '@/features/reports/screens/report-charts';
import { listAllReportRows } from '@/services/api/report-rows-api';
import { BarChart } from '@/ui/components/bar-chart';

jest.mock('@/services/api/report-rows-api', () => ({ listAllReportRows: jest.fn() }));
beforeEach(() => { (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
const texts = (root: ReactTestRenderer) => root.root.findAll((node) => node.type === Text).map((node) => [node.props.children].flat().join(''));

// Spec 011 (RQ-ST07, CL-ST05, CL-ST10).
it('computes the average price per kilogram with integers and rounds half up to the cent', () => {
  expect(averagePricePerKilogram('12345', '31.000')).toBe('S/ 3.98 / kg');
  expect(averagePricePerKilogram('100', '0.600')).toBe('S/ 1.67 / kg');
  expect(averagePricePerKilogram('100', '0.000')).toBeNull();
});

it('turns the daily and variety rows into bars with the exact value as text', () => {
  expect(dailyBars([{ amount: '42000', date: '2026-11-03', operations: '2', sacks: '8', weight: '400.000' }])).toEqual([{ display: 'S/ 420.00', key: '2026-11-03', label: '03/11', value: 42000 }]);
  expect(varietyBars([{ id: 'v', name: 'Canchán', sacks: '1', weight: '50.400' }])).toEqual([{ display: '50 kg · 1 saco', key: 'v', label: 'Canchán', value: 50400 }]);
});

it('draws each bar with its label and value for the screen reader, and says when there is nothing', async () => {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<BarChart title="Compras por día" items={[{ display: 'S/ 420.00', key: 'a', label: '03/11', value: 42000 }, { display: 'S/ 210.00', key: 'b', label: '04/11', value: 21000 }]} />); });
  expect(root.root.findAll((node) => node.props.accessibilityLabel === '03/11: S/ 420.00' && node.props.accessible)).not.toHaveLength(0);
  const widths = root.root.findAll((node) => typeof node.type === 'string' && Array.isArray(node.props.style) && node.props.style.some((item: { width?: string }) => item?.width)).map((node) => node.props.style.find((item: { width?: string }) => item?.width).width);
  expect(widths).toEqual(['100%', '50%']);
  await act(async () => { root.update(<BarChart title="Vacío" items={[]} empty="Sin operaciones en el período." />); });
  expect(texts(root)).toContain('Sin operaciones en el período.');
  await act(async () => root.unmount());
});

it('reads the daily and the variety reports of the consulted period and shows both charts', async () => {
  jest.mocked(listAllReportRows).mockImplementation(async (_token, _selection, report) => (report === 'daily'
    ? [{ amount: '42000', date: '2026-11-03', id: '2026-11-03', operations: '2', sacks: '8', weight: '400.000' }]
    : [{ id: 'v', name: 'Canchán', operations: '2', sacks: '8', subtotal: null, weight: '400.000' }]) as never);
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<ReportCharts token="t" selection={{ from: '2026-11-01', operation: 'purchase', to: '2026-11-09' }} />); });
  expect(listAllReportRows).toHaveBeenCalledWith('t', { from: '2026-11-01', operation: 'purchase', to: '2026-11-09' }, 'daily');
  expect(texts(root)).toEqual(expect.arrayContaining(['Compras por día', 'Distribución por variedad', 'S/ 420.00', '400 kg · 8 sacos']));
  await act(async () => root.unmount());
});
