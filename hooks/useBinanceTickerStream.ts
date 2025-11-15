'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BinanceWebSocketClient } from '@/lib/websocket/binance-client';
import type {
  CryptoPrice,
  TradingPair,
  BinanceTickerStream,
  WebSocketMessage,
  ConnectionState,
  WebSocketError,
} from '@/types';

interface UseBinanceTickerStreamResult {
  prices: CryptoPrice[];
  isConnected: boolean;
  connectionState: ConnectionState;
  error: WebSocketError | null;
  reconnect: () => void;
}

/**
 * React hook for real-time cryptocurrency price updates via Binance WebSocket
 * Subscribes to ticker streams for multiple trading pairs
 */
export function useBinanceTickerStream(symbols: TradingPair[]): UseBinanceTickerStreamResult {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<WebSocketError | null>(null);
  const wsClientRef = useRef<BinanceWebSocketClient | null>(null);

  // Convert Binance ticker message to CryptoPrice format
  const convertTickerToCryptoPrice = useCallback((ticker: BinanceTickerStream): CryptoPrice => {
    return {
      symbol: ticker.s,
      price: parseFloat(ticker.c),
      change24h: parseFloat(ticker.p),
      changePercent24h: parseFloat(ticker.P),
      high24h: parseFloat(ticker.h),
      low24h: parseFloat(ticker.l),
      volume24h: parseFloat(ticker.v),
      lastUpdated: new Date(ticker.E),
    };
  }, []);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback(
    (message: unknown) => {
      try {
        const wsMessage = message as WebSocketMessage<BinanceTickerStream>;

        // Validate message structure
        if (!wsMessage.data || wsMessage.data.e !== '24hrTicker') {
          console.warn('[TickerStream] Invalid message format:', message);
          return;
        }

        const ticker = wsMessage.data;
        const newPrice = convertTickerToCryptoPrice(ticker);

        // Update prices state - replace existing price for this symbol
        setPrices((prev) => {
          const existingIndex = prev.findIndex((p) => p.symbol === newPrice.symbol);

          if (existingIndex >= 0) {
            // Update existing price
            const updated = [...prev];
            updated[existingIndex] = newPrice;
            return updated;
          } else {
            // Add new price
            return [...prev, newPrice];
          }
        });

        // Clear error on successful message
        setError(null);
      } catch (err) {
        console.error('[TickerStream] Error processing message:', err);
        setError({
          message: err instanceof Error ? err.message : 'Failed to process message',
          code: 'PROCESS_ERROR',
          timestamp: Date.now(),
        });
      }
    },
    [convertTickerToCryptoPrice]
  );

  // Handle WebSocket errors
  const handleError = useCallback((wsError: WebSocketError) => {
    console.error('[TickerStream] WebSocket error:', wsError);
    setError(wsError);
  }, []);

  // Handle connection state changes
  const handleStateChange = useCallback((state: ConnectionState) => {
    console.log('[TickerStream] Connection state changed:', state);
    setConnectionState(state);
  }, []);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    console.log('[TickerStream] Manual reconnect triggered');
    setError(null);
    wsClientRef.current?.reconnect();
  }, []);

  // Filter prices to only include symbols in the current watchlist
  useEffect(() => {
    setPrices((prev) => prev.filter((price) => symbols.includes(price.symbol as TradingPair)));
  }, [symbols]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (symbols.length === 0) {
      console.warn('[TickerStream] No symbols provided');
      setPrices([]);
      return;
    }

    // Build stream names (e.g., 'btcusdt@ticker')
    const streams = symbols.map((symbol) => `${symbol.toLowerCase()}@ticker`);

    console.log('[TickerStream] Initializing WebSocket for symbols:', symbols);

    // Create WebSocket client
    wsClientRef.current = new BinanceWebSocketClient({
      streams,
      onMessage: handleMessage,
      onError: handleError,
      onStateChange: handleStateChange,
    });

    // Connect
    wsClientRef.current.connect();

    // Cleanup on unmount
    return () => {
      console.log('[TickerStream] Cleaning up WebSocket connection');
      wsClientRef.current?.disconnect();
      wsClientRef.current = null;
    };
  }, [symbols, handleMessage, handleError, handleStateChange]);

  return {
    prices,
    isConnected: connectionState === 'connected',
    connectionState,
    error,
    reconnect,
  };
}
