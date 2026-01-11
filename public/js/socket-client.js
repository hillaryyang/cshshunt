/**
 * Socket.IO Client Wrapper
 * Provides a clean interface for real-time communication with the server
 */

class SocketClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.eventHandlers = new Map();
  }

  /**
   * Initialize socket connection
   */
  connect() {
    if (this.socket) {
      console.warn('Socket already connected');
      return;
    }

    this.socket = io();

    // Connection event handlers
    this.socket.on('connect', () => {
      console.log('✅ Connected to server');
      this.connected = true;
      this.emit('connectionStatusChanged', { connected: true });
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      this.connected = false;
      this.emit('connectionStatusChanged', { connected: false });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.emit('connectionError', { error });
    });

    return this;
  }

  /**
   * Register an event handler
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);

    // Register with socket.io if it's a server event
    if (this.socket && !this.isLocalEvent(event)) {
      this.socket.on(event, handler);
    }

    return this;
  }

  /**
   * Remove an event handler
   */
  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }

    if (this.socket && !this.isLocalEvent(event)) {
      this.socket.off(event, handler);
    }

    return this;
  }

  /**
   * Emit an event to the server
   */
  send(event, data) {
    if (!this.socket) {
      console.error('Socket not initialized');
      return;
    }

    if (!this.connected) {
      console.warn('Socket not connected, queueing message');
    }

    this.socket.emit(event, data);
    return this;
  }

  /**
   * Emit a local event (not sent to server)
   */
  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in handler for ${event}:`, error);
        }
      });
    }
    return this;
  }

  /**
   * Check if an event is local (not sent to server)
   */
  isLocalEvent(event) {
    const localEvents = ['connectionStatusChanged', 'connectionError'];
    return localEvents.includes(event);
  }

  /**
   * Register a one-time event handler
   */
  once(event, handler) {
    const wrappedHandler = (data) => {
      handler(data);
      this.off(event, wrappedHandler);
    };
    this.on(event, wrappedHandler);
    return this;
  }

  /**
   * Get connection status
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
    return this;
  }

  // ===== Game-specific helper methods =====

  /**
   * Register a team
   */
  registerTeam(teamName) {
    return this.send('registerTeam', { teamName });
  }

  /**
   * Submit an answer for a challenge
   */
  submitAnswer(teamName, challengeId, answer, incorrectAttempts = 0) {
    return this.send('submitAnswer', { teamName, challengeId, answer, incorrectAttempts });
  }

  /**
   * Submit an answer for a multi-part CTF challenge
   */
  submitAnswerWithPart(teamName, challengeId, answer, partIndex, incorrectAttempts = 0) {
    return this.send('submitAnswer', { teamName, challengeId, answer, incorrectAttempts, partIndex });
  }

  /**
   * Submit the final password
   */
  submitPassword(teamName, password) {
    return this.send('submitPassword', { teamName, password });
  }

  /**
   * Request current game state for a team
   */
  requestGameState(teamName) {
    return this.send('requestGameState', { teamName });
  }

  /**
   * Listen for registration result
   */
  onRegistrationResult(handler) {
    return this.on('registrationResult', handler);
  }

  /**
   * Listen for challenge result
   */
  onChallengeResult(handler) {
    return this.on('challengeResult', handler);
  }

  /**
   * Listen for password result
   */
  onPasswordResult(handler) {
    return this.on('passwordResult', handler);
  }

  /**
   * Listen for game state updates
   */
  onGameState(handler) {
    return this.on('gameState', handler);
  }

  /**
   * Listen for team victory announcements
   */
  onTeamVictory(handler) {
    return this.on('teamVictory', handler);
  }

  /**
   * Listen for connection status changes
   */
  onConnectionStatusChanged(handler) {
    return this.on('connectionStatusChanged', handler);
  }
}

// Create and export a singleton instance
const socketClient = new SocketClient();

// Auto-connect on page load
if (typeof window !== 'undefined') {
  socketClient.connect();
}
