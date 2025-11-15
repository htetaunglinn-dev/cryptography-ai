export type TradingSignal = 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';
export type MarketTrend = 'bullish' | 'bearish' | 'sideways';

export interface ChartPattern {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  description: string;
  targetPrice?: number;
  stopLoss?: number;
}

export interface MarketAnalysis {
  summary: string;
  trend: MarketTrend;
  momentum: string;
  keyLevels: {
    support: number[];
    resistance: number[];
  };
  insights: string[];
}

export interface RiskAssessment {
  level: RiskLevel;
  score: number; // 0-100
  factors: {
    volatility: number;
    liquidityRisk: number;
    technicalRisk: number;
  };
  recommendations: string[];
}

export interface ClaudeAnalysis {
  symbol: string;
  timestamp: number;
  signal: TradingSignal;
  confidence: number; // 0-100
  currentPrice: number;
  marketAnalysis: MarketAnalysis;
  patterns: ChartPattern[];
  riskAssessment: RiskAssessment;
  suggestedEntry?: number;
  suggestedExit?: number;
  stopLoss?: number;
  timeframe: string;
  expiresAt: number;
}

export type AIAnalysis = ClaudeAnalysis;
export type AIProvider = 'claude' | 'gemini';

export interface AnalysisRequest {
  symbol: string;
  interval: string;
  includePatterns?: boolean;
  includeRiskAssessment?: boolean;
}

export interface AnalysisResponse {
  success: boolean;
  data?: ClaudeAnalysis;
  error?: string;
  cached?: boolean;
}
