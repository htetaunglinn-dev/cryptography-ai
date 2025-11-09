import { ConnectionState, WebSocketError } from '@/types/crypto';

export interface BinanceWebSocketConfig {
  streams: string[];
  onMessage: (data: unknown) => void;
  onError: (error: WebSocketError) => void;
  onStateChange: (state: ConnectionState) => void;
}

export class BinanceWebSocketClient {
  private ws: WebSocket | null = null;
  private config: BinanceWebSocketConfig;
  private baseUrl = 'wss://stream.binance.com:9443';
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(config: BinanceWebSocketConfig) {
    this.config = config;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      console.log('[BinanceWS] Already connected or connecting');
      return;
    }

    this.updateState('connecting');

    try {
      // Build combined stream URL
      const streamString = this.config.streams.join('/');
      const url = `${this.baseUrl}/stream?streams=${streamString}`;

      console.log('[BinanceWS] Connecting to:', url);
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[BinanceWS] Connected successfully');
        this.updateState('connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.config.onMessage(message);
        } catch (error) {
          console.error('[BinanceWS] Failed to parse message:', error);
          this.config.onError({
            message: 'Failed to parse WebSocket message',
            code: 'PARSE_ERROR',
            timestamp: Date.now(),
          });
        }
      };

      this.ws.onerror = () => {
        console.error('[BinanceWS] WebSocket error occurred');
        this.updateState('error');
        this.config.onError({
          message: 'WebSocket connection error',
          code: 'CONNECTION_ERROR',
          timestamp: Date.now(),
        });
      };

      this.ws.onclose = (event) => {
        console.log('[BinanceWS] Connection closed:', event.code, event.reason);
        this.updateState('disconnected');

        // Don't auto-reconnect per requirements (show error, manual reconnect)
        if (!event.wasClean) {
          this.config.onError({
            message: `Connection closed unexpectedly: ${event.reason || 'Unknown reason'}`,
            code: `CLOSE_${event.code}`,
            timestamp: Date.now(),
          });
        }
      };
    } catch (error) {
      console.error('[BinanceWS] Failed to create WebSocket:', error);
      this.updateState('error');
      this.config.onError({
        message: error instanceof Error ? error.message : 'Failed to create WebSocket',
        code: 'CREATE_ERROR',
        timestamp: Date.now(),
      });
    }
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.updateState('disconnecting');
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  reconnect(): void {
    console.log('[BinanceWS] Manual reconnect triggered');
    this.disconnect();
    this.reconnectAttempts = 0;

    // Small delay before reconnecting
    setTimeout(() => {
      this.connect();
    }, 500);
  }

  updateStreams(streams: string[]): void {
    console.log('[BinanceWS] Updating streams:', streams);
    this.config.streams = streams;

    // Reconnect with new streams
    this.disconnect();
    setTimeout(() => {
      this.connect();
    }, 500);
  }

  getState(): ConnectionState {
    return this.connectionState;
  }

  private updateState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.config.onStateChange(state);
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.connectionState === 'connected';
  }
}
