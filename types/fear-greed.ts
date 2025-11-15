export type FearGreedClassification =
  | 'Extreme Fear'
  | 'Fear'
  | 'Neutral'
  | 'Greed'
  | 'Extreme Greed';

export interface FearGreedData {
  value: number;
  value_classification: FearGreedClassification;
  timestamp: string;
  time_until_update?: string;
}

export interface FearGreedHistoryPoint {
  value: number;
  value_classification: FearGreedClassification;
  timestamp: number;
}

export interface FearGreedResponse {
  current: FearGreedData;
  history: FearGreedHistoryPoint[];
}
