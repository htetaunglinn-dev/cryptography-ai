import { NextResponse } from 'next/server';
import type { FearGreedResponse, FearGreedData, FearGreedHistoryPoint, FearGreedClassification } from '@/types/fear-greed';

let cachedData: { data: FearGreedResponse; timestamp: number } | null = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000;

function getClassification(value: number): FearGreedClassification {
  if (value <= 25) return 'Extreme Fear';
  if (value <= 45) return 'Fear';
  if (value <= 55) return 'Neutral';
  if (value <= 75) return 'Greed';
  return 'Extreme Greed';
}

export async function GET() {
  try {
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return NextResponse.json(cachedData.data);
    }

    const response = await fetch('https://api.alternative.me/fng/?limit=30', {
      next: { revalidate: 86400 }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Fear & Greed data');
    }

    const data = await response.json();

    const current: FearGreedData = {
      value: parseInt(data.data[0].value),
      value_classification: data.data[0].value_classification,
      timestamp: data.data[0].timestamp,
      time_until_update: data.data[0].time_until_update
    };

    const history: FearGreedHistoryPoint[] = data.data.map((item: any) => ({
      value: parseInt(item.value),
      value_classification: getClassification(parseInt(item.value)),
      timestamp: parseInt(item.timestamp) * 1000
    }));

    const result: FearGreedResponse = {
      current,
      history
    };

    cachedData = {
      data: result,
      timestamp: Date.now()
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch Fear & Greed Index' },
      { status: 500 }
    );
  }
}
