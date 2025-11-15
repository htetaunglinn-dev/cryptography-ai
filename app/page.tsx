'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import type { CryptoPrice, AllIndicators, ClaudeAnalysis, TradingPair, HistoricalData, OHLCV } from '@/types';
import type { FearGreedData, FearGreedHistoryPoint, FearGreedResponse } from '@/types/fear-greed';
import { Header } from '@/components/Header';
import { PriceCard } from '@/components/PriceCard';
import { RSICard, MACDCard, BollingerBandsCard, EMACard } from '@/components/indicators';
import { ClaudeInsightsPanel } from '@/components/ai';
import { CandlestickChart } from '@/components/charts';
import { TradingPairSearch } from '@/components/TradingPairSearch';
import { useBinanceTickerStream } from '@/hooks/useBinanceTickerStream';
import { useBinanceKlineStream } from '@/hooks/useBinanceKlineStream';
import { useIndicatorHistory } from '@/hooks/useIndicatorHistory';
import { loadWatchlist, addToWatchlist, removeFromWatchlist, isWatchlistFull, isWatchlistAtMinimum } from '@/lib/storage/watchlist';

export default function Home() {
  const { data: session, status } = useSession();
  const [watchlistPairs, setWatchlistPairs] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<TradingPair>('BTCUSDT');
  const [initialHistoricalData, setInitialHistoricalData] = useState<OHLCV[]>([]);
  const [analysis, setAnalysis] = useState<ClaudeAnalysis | null>(null);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [fearGreedData, setFearGreedData] = useState<FearGreedData | null>(null);
  const [fearGreedHistory, setFearGreedHistory] = useState<FearGreedHistoryPoint[]>([]);

  useEffect(() => {
    const pairs = loadWatchlist();
    setWatchlistPairs(pairs);
    if (pairs.length > 0) {
      setSelectedSymbol(pairs[0] as TradingPair);
    }
  }, []);

  // WebSocket hooks for real-time data
  const {
    prices,
    isConnected: isPricesConnected,
    error: pricesError,
    reconnect: reconnectPrices,
  } = useBinanceTickerStream(watchlistPairs as TradingPair[]);

  const {
    ohlcvData,
    indicators,
    isConnected: isChartConnected,
    error: chartError,
    reconnect: reconnectChart,
  } = useBinanceKlineStream(selectedSymbol, '1d', initialHistoricalData);

  const indicatorHistory = useIndicatorHistory(ohlcvData || [], indicators);

  // Fetch initial historical data via REST API
  const fetchHistoricalData = useCallback(async (symbol: TradingPair) => {
    try {
      setIsLoadingChart(true);
      const response = await fetch(`/api/crypto/historical?symbol=${symbol}&interval=1d&limit=200`);
      const data = await response.json();

      if (data.success) {
        setInitialHistoricalData(data.data.data);
      } else {
        setError(data.error || 'Failed to fetch historical data');
      }
    } catch (err) {
      console.error('Error fetching historical data:', err);
      setError('Failed to fetch historical data');
    } finally {
      setIsLoadingChart(false);
    }
  }, []);

  const fetchAnalysis = useCallback(async (symbol: TradingPair, forceRefresh = false) => {
    if (status !== 'authenticated') {
      setAnalysisError('Sign in to use AI analysis features');
      return;
    }

    try {
      setAnalysisError(null);
      setIsLoadingAnalysis(true);
      const response = await fetch('/api/analysis/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, interval: '1d', forceRefresh }),
      });
      const data = await response.json();

      if (data.success) {
        setAnalysis(data.data);
      } else {
        setAnalysisError(data.error || 'Failed to fetch analysis');
      }
    } catch (err) {
      console.error('Error fetching analysis:', err);
      setAnalysisError('Failed to fetch analysis');
    } finally {
      setIsLoadingAnalysis(false);
    }
  }, [status]);

  // Fetch initial historical data and analysis when symbol changes
  useEffect(() => {
    if (selectedSymbol) {
      fetchHistoricalData(selectedSymbol);
      if (status === 'authenticated') {
        fetchAnalysis(selectedSymbol);
      }
    }
  }, [selectedSymbol, fetchHistoricalData, fetchAnalysis, status]);

  // Update error state when WebSocket errors occur
  useEffect(() => {
    if (pricesError) {
      setError(`Price connection error: ${pricesError.message}`);
    } else if (chartError) {
      setError(`Chart connection error: ${chartError.message}`);
    } else {
      setError(null);
    }
  }, [pricesError, chartError]);

  // Fetch Fear & Greed Index data
  useEffect(() => {
    const fetchFearGreed = async () => {
      try {
        const response = await fetch('/api/fear-greed');
        const data: FearGreedResponse = await response.json();
        setFearGreedData(data.current);
        setFearGreedHistory(data.history);
      } catch (err) {
        console.error('Error fetching Fear & Greed data:', err);
      }
    };

    fetchFearGreed();
  }, []);

  const handleAddPair = useCallback((symbol: string) => {
    try {
      const updatedPairs = addToWatchlist(symbol);
      if (updatedPairs) {
        setWatchlistPairs(updatedPairs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add pair to watchlist');
    }
  }, []);

  const handleRemovePair = useCallback((symbol: string) => {
    try {
      const updatedPairs = removeFromWatchlist(symbol);
      if (updatedPairs) {
        setWatchlistPairs(updatedPairs);

        if (symbol === selectedSymbol && updatedPairs.length > 0) {
          setSelectedSymbol(updatedPairs[0] as TradingPair);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove pair from watchlist');
    }
  }, [selectedSymbol]);

  const currentPrice = prices.find((p) => p.symbol === selectedSymbol);

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      <Header />

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-7xl pb-4">
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-4">
              <p className="text-sm text-red-500">{error}</p>
              {(pricesError || chartError) && (
                <button
                  onClick={() => {
                    if (pricesError) reconnectPrices();
                    if (chartError) reconnectChart();
                  }}
                  className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                >
                  Reconnect
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Watchlist Sidebar */}
            <div className="lg:col-span-2">
              <div className="space-y-2">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-400">Watchlist</h2>
                  {isPricesConnected && (
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs text-green-500">Live</span>
                    </div>
                  )}
                </div>

                {/* Search Input */}
                <div className="mb-3">
                  <button
                    onClick={() => setShowSearchDialog(true)}
                    disabled={isWatchlistFull()}
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2.5 text-left text-sm text-gray-500 hover:border-gray-600 hover:bg-gray-800/80 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>
                      {isWatchlistFull() ? 'Watchlist full (10/10)' : 'Search to add pairs...'}
                    </span>
                  </button>
                </div>
                {prices.length === 0 ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="h-24 animate-pulse rounded-lg bg-gray-800"
                      />
                    ))}
                  </div>
                ) : (
                  prices.map((price) => (
                    <PriceCard
                      key={price.symbol}
                      price={price}
                      isSelected={price.symbol === selectedSymbol}
                      onClick={() => setSelectedSymbol(price.symbol as TradingPair)}
                      onRemove={handleRemovePair}
                      canRemove={!isWatchlistAtMinimum()}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-6">
              <div className="space-y-4">
                {/* Price Header & Chart */}
                <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white">
                        {selectedSymbol.replace('USDT', '')}/USDT
                      </h2>
                      {currentPrice && (
                        <div className="mt-1 flex items-baseline gap-3">
                          <span className="text-3xl font-bold text-white">
                            ${currentPrice.price.toFixed(2)}
                          </span>
                          <span
                            className={`text-sm font-medium ${
                              currentPrice.changePercent24h >= 0
                                ? 'text-green-500'
                                : 'text-red-500'
                            }`}
                          >
                            {currentPrice.changePercent24h >= 0 ? '+' : ''}
                            {currentPrice.changePercent24h.toFixed(2)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {isLoadingChart ? (
                    <div className="h-96 animate-pulse rounded-md bg-gray-800" />
                  ) : ohlcvData && ohlcvData.length > 0 ? (
                    <CandlestickChart data={ohlcvData} symbol={selectedSymbol} />
                  ) : (
                    <div className="h-96 flex items-center justify-center rounded-md bg-gray-800">
                      <p className="text-sm text-gray-400">No chart data available</p>
                    </div>
                  )}
                </div>

                {/* Technical Indicators */}
                <div className="grid grid-cols-2 gap-4">
                  {!indicators ? (
                    <>
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className="h-48 animate-pulse rounded-lg bg-gray-800"
                        />
                      ))}
                    </>
                  ) : (
                    <>
                      <RSICard
                        data={indicators.rsi}
                        history={indicatorHistory.rsiHistory}
                      />
                      <MACDCard
                        data={indicators.macd}
                        history={indicatorHistory.macdHistory}
                      />
                      <BollingerBandsCard
                        data={indicators.bollingerBands}
                        currentPrice={currentPrice?.price || 0}
                        history={indicatorHistory.bbHistory}
                      />
                      <EMACard
                        ema={indicators.ema}
                        currentPrice={currentPrice?.price || 0}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* AI Insights Sidebar */}
            <div className="lg:col-span-4">
              {status === 'unauthenticated' && (
                <div className="mb-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
                  <p className="text-sm font-medium text-yellow-500 mb-2">
                    Sign in to unlock AI features
                  </p>
                  <p className="text-xs text-gray-400 mb-3">
                    Get Claude AI-powered market analysis, pattern recognition, and risk assessment.
                  </p>
                  <Link
                    href="/auth/signin"
                    className="inline-block rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    Sign In
                  </Link>
                </div>
              )}

              {analysisError && status === 'authenticated' && (
                <div className="mb-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
                  <p className="text-sm font-medium text-yellow-500 mb-2">
                    {analysisError}
                  </p>
                  {analysisError.includes('API key') && (
                    <>
                      <p className="text-xs text-gray-400 mb-3">
                        Add your Anthropic API key to enable AI analysis.
                      </p>
                      <Link
                        href="/settings"
                        className="inline-block rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        Add API Key
                      </Link>
                    </>
                  )}
                </div>
              )}

              <ClaudeInsightsPanel
                analysis={analysis}
                isLoading={isLoadingAnalysis}
                onRefresh={() => fetchAnalysis(selectedSymbol, true)}
                fearGreedData={fearGreedData}
                fearGreedHistory={fearGreedHistory}
              />
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-gray-800 bg-black py-4">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <p className="text-xs text-gray-500">
            Data provided by Binance API • AI Analysis by Claude • Built with Next.js
          </p>
        </div>
      </footer>

      {showSearchDialog && (
        <TradingPairSearch
          onSelect={handleAddPair}
          onClose={() => setShowSearchDialog(false)}
          excludedSymbols={watchlistPairs}
        />
      )}
    </div>
  );
}
