'use client';

import { useEffect, useRef, useState } from 'react';
import type { OHLCV } from '@/types';

interface CandlestickChartProps {
  data: OHLCV[];
  symbol: string;
}

export function CandlestickChart({ data, symbol }: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import('lightweight-charts').createChart> | null>(null);
  const seriesRef = useRef<ReturnType<ReturnType<typeof import('lightweight-charts').createChart>['addSeries']> | null>(null);
  const [isClient, setIsClient] = useState(false);
  const hasInitializedRef = useRef(false);

  // Only run on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize chart (only on symbol change or first load)
  useEffect(() => {
    if (!isClient || !chartContainerRef.current) return;

    // Dynamic import to avoid SSR issues
    import('lightweight-charts').then(({ createChart, ColorType, CandlestickSeries }) => {
      if (!chartContainerRef.current) return;

      // Clean up previous chart
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }

      // Reset initialization flag when chart is recreated
      hasInitializedRef.current = false;

      // Create chart
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#111827' },
          textColor: '#9ca3af',
        },
        grid: {
          vertLines: { color: '#1f2937' },
          horzLines: { color: '#1f2937' },
        },
        width: chartContainerRef.current.clientWidth,
        height: 400,
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
          borderColor: '#374151',
        },
        rightPriceScale: {
          borderColor: '#374151',
        },
      });

      chartRef.current = chart;

      // Add candlestick series using v5 API
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderDownColor: '#ef4444',
        borderUpColor: '#10b981',
        wickDownColor: '#ef4444',
        wickUpColor: '#10b981',
      });

      seriesRef.current = candlestickSeries;

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
          seriesRef.current = null;
        }
      };
    });
  }, [isClient, symbol]);

  // Update chart data (for live updates)
  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;

    // Transform data for chart
    const chartData = data.map((d) => ({
      time: Math.floor(d.timestamp / 1000),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    // Update chart data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    seriesRef.current.setData(chartData as any);

    // Fit content only on initial load, not on subsequent updates
    if (chartRef.current && !hasInitializedRef.current) {
      chartRef.current.timeScale().fitContent();
      hasInitializedRef.current = true;
    }
  }, [data]);

  if (!isClient) {
    return (
      <div className="w-full h-96 flex items-center justify-center rounded-md bg-gray-800">
        <p className="text-sm text-gray-400">Loading chart...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}
