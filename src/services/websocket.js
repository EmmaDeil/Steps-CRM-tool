import { io } from 'socket.io-client';

// Get backend URL from environment
const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return this.socket;
    }

    this.socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket.id);
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    return this.socket;
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.listeners.clear();
      console.log('WebSocket disconnected');
    }
  }

  /**
   * Subscribe to security logs updates
   */
  subscribeToSecurityLogs() {
    if (!this.socket) {
      this.connect();
    }
    this.socket.emit('subscribe-security-logs');
    console.log('Subscribed to security logs');
  }

  /**
   * Unsubscribe from security logs updates
   */
  unsubscribeFromSecurityLogs() {
    if (this.socket) {
      this.socket.emit('unsubscribe-security-logs');
      console.log('Unsubscribed from security logs');
    }
  }

  /**
   * Listen for new audit log events
   * @param {Function} callback - Callback function to handle new logs
   * @returns {string} - Listener ID
   */
  onNewAuditLog(callback) {
    if (!this.socket) {
      this.connect();
    }

    const listenerId = `audit-log-${Date.now()}`;
    
    const wrappedCallback = (data) => {
      console.log('📨 New audit log received:', data);
      callback(data);
    };

    this.socket.on('new-audit-log', wrappedCallback);
    this.listeners.set(listenerId, { event: 'new-audit-log', callback: wrappedCallback });

    return listenerId;
  }

  /**
   * Remove a specific listener
   * @param {string} listenerId - The listener ID to remove
   */
  removeListener(listenerId) {
    const listener = this.listeners.get(listenerId);
    if (listener && this.socket) {
      this.socket.off(listener.event, listener.callback);
      this.listeners.delete(listenerId);
      console.log(`Removed listener: ${listenerId}`);
    }
  }

  /**
   * Remove all listeners for a specific event
   * @param {string} eventName - The event name
   */
  removeAllListeners(eventName) {
    if (this.socket) {
      this.socket.off(eventName);
      // Remove from our tracking map
      for (const [id, listener] of this.listeners.entries()) {
        if (listener.event === eventName) {
          this.listeners.delete(id);
        }
      }
      console.log(`Removed all listeners for: ${eventName}`);
    }
  }

  /**
   * Check if WebSocket is connected
   * @returns {boolean}
   */
  isConnected() {
    return this.connected && this.socket?.connected;
  }

  /**
   * Get the socket instance
   * @returns {Socket}
   */
  getSocket() {
    return this.socket;
  }
}

// Export singleton instance
const webSocketService = new WebSocketService();
export default webSocketService;
