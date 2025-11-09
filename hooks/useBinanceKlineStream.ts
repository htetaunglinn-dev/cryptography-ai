'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BinanceWebSocketClient } from '@/lib/websocket/binance-client';
import { IndicatorCalculator } from '@/lib/indicators/client-calculator';
import type {
  OHLCV,
  TradingPair,
  TimeInterval,
  BinanceKlineStream,
  WebSocketMessage,
  ConnectionState,
  WebSocketError,
  AllIndicators,
} from '@/types';

interface UseBinanceKlineStreamResult {
  ohlcvData: OHLCV[];
  indicators: AllIndicators | null;
  isConnected: boolean;
  connectionState: ConnectionState;
  error: WebSocketError | null;
  reconnect: () => void;
}

const MAX_CANDLES = 200; // Maximum candles to keep in memory

/**
 * React hook for real-time candlestick data via Binance WebSocket
 * Subscribes to kline stream for a specific symbol and interval
 * Automatically recalculates indicators when new candles arrive
 */
export function useBinanceKlineStream(
  symbol: TradingPair,
  interval: TimeInterval,
  initialData: OHLCV[] = []
): UseBinanceKlineStreamResult {
  const [ohlcvData, setOhlcvData] = useState<OHLCV[]>(initialData);
  const [indicators, setIndicators] = useState<AllIndicators | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<WebSocketError | null>(null);
  const wsClientRef = useRef<BinanceWebSocketClient | null>(null);
  const lastCandleRef = useRef<number | null>(null);

  // Update initial data when it changes
  useEffect(() => {
    if (initialData.length === 0) {
      console.log('[KlineStream] No initial data provided');
      return;
    }

    console.log('[KlineStream] Setting initial data:', initialData.length, 'candles for', symbol);
    setOhlcvData(initialData);

    // Calculate initial indicators if we have enough data
    if (initialData.length >= 200) {
      console.log('[KlineStream] Calculating initial indicators for', symbol);
      const newIndicators = IndicatorCalculator.calculateAll(symbol, initialData);
      if (newIndicators) {
        console.log('[KlineStream] Initial indicators calculated successfully');
        setIndicators(newIndicators);
      } else {
        console.warn('[KlineStream] Failed to calculate initial indicators');
      }
    } else {
      console.warn('[KlineStream] Not enough data for indicators:', initialData.length, 'need 200');
      setIndicators(null);
    }
  }, [initialData, symbol]);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback(
    (message: unknown) => {
      try {
        const wsMessage = message as WebSocketMessage<BinanceKlineStream>;

        // Validate message structure
        if (!wsMessage.data || wsMessage.data.e !== 'kline') {
          console.warn('[KlineStream] Invalid message format:', message);
          return;
        }

        const klineData = wsMessage.data;
        const kline = klineData.k;

        // Validate symbol matches
        if (kline.s !== symbol) {
          console.warn('[KlineStream] Symbol mismatch:', kline.s, 'expected:', symbol);
          return;
        }

        // Validate interval matches
        if (kline.i !== interval) {
          console.warn('[KlineStream] Interval mismatch:', kline.i, 'expected:', interval);
          return;
        }

        // Convert Binance kline to OHLCV format
        const newCandle: OHLCV = {
          timestamp: kline.t,
          open: parseFloat(kline.o),
          high: parseFloat(kline.h),
          low: parseFloat(kline.l),
          close: parseFloat(kline.c),
          volume: parseFloat(kline.v),
        };

        setOhlcvData((prev) => {
          // Check for duplicate or out-of-order messages
          if (lastCandleRef.current === newCandle.timestamp && !kline.x) {
            // Same candle, update in place (forming candle)
            const updated = [...prev];
            if (updated.length > 0) {
              updated[updated.length - 1] = newCandle;
            }
            return updated;
          }

          if (kline.x) {
            // Candle is closed, append new candle
            lastCandleRef.current = newCandle.timestamp;
            const updated = [...prev, newCandle];

            // Limit to MAX_CANDLES to prevent memory leaks
            if (updated.length > MAX_CANDLES) {
              return updated.slice(updated.length - MAX_CANDLES);
            }

            // Recalculate indicators on completed candle
            if (updated.length >= 200) {
              const newIndicators = IndicatorCalculator.calculateAll(symbol, updated);
              setIndicators(newIndicators);
            }

            return updated;
          } else {
            // Candle is forming, update last candle
            const updated = [...prev];
            if (updated.length > 0) {
              updated[updated.length - 1] = newCandle;
            } else {
              // First candle
              updated.push(newCandle);
              lastCandleRef.current = newCandle.timestamp;
            }
            return updated;
          }
        });

        // Clear error on successful message
        setError(null);
      } catch (err) {
        console.error('[KlineStream] Error processing message:', err);
        setError({
          message: err instanceof Error ? err.message : 'Failed to process message',
          code: 'PROCESS_ERROR',
          timestamp: Date.now(),
        });
      }
    },
    [symbol, interval]
  );

  // Handle WebSocket errors
  const handleError = useCallback((wsError: WebSocketError) => {
    console.error('[KlineStream] WebSocket error:', wsError);
    setError(wsError);
  }, []);

  // Handle connection state changes
  const handleStateChange = useCallback((state: ConnectionState) => {
    console.log('[KlineStream] Connection state changed:', state);
    setConnectionState(state);
  }, []);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    console.log('[KlineStream] Manual reconnect triggered');
    setError(null);
    wsClientRef.current?.reconnect();
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    // Build stream name (e.g., 'btcusdt@kline_1h')
    const stream = `${symbol.toLowerCase()}@kline_${interval}`;

    console.log('[KlineStream] Initializing WebSocket for:', symbol, interval);

    // Create WebSocket client
    wsClientRef.current = new BinanceWebSocketClient({
      streams: [stream],
      onMessage: handleMessage,
      onError: handleError,
      onStateChange: handleStateChange,
    });

    // Connect
    wsClientRef.current.connect();

    // Reset last candle reference when symbol/interval changes
    lastCandleRef.current = null;

    // Cleanup on unmount or when symbol/interval changes
    return () => {
      console.log('[KlineStream] Cleaning up WebSocket connection');
      wsClientRef.current?.disconnect();
      wsClientRef.current = null;
    };
  }, [symbol, interval, handleMessage, handleError, handleStateChange]);

  return {
    ohlcvData,
    indicators,
    isConnected: connectionState === 'connected',
    connectionState,
    error,
    reconnect,
  };
}
