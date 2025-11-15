import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AllIndicators, CryptoPrice, ClaudeAnalysis } from '@/types';
import { createMarketAnalysisPrompt } from './prompts';

export class GeminiService {
  private client: GoogleGenerativeAI;
  private model: string = 'gemini-1.5-pro';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generateAnalysis(
    price: CryptoPrice,
    indicators: AllIndicators,
    timeframe: string = '1h'
  ): Promise<ClaudeAnalysis> {
    try {
      const prompt = createMarketAnalysisPrompt(price, indicators);
      const model = this.client.getGenerativeModel({ model: this.model });

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      });

      const response = result.response;
      const text = response.text();

      const analysisData = JSON.parse(text);

      const expirationMinutes = timeframe === '1d' ? 60 : 5;
      const expiresAt = Date.now() + expirationMinutes * 60 * 1000;

      return {
        symbol: price.symbol,
        timestamp: Date.now(),
        currentPrice: price.price,
        timeframe,
        expiresAt,
        ...analysisData,
      };
    } catch (error) {
      console.error('Error generating Gemini analysis:', error);
      throw new Error('Failed to generate market analysis');
    }
  }

  async generateQuickSignal(
    symbol: string,
    price: number,
    indicators: AllIndicators
  ): Promise<{
    signal: string;
    confidence: number;
    reasoning: string;
  }> {
    try {
      const prompt = `Provide a quick trading signal for ${symbol} at $${price}.
RSI: ${indicators.rsi.value} (${indicators.rsi.signal})
MACD Histogram: ${indicators.macd.histogram}
Price vs EMA200: ${price > indicators.ema.ema200 ? 'above' : 'below'}

Return JSON only: {"signal": "buy/sell/hold", "confidence": 0-100, "reasoning": "brief explanation"}`;

      const model = this.client.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 256,
        },
      });

      const response = result.response;
      const text = response.text();

      return JSON.parse(text);
    } catch (error) {
      console.error('Error generating quick signal:', error);
      throw new Error('Failed to generate trading signal');
    }
  }

  async analyzeSentiment(text: string, symbol: string): Promise<{
    sentiment: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    summary: string;
  }> {
    try {
      const prompt = `Analyze the sentiment of this crypto market text about ${symbol}:

"${text}"

Return JSON only: {"sentiment": "bullish/bearish/neutral", "confidence": 0-100, "summary": "brief summary"}`;

      const model = this.client.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 256,
        },
      });

      const response = result.response;
      const text = response.text();

      return JSON.parse(text);
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      throw new Error('Failed to analyze sentiment');
    }
  }
}

export const createGeminiService = (apiKey: string): GeminiService => {
  return new GeminiService(apiKey);
};
