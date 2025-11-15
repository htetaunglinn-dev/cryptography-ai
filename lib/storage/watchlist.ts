const WATCHLIST_KEY = 'crypto-watchlist';
const DEFAULT_PAIRS = ['SOLUSDT', 'BTCUSDT', 'ETHUSDT', 'LTCUSDT'];
const MAX_WATCHLIST_SIZE = 10;
const MIN_WATCHLIST_SIZE = 1;

export interface WatchlistConfig {
  pairs: string[];
  lastUpdated: number;
}

/**
 * Load watchlist from sessionStorage
 * Returns default pairs if not found or invalid
 */
export function loadWatchlist(): string[] {
  if (typeof window === 'undefined') {
    return DEFAULT_PAIRS;
  }

  try {
    const stored = sessionStorage.getItem(WATCHLIST_KEY);
    if (!stored) {
      return DEFAULT_PAIRS;
    }

    const config: WatchlistConfig = JSON.parse(stored);

    // Validate the stored data
    if (!Array.isArray(config.pairs) || config.pairs.length === 0) {
      return DEFAULT_PAIRS;
    }

    return config.pairs;
  } catch (error) {
    console.error('Failed to load watchlist:', error);
    return DEFAULT_PAIRS;
  }
}

/**
 * Save watchlist to sessionStorage
 */
export function saveWatchlist(pairs: string[]): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const config: WatchlistConfig = {
      pairs,
      lastUpdated: Date.now(),
    };
    sessionStorage.setItem(WATCHLIST_KEY, JSON.stringify(config));
    return true;
  } catch (error) {
    console.error('Failed to save watchlist:', error);
    return false;
  }
}

/**
 * Add a trading pair to the watchlist
 * Returns updated list or null if failed
 */
export function addToWatchlist(pair: string): string[] | null {
  const currentPairs = loadWatchlist();

  // Check if already exists
  if (currentPairs.includes(pair)) {
    return currentPairs;
  }

  // Check max size
  if (currentPairs.length >= MAX_WATCHLIST_SIZE) {
    throw new Error(`Maximum watchlist size (${MAX_WATCHLIST_SIZE}) reached`);
  }

  const updatedPairs = [...currentPairs, pair];
  const success = saveWatchlist(updatedPairs);

  return success ? updatedPairs : null;
}

/**
 * Remove a trading pair from the watchlist
 * Returns updated list or null if failed
 */
export function removeFromWatchlist(pair: string): string[] | null {
  const currentPairs = loadWatchlist();

  // Check if pair exists in the list
  if (!currentPairs.includes(pair)) {
    return currentPairs;
  }

  // Check min size after confirming the pair exists
  if (currentPairs.length <= MIN_WATCHLIST_SIZE) {
    throw new Error(`Minimum watchlist size (${MIN_WATCHLIST_SIZE}) required`);
  }

  const updatedPairs = currentPairs.filter(p => p !== pair);
  const success = saveWatchlist(updatedPairs);

  return success ? updatedPairs : null;
}

/**
 * Check if watchlist is at maximum capacity
 */
export function isWatchlistFull(): boolean {
  return loadWatchlist().length >= MAX_WATCHLIST_SIZE;
}

/**
 * Check if watchlist is at minimum capacity
 */
export function isWatchlistAtMinimum(): boolean {
  return loadWatchlist().length <= MIN_WATCHLIST_SIZE;
}

/**
 * Get watchlist limits
 */
export function getWatchlistLimits() {
  return {
    max: MAX_WATCHLIST_SIZE,
    min: MIN_WATCHLIST_SIZE,
  };
}
