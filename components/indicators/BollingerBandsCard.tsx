'use client';

import { memo, useLayoutEffect, useRef, useEffect } from 'react';
import type { BollingerBandsData, BollingerBandsHistoryPoint } from '@/types';
import { formatCurrency } from '@/lib/utils';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Dark from '@amcharts/amcharts5/themes/Dark';
import { createDarkTheme, chartColors } from '@/lib/amcharts/theme';

interface BollingerBandsCardProps {
  data: BollingerBandsData;
  currentPrice: number;
  history: BollingerBandsHistoryPoint[];
}

function BollingerBandsCardComponent({ data, currentPrice, history }: BollingerBandsCardProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<am5.Root | null>(null);
  const upperSeriesRef = useRef<am5xy.LineSeries | null>(null);
  const middleSeriesRef = useRef<am5xy.LineSeries | null>(null);
  const lowerSeriesRef = useRef<am5xy.LineSeries | null>(null);
  const priceSeriesRef = useRef<am5xy.LineSeries | null>(null);

  const isSqueeze = data.bandwidth < 2;
  const position = data.percentB > 1 ? 'Above' : data.percentB < 0 ? 'Below' : 'Within';

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

    const upperSeries = chart.series.push(
      am5xy.LineSeries.new(root, {
        name: 'Upper',
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: 'upper',
        valueXField: 'time',
        stroke: am5.color(0x3b82f6),
      })
    );
    upperSeries.strokes.template.setAll({ strokeWidth: 1, strokeDasharray: [3, 3], strokeOpacity: 0.5 });

    const middleSeries = chart.series.push(
      am5xy.LineSeries.new(root, {
        name: 'Middle',
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: 'middle',
        valueXField: 'time',
        stroke: am5.color(0x8b5cf6),
      })
    );
    middleSeries.strokes.template.setAll({ strokeWidth: 2 });

    const lowerSeries = chart.series.push(
      am5xy.LineSeries.new(root, {
        name: 'Lower',
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: 'lower',
        valueXField: 'time',
        stroke: am5.color(0x3b82f6),
      })
    );
    lowerSeries.strokes.template.setAll({ strokeWidth: 1, strokeDasharray: [3, 3], strokeOpacity: 0.5 });

    const priceSeries = chart.series.push(
      am5xy.LineSeries.new(root, {
        name: 'Price',
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: 'price',
        valueXField: 'time',
        stroke: chartColors.primary,
        tooltip: am5.Tooltip.new(root, {
          labelText: 'Price: {price}\nUpper: {upper}\nMiddle: {middle}\nLower: {lower}',
        }),
      })
    );
    priceSeries.strokes.template.setAll({ strokeWidth: 2 });

    const rangeDataItem = yAxis.makeDataItem({});
    const range = upperSeries.createAxisRange(rangeDataItem);

    range.fills?.template.setAll({
      fill: am5.color(0x3b82f6),
      fillOpacity: 0.1,
      visible: true,
    });

    const cursor = chart.set(
      'cursor',
      am5xy.XYCursor.new(root, {
        behavior: 'none',
      })
    );
    cursor.lineY.set('visible', false);

    upperSeriesRef.current = upperSeries;
    middleSeriesRef.current = middleSeries;
    lowerSeriesRef.current = lowerSeries;
    priceSeriesRef.current = priceSeries;

    return () => {
      root.dispose();
    };
  }, []);

  useEffect(() => {
    if (
      history.length > 0 &&
      upperSeriesRef.current &&
      middleSeriesRef.current &&
      lowerSeriesRef.current &&
      priceSeriesRef.current
    ) {
      upperSeriesRef.current.data.setAll(history);
      middleSeriesRef.current.data.setAll(history);
      lowerSeriesRef.current.data.setAll(history);
      priceSeriesRef.current.data.setAll(history);
    }
  }, [history]);

  return (
    <div className="rounded-lg border border-gray-800 bg-gradient-to-br from-blue-500/10 to-transparent bg-gray-900 p-6 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Bollinger Bands</h3>
        {isSqueeze && (
          <span className="animate-pulse rounded-full bg-orange-500/20 px-3 py-1 text-xs font-semibold text-orange-500 whitespace-nowrap">
            Squeeze ⚡
          </span>
        )}
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <div>
          <span className="text-xs font-medium text-gray-400">Upper</span>
          <div className="text-sm font-bold text-blue-400">{formatCurrency(data.upper)}</div>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-400">Middle</span>
          <div className="text-sm font-bold text-violet-400">{formatCurrency(data.middle)}</div>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-400">Lower</span>
          <div className="text-sm font-bold text-blue-400">{formatCurrency(data.lower)}</div>
        </div>
      </div>

      <div ref={chartRef} className="mb-3 h-32 w-full" />

      <div className="flex items-center justify-between border-t border-gray-800 pt-3">
        <div>
          <span className="text-xs font-medium text-gray-400">Bandwidth</span>
          <div className="text-sm font-bold text-white">{data.bandwidth.toFixed(2)}%</div>
        </div>
        <div>
          <span className={`rounded-full px-2 py-1 text-xs font-bold whitespace-nowrap ${
            position === 'Above' ? 'bg-red-500/20 text-red-500' :
            position === 'Below' ? 'bg-green-500/20 text-green-500' :
            'bg-yellow-500/20 text-yellow-500'
          }`}>
            {position === 'Above' ? 'Above ↑' : position === 'Below' ? 'Below ↓' : 'Within →'}
          </span>
        </div>
      </div>
    </div>
  );
}

export const BollingerBandsCard = memo(BollingerBandsCardComponent);
