import { NextResponse } from 'next/server';
import { binanceService } from '@/lib/services/binance';
import type { BinanceSymbolInfo } from '@/lib/services/binance';

// Cache the trading pairs for 24 hours
let cachedPairs: BinanceSymbolInfo[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export async function GET() {
  try {
    const now = Date.now();

    // Check if cache is valid
    if (cachedPairs && (now - cacheTimestamp) < CACHE_DURATION) {
      return NextResponse.json({
        pairs: cachedPairs,
        cached: true,
        cachedAt: new Date(cacheTimestamp).toISOString(),
      });
    }

    // Fetch fresh data
    const pairs = await binanceService.getAvailablePairs();

    // Update cache
    cachedPairs = pairs;
    cacheTimestamp = now;

    return NextResponse.json({
      pairs,
      cached: false,
      cachedAt: new Date(cacheTimestamp).toISOString(),
    });
  } catch (error) {
    console.error('Error in trading-pairs API route:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch trading pairs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
