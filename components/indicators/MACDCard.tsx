'use client';

import { memo, useLayoutEffect, useRef, useEffect } from 'react';
import type { MACDData, MACDHistoryPoint } from '@/types';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Dark from '@amcharts/amcharts5/themes/Dark';
import { createDarkTheme, chartColors } from '@/lib/amcharts/theme';

interface MACDCardProps {
  data: MACDData;
  history: MACDHistoryPoint[];
}

function MACDCardComponent({ data, history }: MACDCardProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<am5.Root | null>(null);
  const macdSeriesRef = useRef<am5xy.LineSeries | null>(null);
  const signalSeriesRef = useRef<am5xy.LineSeries | null>(null);
  const histogramSeriesRef = useRef<am5xy.ColumnSeries | null>(null);

  const isBullish = data.histogram > 0;

  useLayoutEffect(() => {
    if (!chartRef.current) return;

    const root = am5.Root.new(chartRef.current);
    root.setThemes([am5themes_Dark.new(root), createDarkTheme(root)]);
    rootRef.current = root;

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: false,
        panY: false,
        wheelY: 'none',
        layout: root.verticalLayout,
        paddingLeft: 0,
        paddingRight: 5,
      })
    );

    const xAxis = chart.xAxes.push(
      am5xy.DateAxis.new(root, {
        baseInterval: { timeUnit: 'minute', count: 1 },
        renderer: am5xy.AxisRendererX.new(root, {
          minGridDistance: 50,
        }),
      })
    );

    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        renderer: am5xy.AxisRendererY.new(root, {}),
      })
    );

    const histogramSeries = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: 'Histogram',
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: 'histogram',
        valueXField: 'time',
        tooltip: am5.Tooltip.new(root, {
          labelText: 'Histogram: {histogram}',
        }),
      })
    );

    histogramSeries.columns.template.adapters.add('fill', (fill, target) => {
      const dataItem = target.dataItem;
      if (dataItem && dataItem.dataContext) {
        const value = (dataItem.dataContext as { histogram: number }).histogram;
        return value >= 0 ? chartColors.bullish : chartColors.bearish;
      }
      return fill;
    });

    const macdSeries = chart.series.push(
      am5xy.LineSeries.new(root, {
        name: 'MACD',
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: 'macd',
        valueXField: 'time',
        stroke: chartColors.primary,
        tooltip: am5.Tooltip.new(root, {
          labelText: 'MACD: {macd}',
        }),
      })
    );

    macdSeries.strokes.template.setAll({
      strokeWidth: 2,
    });

    const signalSeries = chart.series.push(
      am5xy.LineSeries.new(root, {
        name: 'Signal',
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: 'signal',
        valueXField: 'time',
        stroke: chartColors.warning,
        tooltip: am5.Tooltip.new(root, {
          labelText: 'Signal: {signal}',
        }),
      })
    );

    signalSeries.strokes.template.setAll({
      strokeWidth: 2,
    });

    const cursor = chart.set(
      'cursor',
      am5xy.XYCursor.new(root, {
        behavior: 'none',
      })
    );
    cursor.lineY.set('visible', false);

    macdSeriesRef.current = macdSeries;
    signalSeriesRef.current = signalSeries;
    histogramSeriesRef.current = histogramSeries;

    return () => {
      root.dispose();
    };
  }, []);

  useEffect(() => {
    if (history.length > 0 && histogramSeriesRef.current && macdSeriesRef.current && signalSeriesRef.current) {
      histogramSeriesRef.current.data.setAll(history);
      macdSeriesRef.current.data.setAll(history);
      signalSeriesRef.current.data.setAll(history);
    }
  }, [history]);

  return (
    <div className={`rounded-lg border border-gray-800 bg-gradient-to-br ${isBullish ? 'from-green-500/20 to-transparent' : 'from-red-500/20 to-transparent'} bg-gray-900 p-6 shadow-lg`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">MACD</h3>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap ${isBullish ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
          {isBullish ? 'Bullish ↑' : 'Bearish ↓'}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-4">
        <div>
          <span className="text-xs font-medium text-gray-400">MACD</span>
          <div className="text-sm font-bold text-blue-400">{data.macd.toFixed(2)}</div>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-400">Signal</span>
          <div className="text-sm font-bold text-amber-400">{data.signal.toFixed(2)}</div>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-400">Histogram</span>
          <div className={`text-sm font-bold ${isBullish ? 'text-green-500' : 'text-red-500'}`}>
            {data.histogram > 0 && '+'}{data.histogram.toFixed(2)}
          </div>
        </div>
      </div>

      <div ref={chartRef} className="h-40 w-full" />
    </div>
  );
}

export const MACDCard = memo(MACDCardComponent);
