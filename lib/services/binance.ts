import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import type { OHLCV, CryptoPrice, HistoricalData, TradingPair, TimeInterval } from '@/types';

const BINANCE_API_BASE = 'https://api.binance.com/api/v3';

export interface BinanceSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
}

export class BinanceService {
  private baseURL: string;
  private axiosInstance: AxiosInstance;

  constructor() {
    this.baseURL = BINANCE_API_BASE;

    // Create axios instance with retry configuration
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 8000, // 8 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CryptoAI/1.0)',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // Configure retry logic
    axiosRetry(this.axiosInstance, {
      retries: 2, // Retry up to 2 times
      retryDelay: (retryCount) => {
        console.log(`Retry attempt ${retryCount} for Binance API`);
        return retryCount * 1000; // Exponential backoff: 1s, 2s
      },
      retryCondition: (error) => {
        // Retry on network errors or 5xx server errors
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
               (error.response?.status ? error.response.status >= 500 : false);
      },
    });
  }

  /**
   * Get current price for a trading pair
   */
  async getCurrentPrice(symbol: TradingPair): Promise<CryptoPrice> {
    try {
      const [ticker24h, tickerPrice] = await Promise.all([
        this.axiosInstance.get('/ticker/24hr', {
          params: { symbol }
        }),
        this.axiosInstance.get('/ticker/price', {
          params: { symbol }
        }),
      ]);

      const data = ticker24h.data;

      return {
        symbol,
        price: parseFloat(tickerPrice.data.price),
        change24h: parseFloat(data.priceChange),
        changePercent24h: parseFloat(data.priceChangePercent),
        high24h: parseFloat(data.highPrice),
        low24h: parseFloat(data.lowPrice),
        volume24h: parseFloat(data.volume),
        lastUpdated: new Date(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorDetails = {
          status: error.response?.status,
          statusText: error.response?.statusText,
          code: error.code,
          message: error.message,
          url: error.config?.url,
          data: error.response?.data
        };
        console.error(`Binance API Error for ${symbol}:`, errorDetails);
        throw new Error(`Failed to fetch price for ${symbol}: ${error.message} (${error.code || 'unknown'})`);
      }
      console.error(`Error fetching price for ${symbol}:`, error);
      throw new Error(`Failed to fetch price for ${symbol}`);
    }
  }

  /**
   * Get historical OHLCV data
   */
  async getHistoricalData(
    symbol: TradingPair,
    interval: TimeInterval = '1h',
    limit: number = 100
  ): Promise<HistoricalData> {
    try {
      const response = await this.axiosInstance.get('/klines', {
        params: {
          symbol,
          interval,
          limit,
        }
      });

      const data: OHLCV[] = response.data.map((candle: number[]) => ({
        timestamp: candle[0],
        open: parseFloat(candle[1].toString()),
        high: parseFloat(candle[2].toString()),
        low: parseFloat(candle[3].toString()),
        close: parseFloat(candle[4].toString()),
        volume: parseFloat(candle[5].toString()),
      }));

      return {
        symbol,
        interval,
        data,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorDetails = {
          status: error.response?.status,
          statusText: error.response?.statusText,
          code: error.code,
          message: error.message,
          url: error.config?.url,
          data: error.response?.data
        };
        console.error(`Binance API Error for ${symbol} historical data:`, errorDetails);
        throw new Error(`Failed to fetch historical data for ${symbol}: ${error.message} (${error.code || 'unknown'})`);
      }
      console.error(`Error fetching historical data for ${symbol}:`, error);
      throw new Error(`Failed to fetch historical data for ${symbol}`);
    }
  }

  /**
   * Get multiple trading pairs at once
   */
  async getMultiplePrices(symbols: TradingPair[]): Promise<CryptoPrice[]> {
    try {
      const prices = await Promise.all(
        symbols.map((symbol) => this.getCurrentPrice(symbol))
      );
      return prices;
    } catch (error) {
      console.error('Error fetching multiple prices:', error);
      throw new Error('Failed to fetch multiple prices');
    }
  }

  /**
   * Get all available trading pairs from Binance
   */
  async getAvailablePairs(): Promise<BinanceSymbolInfo[]> {
    try {
      const response = await this.axiosInstance.get('/exchangeInfo');
      const symbols: BinanceSymbolInfo[] = response.data.symbols
        .filter((symbol: { status: string }) => symbol.status === 'TRADING')
        .map((symbol: { symbol: string; baseAsset: string; quoteAsset: string; status: string }) => ({
          symbol: symbol.symbol,
          baseAsset: symbol.baseAsset,
          quoteAsset: symbol.quoteAsset,
          status: symbol.status,
        }));
      return symbols;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorDetails = {
          status: error.response?.status,
          statusText: error.response?.statusText,
          code: error.code,
          message: error.message,
          url: error.config?.url,
          data: error.response?.data
        };
        console.error('Binance API Error fetching available pairs:', errorDetails);
        throw new Error(`Failed to fetch available trading pairs: ${error.message} (${error.code || 'unknown'})`);
      }
      console.error('Error fetching available pairs:', error);
      throw new Error('Failed to fetch available trading pairs');
    }
  }

  /**
   * Convert Binance interval to milliseconds
   */
  static intervalToMilliseconds(interval: TimeInterval): number {
    const intervals: Record<TimeInterval, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
    };
    return intervals[interval];
  }
}

// Export singleton instance
export const binanceService = new BinanceService();
