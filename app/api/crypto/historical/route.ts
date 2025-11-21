import { NextRequest, NextResponse } from 'next/server';
import { binanceService } from '@/lib/services';
import { CryptoPrice } from '@/lib/db/models';
import { connectToDatabase } from '@/lib/db/connection';
import type { ApiResponse, HistoricalData, TradingPair, TimeInterval } from '@/types';

const CACHE_DURATION = parseInt(process.env.CACHE_DURATION || '300', 10); // 5 minutes default

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') as TradingPair;
    const interval = (searchParams.get('interval') || '1h') as TimeInterval;
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    if (!symbol) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Symbol parameter is required',
        },
        { status: 400 }
      );
    }

    const now = Date.now();
    let cached = null;

    // Try to get from cache first with timeout (only if MongoDB is configured)
    if (process.env.MONGODB_URI) {
      try {
        // Race between cache check and 3-second timeout
        const cachePromise = (async () => {
          await connectToDatabase();
          return await CryptoPrice.findOne({ symbol, interval });
        })();

        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 3000)
        );

        cached = await Promise.race([cachePromise, timeoutPromise]);

        if (cached) {
          const cacheAge = now - cached.updatedAt.getTime();

          // Return cached data if fresh enough
          if (cacheAge < CACHE_DURATION * 1000) {
            const data: HistoricalData = {
              symbol: cached.symbol,
              interval: cached.interval,
              data: cached.data,
            };

            return NextResponse.json<ApiResponse<HistoricalData>>({
              success: true,
              data,
              cached: true,
              timestamp: now,
            });
          }
        }
      } catch (dbError) {
        console.warn('MongoDB cache unavailable, fetching directly from Binance:', dbError);
      }
    }

    // Fetch fresh data from Binance
    const data = await binanceService.getHistoricalData(symbol, interval, limit);

    // Update cache asynchronously (don't wait for it)
    if (process.env.MONGODB_URI) {
      // Fire and forget cache update with timeout
      const updateCache = async () => {
        try {
          const updatePromise = CryptoPrice.findOneAndUpdate(
            { symbol, interval },
            { symbol, interval, data: data.data },
            { upsert: true, new: true }
          );

          const timeoutPromise = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), 3000)
          );

          await Promise.race([updatePromise, timeoutPromise]);
        } catch (dbError) {
          console.warn('Failed to update cache:', dbError);
        }
      };

      // Don't await - let it update in the background
      updateCache().catch((err) => console.warn('Cache update error:', err));
    }

    return NextResponse.json<ApiResponse<HistoricalData>>({
      success: true,
      data,
      cached: false,
      timestamp: now,
    });
  } catch (error) {
    console.error('Error in /api/crypto/historical:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch historical data',
      },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
