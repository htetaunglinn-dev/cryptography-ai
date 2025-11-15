'use client';

import { memo } from 'react';
import { X } from 'lucide-react';
import type { CryptoPrice } from '@/types';
import { formatCurrency, formatPercentage, formatLargeNumber, getChangeColor } from '@/lib/utils';

interface PriceCardProps {
  price: CryptoPrice;
  isSelected: boolean;
  onClick: () => void;
  onRemove?: (symbol: string) => void;
  canRemove?: boolean;
}

function PriceCardComponent({ price, isSelected, onClick, onRemove, canRemove = true }: PriceCardProps) {
  const isPositive = price.changePercent24h >= 0;

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove && canRemove) {
      onRemove(price.symbol);
    }
  };

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`w-full rounded-lg border p-4 text-left transition relative group cursor-pointer ${
        isSelected
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-gray-800 bg-gray-900 hover:border-gray-700'
      }`}
    >
      {onRemove && (
        <button
          onClick={handleRemoveClick}
          disabled={!canRemove}
          className={`absolute top-2 right-2 p-1 rounded transition-opacity ${
            canRemove
              ? 'opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-gray-400 hover:text-red-400'
              : 'opacity-50 cursor-not-allowed text-gray-600'
          }`}
          title={canRemove ? 'Remove from watchlist' : 'Cannot remove last item'}
        >
          <X size={14} />
        </button>
      )}

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-300">
          {price.symbol.replace('USDT', '')}/USDT
        </h3>
        <span className={`text-xs font-medium ${getChangeColor(price.changePercent24h)}`}>
          {formatPercentage(price.changePercent24h)}
        </span>
      </div>

      <div className="mb-2">
        <div className="text-xl font-bold text-white">
          {formatCurrency(price.price)}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>24h Vol: {formatLargeNumber(price.volume24h)}</span>
        <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
          {isPositive ? '▲' : '▼'} {formatCurrency(Math.abs(price.change24h))}
        </span>
      </div>
    </div>
  );
}

// Memoize to optimize re-renders for real-time price updates
export const PriceCard = memo(PriceCardComponent);
