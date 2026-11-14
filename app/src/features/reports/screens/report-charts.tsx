import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { dailyBars, varietyBars } from '@/domain/shared/report-figures';
import { listAllReportRows, type DailyReportRow, type VarietyReportRow } from '@/services/api/report-rows-api';
import type { ReportSelection } from '@/services/reports/report-sharing';
import { BarChart } from '@/ui/components/bar-chart';
import { FeedbackState } from '@/ui/components/feedback-state';
import { LoadingState } from '@/ui/components/loading-state';

type Rows = { daily: DailyReportRow[]; varieties: VarietyReportRow[] };

// Spec 011 (RQ-ST07, CL-ST10): the period by day and by variety, as Stitch
// draws it, from /reports/rows (daily and variety). Mounted once per query.
export function ReportCharts({ selection, token }: { selection: ReportSelection; token: string }) {
  const [rows, setRows] = useState<Rows | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { from, operation, to } = selection;
  useEffect(() => {
    let active = true;
    const period = { from, operation, to };
    Promise.all([listAllReportRows(token, period, 'daily'), listAllReportRows(token, period, 'variety')]).then(
      ([daily, varieties]) => { if (active) setRows({ daily, varieties }); },
      (cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los gráficos.'); },
    );
    return () => {
      active = false;
    };
  }, [from, operation, to, token]);
  if (error) return <FeedbackState title="Gráficos no disponibles" message={error} tone="error" />;
  if (!rows) return <LoadingState label="Cargando gráficos del período" />;
  const purchase = operation === 'purchase';
  return (
    <View style={styles.charts}>
      <View style={styles.chart}>
        <BarChart title={purchase ? 'Compras por día' : 'Ventas por día'} description="Importe confirmado por día, en hora de Lima." items={dailyBars(rows.daily)} empty="Sin operaciones en el período." />
      </View>
      <View style={styles.chart}>
        <BarChart title="Distribución por variedad" description="Kilos y sacos de cada variedad en el período." items={varietyBars(rows.varieties)} empty="Sin variedades en el período." />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  charts: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  chart: { flexBasis: 320, flexGrow: 1 },
});
