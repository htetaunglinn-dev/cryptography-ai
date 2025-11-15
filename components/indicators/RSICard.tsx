'use client';

import { memo, useLayoutEffect, useRef, useEffect } from 'react';
import type { RSIData, RSIHistoryPoint } from '@/types';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Dark from '@amcharts/amcharts5/themes/Dark';
import { createDarkTheme, chartColors } from '@/lib/amcharts/theme';

interface RSICardProps {
  data: RSIData;
  history: RSIHistoryPoint[];
}

function RSICardComponent({ data, history }: RSICardProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<am5.Root | null>(null);
  const rsiSeriesRef = useRef<am5xy.LineSeries | null>(null);

  const getColor = () => {
    if (data.value > 70) return 'text-red-500';
    if (data.value < 30) return 'text-green-500';
    return 'text-yellow-500';
  };

  const getSignalText = () => {
    if (data.signal === 'overbought') return 'Overbought ↓';
    if (data.signal === 'oversold') return 'Oversold ↑';
    return 'Neutral →';
  };

  const getBackgroundGradient = () => {
    if (data.value > 70) return 'from-red-500/20 to-transparent';
    if (data.value < 30) return 'from-green-500/20 to-transparent';
    return 'from-yellow-500/20 to-transparent';
  };

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
        min: 0,
        max: 100,
        strictMinMax: true,
        renderer: am5xy.AxisRendererY.new(root, {}),
      })
    );

    const oversoldRange = yAxis.createAxisRange(
      yAxis.makeDataItem({
        value: 0,
        endValue: 30,
      })
    );
    oversoldRange.get('axisFill')?.setAll({
      fill: chartColors.oversold,
      fillOpacity: 0.1,
      visible: true,
    });

    const overboughtRange = yAxis.createAxisRange(
      yAxis.makeDataItem({
        value: 70,
        endValue: 100,
      })
    );
    overboughtRange.get('axisFill')?.setAll({
      fill: chartColors.overbought,
      fillOpacity: 0.1,
      visible: true,
    });

    const rsiSeries = chart.series.push(
      am5xy.LineSeries.new(root, {
        name: 'RSI',
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: 'value',
        valueXField: 'time',
        stroke: chartColors.primary,
        tooltip: am5.Tooltip.new(root, {
          labelText: 'RSI: {value}',
        }),
      })
    );

    rsiSeries.strokes.template.setAll({
      strokeWidth: 2,
    });

    const cursor = chart.set(
      'cursor',
      am5xy.XYCursor.new(root, {
        behavior: 'none',
      })
    );
    cursor.lineY.set('visible', false);

    rsiSeriesRef.current = rsiSeries;

    return () => {
      root.dispose();
    };
  }, []);

  useEffect(() => {
    if (history.length > 0 && rsiSeriesRef.current) {
      rsiSeriesRef.current.data.setAll(history);
    }
  }, [history]);

  return (
    <div className={`rounded-lg border border-gray-800 bg-gradient-to-br ${getBackgroundGradient()} bg-gray-900 p-6 shadow-lg`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">RSI (14)</h3>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap ${getColor()} ${
          data.value > 70 ? 'bg-red-500/20' : data.value < 30 ? 'bg-green-500/20' : 'bg-yellow-500/20'
        }`}>
          {getSignalText()}
        </span>
      </div>

      <div className="mb-4">
        <div className="text-4xl font-bold text-white">{data.value.toFixed(2)}</div>
      </div>

      <div ref={chartRef} className="h-40 w-full" />
    </div>
  );
}

export const RSICard = memo(RSICardComponent);
