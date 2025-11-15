'use client';

import { memo, useLayoutEffect, useRef, useEffect } from 'react';
import type { FearGreedData, FearGreedHistoryPoint } from '@/types/fear-greed';
import * as am5 from '@amcharts/amcharts5';
import * as am5radar from '@amcharts/amcharts5/radar';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Dark from '@amcharts/amcharts5/themes/Dark';
import { createDarkTheme } from '@/lib/amcharts/theme';

interface FearGreedGaugeProps {
  data: FearGreedData | null;
  history: FearGreedHistoryPoint[];
}

function FearGreedGaugeComponent({ data, history }: FearGreedGaugeProps) {
  const gaugeRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const gaugeRootRef = useRef<am5.Root | null>(null);
  const historyRootRef = useRef<am5.Root | null>(null);
  const handRef = useRef<am5radar.ClockHand | null>(null);
  const handDataItemRef = useRef<am5.DataItem<am5xy.IValueAxisDataItem> | null>(null);
  const historySeriesRef = useRef<am5xy.LineSeries | null>(null);

  const getColor = (value: number) => {
    if (value <= 25) return { text: 'text-red-500', bg: 'bg-red-500/20' };
    if (value <= 45) return { text: 'text-orange-500', bg: 'bg-orange-500/20' };
    if (value <= 55) return { text: 'text-yellow-500', bg: 'bg-yellow-500/20' };
    if (value <= 75) return { text: 'text-lime-500', bg: 'bg-lime-500/20' };
    return { text: 'text-green-500', bg: 'bg-green-500/20' };
  };

  const getGradient = (value: number) => {
    if (value <= 25) return 'from-red-500/20 to-transparent';
    if (value <= 45) return 'from-orange-500/20 to-transparent';
    if (value <= 55) return 'from-yellow-500/20 to-transparent';
    if (value <= 75) return 'from-lime-500/20 to-transparent';
    return 'from-green-500/20 to-transparent';
  };

  useLayoutEffect(() => {
    if (!gaugeRef.current) return;

    const root = am5.Root.new(gaugeRef.current);
    root.setThemes([am5themes_Dark.new(root), createDarkTheme(root)]);
    gaugeRootRef.current = root;

    const chart = root.container.children.push(
      am5radar.RadarChart.new(root, {
        panX: false,
        panY: false,
        startAngle: -90,
        endAngle: 90,
        innerRadius: am5.percent(70),
      })
    );

    const axisRenderer = am5radar.AxisRendererCircular.new(root, {
      innerRadius: am5.percent(70),
      strokeOpacity: 0,
    });

    axisRenderer.ticks.template.setAll({
      visible: true,
      strokeOpacity: 0.5,
    });

    axisRenderer.grid.template.setAll({
      visible: false,
    });

    const axis = chart.xAxes.push(
      am5xy.ValueAxis.new(root, {
        min: 0,
        max: 100,
        strictMinMax: true,
        renderer: axisRenderer,
      })
    );

    axis.get('renderer').labels.template.setAll({
      visible: false,
    });

    const rangeDataItem0 = axis.makeDataItem({
      value: 0,
      endValue: 25,
    });
    const range0 = axis.createAxisRange(rangeDataItem0);
    range0.get('axisFill')?.setAll({
      fill: am5.color(0xef4444),
      fillOpacity: 0.8,
      visible: true,
    });

    const rangeDataItem1 = axis.makeDataItem({
      value: 25,
      endValue: 45,
    });
    const range1 = axis.createAxisRange(rangeDataItem1);
    range1.get('axisFill')?.setAll({
      fill: am5.color(0xf97316),
      fillOpacity: 0.8,
      visible: true,
    });

    const rangeDataItem2 = axis.makeDataItem({
      value: 45,
      endValue: 55,
    });
    const range2 = axis.createAxisRange(rangeDataItem2);
    range2.get('axisFill')?.setAll({
      fill: am5.color(0xeab308),
      fillOpacity: 0.8,
      visible: true,
    });

    const rangeDataItem3 = axis.makeDataItem({
      value: 55,
      endValue: 75,
    });
    const range3 = axis.createAxisRange(rangeDataItem3);
    range3.get('axisFill')?.setAll({
      fill: am5.color(0x84cc16),
      fillOpacity: 0.8,
      visible: true,
    });

    const rangeDataItem4 = axis.makeDataItem({
      value: 75,
      endValue: 100,
    });
    const range4 = axis.createAxisRange(rangeDataItem4);
    range4.get('axisFill')?.setAll({
      fill: am5.color(0x10b981),
      fillOpacity: 0.8,
      visible: true,
    });

    const hand = am5radar.ClockHand.new(root, {
      pinRadius: am5.percent(10),
      radius: am5.percent(85),
      innerRadius: am5.percent(50),
      bottomWidth: 8,
      topWidth: 0,
    });

    hand.pin.setAll({
      fill: am5.color(0xe5e7eb),
      fillOpacity: 1,
    });

    hand.hand.setAll({
      fill: am5.color(0xe5e7eb),
      fillOpacity: 1,
    });

    const handDataItem = axis.makeDataItem({
      value: 50,
    });

    axis.createAxisRange(handDataItem);
    handDataItem.set('bullet', am5xy.AxisBullet.new(root, { sprite: hand }));
    handRef.current = hand;
    handDataItemRef.current = handDataItem;

    return () => {
      root.dispose();
    };
  }, []);

  useLayoutEffect(() => {
    if (!historyRef.current) return;

    const root = am5.Root.new(historyRef.current);
    root.setThemes([am5themes_Dark.new(root), createDarkTheme(root)]);
    historyRootRef.current = root;

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
        baseInterval: { timeUnit: 'day', count: 1 },
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

    const extremeFearRange = yAxis.createAxisRange(
      yAxis.makeDataItem({
        value: 0,
        endValue: 25,
      })
    );
    extremeFearRange.get('axisFill')?.setAll({
      fill: am5.color(0xef4444),
      fillOpacity: 0.1,
      visible: true,
    });

    const extremeGreedRange = yAxis.createAxisRange(
      yAxis.makeDataItem({
        value: 75,
        endValue: 100,
      })
    );
    extremeGreedRange.get('axisFill')?.setAll({
      fill: am5.color(0x10b981),
      fillOpacity: 0.1,
      visible: true,
    });

    const series = chart.series.push(
      am5xy.LineSeries.new(root, {
        name: 'Fear & Greed',
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: 'value',
        valueXField: 'timestamp',
        stroke: am5.color(0x3b82f6),
        fill: am5.color(0x3b82f6),
        tooltip: am5.Tooltip.new(root, {
          labelText: '{valueY}',
        }),
      })
    );

    series.strokes.template.setAll({
      strokeWidth: 2,
    });

    series.fills.template.setAll({
      fillOpacity: 0.2,
      visible: true,
    });

    const cursor = chart.set(
      'cursor',
      am5xy.XYCursor.new(root, {
        behavior: 'none',
      })
    );
    cursor.lineY.set('visible', false);

    historySeriesRef.current = series;

    return () => {
      root.dispose();
    };
  }, []);

  useEffect(() => {
    if (data && handDataItemRef.current) {
      handDataItemRef.current.animate({
        key: 'value',
        to: data.value,
        duration: 800,
        easing: am5.ease.out(am5.ease.cubic),
      });
    }
  }, [data]);

  useEffect(() => {
    if (history.length > 0 && historySeriesRef.current) {
      historySeriesRef.current.data.setAll(history);
    }
  }, [history]);

  if (!data) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6 shadow-lg">
        <div className="flex h-64 items-center justify-center">
          <div className="text-gray-500">Loading Fear & Greed Index...</div>
        </div>
      </div>
    );
  }

  const colors = getColor(data.value);

  return (
    <div className={`rounded-lg border border-gray-800 bg-gradient-to-br ${getGradient(data.value)} bg-gray-900 p-6 shadow-lg`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Fear & Greed Index</h3>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap ${colors.text} ${colors.bg}`}>
          {data.value_classification}
        </span>
      </div>

      <div className="mb-2">
        <div className="text-center text-5xl font-bold text-white">{data.value}</div>
      </div>

      <div ref={gaugeRef} className="h-40 w-full" />

      <div className="mb-4 mt-6">
        <h4 className="mb-2 text-sm font-semibold text-gray-400">30-Day Trend</h4>
        <div ref={historyRef} className="h-32 w-full" />
      </div>

      <div className="mt-4 text-xs text-gray-500">
        Data from Alternative.me
      </div>
    </div>
  );
}

export const FearGreedGauge = memo(FearGreedGaugeComponent);
