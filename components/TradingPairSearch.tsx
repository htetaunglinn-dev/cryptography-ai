'use client';

import { useState, useEffect, useMemo } from 'react';
import type { BinanceSymbolInfo } from '@/lib/services/binance';

interface TradingPairSearchProps {
  onSelect: (symbol: string) => void;
  onClose: () => void;
  excludedSymbols: string[];
}

export function TradingPairSearch({ onSelect, onClose, excludedSymbols }: TradingPairSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [pairs, setPairs] = useState<BinanceSymbolInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available trading pairs
  useEffect(() => {
    async function fetchPairs() {
      try {
        setLoading(true);
        const response = await fetch('/api/crypto/trading-pairs');
        if (!response.ok) {
          throw new Error('Failed to fetch trading pairs');
        }
        const data = await response.json();
        setPairs(data.pairs || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pairs');
      } finally {
        setLoading(false);
      }
    }

    fetchPairs();
  }, []);

  // Filter pairs based on search term and exclude already added symbols
  const filteredPairs = useMemo(() => {
    if (!searchTerm) {
      return pairs.filter((pair) => !excludedSymbols.includes(pair.symbol)).slice(0, 50);
    }

    const search = searchTerm.toUpperCase();
    return pairs
      .filter((pair) => {
        if (excludedSymbols.includes(pair.symbol)) return false;
        return (
          pair.symbol.includes(search) ||
          pair.baseAsset.includes(search)
        );
      })
      .slice(0, 50);
  }, [pairs, searchTerm, excludedSymbols]);

  const handleSelect = (symbol: string) => {
    onSelect(symbol);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-gray-900 border border-gray-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 p-4">
          <h2 className="text-lg font-semibold text-white">Add Cryptocurrency</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4">
          <input
            type="text"
            placeholder="Search by symbol or name (e.g., BTC, Bitcoin)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            autoFocus
          />
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-700 border-t-blue-500" />
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-400">
              <p>{error}</p>
            </div>
          ) : filteredPairs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No trading pairs found</p>
              {searchTerm && <p className="mt-1 text-sm">Try a different search term</p>}
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {filteredPairs.map((pair) => (
                <button
                  key={pair.symbol}
                  onClick={() => handleSelect(pair.symbol)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{pair.symbol}</div>
                      <div className="text-sm text-gray-400">
                        {pair.baseAsset} / {pair.quoteAsset}
                      </div>
                    </div>
                    <div className="text-gray-500">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 p-4">
          <p className="text-xs text-gray-500 text-center">
            Showing {filteredPairs.length} of {pairs.length - excludedSymbols.length} available pairs
          </p>
        </div>
      </div>
    </div>
  );
}
