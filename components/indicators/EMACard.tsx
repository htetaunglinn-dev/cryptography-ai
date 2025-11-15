'use client';

import { memo } from 'react';
import { formatCurrency } from '@/lib/utils';

interface EMACardProps {
  ema: {
    ema9: number;
    ema21: number;
    ema50: number;
    ema200: number;
  };
  currentPrice: number;
}

function EMACardComponent({ ema, currentPrice }: EMACardProps) {
  const getTrend = () => {
    if (ema.ema9 > ema.ema21 && ema.ema21 > ema.ema50 && ema.ema50 > ema.ema200) {
      return { text: 'Strong ↑', color: 'text-green-500', bg: 'bg-green-500/20' };
    }
    if (ema.ema9 < ema.ema21 && ema.ema21 < ema.ema50 && ema.ema50 < ema.ema200) {
      return { text: 'Strong ↓', color: 'text-red-500', bg: 'bg-red-500/20' };
    }
    return { text: 'Mixed →', color: 'text-yellow-500', bg: 'bg-yellow-500/20' };
  };

  const trend = getTrend();
  const above200 = currentPrice > ema.ema200;

  const getBackgroundGradient = () => {
    if (trend.text === 'Strong ↑') return 'from-green-500/10 to-transparent';
    if (trend.text === 'Strong ↓') return 'from-red-500/10 to-transparent';
    return 'from-yellow-500/10 to-transparent';
  };

  return (
    <div className={`rounded-lg border border-gray-800 bg-gradient-to-br ${getBackgroundGradient()} bg-gray-900 p-6 shadow-lg`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">EMA Indicators</h3>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap ${trend.color} ${trend.bg}`}>
          {trend.text}
        </span>
      </div>

      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-400">EMA 9</span>
          <span className="text-lg font-bold text-amber-400">{formatCurrency(ema.ema9)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-400">EMA 21</span>
          <span className="text-lg font-bold text-purple-400">{formatCurrency(ema.ema21)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-400">EMA 50</span>
          <span className="text-lg font-bold text-pink-400">{formatCurrency(ema.ema50)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-400">EMA 200</span>
          <span className="text-lg font-bold text-cyan-400">{formatCurrency(ema.ema200)}</span>
        </div>
      </div>

      <div className="border-t border-gray-800 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-400">Price vs EMA200</span>
          <span className={`rounded-full px-3 py-1 text-sm font-bold whitespace-nowrap ${above200 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
            {above200 ? 'Above ↑' : 'Below ↓'}
          </span>
        </div>
      </div>
    </div>
  );
}

export const EMACard = memo(EMACardComponent);
