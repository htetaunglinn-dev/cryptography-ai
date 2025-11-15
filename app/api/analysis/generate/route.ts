import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { binanceService } from '@/lib/services';
import { IndicatorCalculator } from '@/lib/indicators';
import { createClaudeService } from '@/lib/ai';
import { createGeminiService } from '@/lib/ai/gemini';
import { Analysis, User } from '@/lib/db/models';
import { connectToDatabase } from '@/lib/db/connection';
import type { ApiResponse, ClaudeAnalysis, TradingPair, TimeInterval } from '@/types';

const ANALYSIS_CACHE_DURATION = 300; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Unauthorized. Please sign in to use AI analysis.',
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { symbol, interval = '1h', forceRefresh = false } = body as {
      symbol: TradingPair;
      interval?: TimeInterval;
      forceRefresh?: boolean;
    };

    if (!symbol) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Symbol is required',
        },
        { status: 400 }
      );
    }

    // Get user's API key and provider
    await connectToDatabase();
    const user = await User.findById(session.user.id).select('+anthropicApiKey aiProvider');

    if (!user || !user.anthropicApiKey) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'AI API key not configured. Please add your API key in settings.',
        },
        { status: 403 }
      );
    }

    const aiProvider = user.aiProvider || 'claude';

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await Analysis.findOne({ symbol })
        .sort({ timestamp: -1 })
        .lean();

      const now = Date.now();
      const cacheAge = cached ? now - cached.timestamp.getTime() : Infinity;

      if (cached && cacheAge < ANALYSIS_CACHE_DURATION * 1000) {
        const data: ClaudeAnalysis = {
          symbol: cached.symbol,
          timestamp: cached.timestamp.getTime(),
          signal: cached.signal,
          confidence: cached.confidence,
          currentPrice: cached.currentPrice,
          marketAnalysis: cached.marketAnalysis,
          patterns: cached.patterns,
          riskAssessment: cached.riskAssessment,
          suggestedEntry: cached.suggestedEntry,
          suggestedExit: cached.suggestedExit,
          stopLoss: cached.stopLoss,
          timeframe: cached.timeframe,
          expiresAt: cached.expiresAt.getTime(),
        };

        return NextResponse.json<ApiResponse<ClaudeAnalysis>>({
          success: true,
          data,
          cached: true,
          timestamp: now,
        });
      }
    }

    // Fetch fresh data
    const [price, historicalData] = await Promise.all([
      binanceService.getCurrentPrice(symbol),
      binanceService.getHistoricalData(symbol, interval, 200),
    ]);

    // Calculate indicators
    const indicators = IndicatorCalculator.calculateAll(symbol, historicalData.data);

    if (!indicators) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Failed to calculate indicators',
        },
        { status: 500 }
      );
    }

    // Generate AI analysis with user's API key
    let analysis: ClaudeAnalysis;
    if (aiProvider === 'gemini') {
      const geminiService = createGeminiService(user.anthropicApiKey);
      analysis = await geminiService.generateAnalysis(price, indicators, interval);
    } else {
      const claudeService = createClaudeService(user.anthropicApiKey);
      analysis = await claudeService.generateAnalysis(price, indicators, interval);
    }

    // Save to database
    await Analysis.create({
      ...analysis,
      timestamp: new Date(analysis.timestamp),
      expiresAt: new Date(analysis.expiresAt),
    });

    return NextResponse.json<ApiResponse<ClaudeAnalysis>>({
      success: true,
      data: analysis,
      cached: false,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error in /api/analysis/generate:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate analysis',
      },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
