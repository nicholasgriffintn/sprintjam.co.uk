// This file handles all communication with the backend API and WebSocket connections
import type { RoomData, VoteValue } from '../types';

const API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:5173/api'
  : 'https://sprintjam.co.uk/api';

const WS_BASE_URL = import.meta.env.DEV
  ? 'ws://localhost:5173/ws'
  : 'wss://sprintjam.co.uk/ws';

// Store the active WebSocket connection
let activeSocket: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const eventListeners: Record<string, ((data: any) => void)[]> = {};

export type WebSocketMessageType = 
  | 'initialize'
  | 'userJoined'
  | 'userLeft'
  | 'vote'
  | 'showVotes'
  | 'resetVotes'
  | 'newModerator'
  | 'error'
  | 'disconnected';

interface WebSocketMessage {
  type: WebSocketMessageType;
  roomData?: RoomData;
  error?: string;
}

/**
 * Create a new planning poker room
 * @param {string} name - The name of the user creating the room
 * @returns {Promise<RoomData>} - The room data
 */
export async function createRoom(name: string): Promise<RoomData> {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to create room: ${response.status}`);
    }

    const data = await response.json();
    return data.room;
  } catch (error) {
    console.error('Error creating room:', error);
    throw error;
  }
}

/**
 * Join an existing planning poker room
 * @param {string} name - The name of the user joining the room
 * @param {string} roomKey - The unique key for the room
 * @returns {Promise<RoomData>} - The room data
 */
export async function joinRoom(name: string, roomKey: string): Promise<RoomData> {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, roomKey }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to join room: ${response.status}`);
    }

    const data = await response.json();
    return data.room;
  } catch (error) {
    console.error('Error joining room:', error);
    throw error;
  }
}

/**
 * Connect to the WebSocket for real-time updates
 * @param {string} roomKey - The unique key for the room
 * @param {string} name - The name of the connected user
 * @param {function} onRoomUpdate - Callback function when room data is updated
 * @returns {WebSocket} - The WebSocket connection
 */
export function connectToRoom(
  roomKey: string, 
  name: string, 
  onRoomUpdate: (data: RoomData) => void
): WebSocket {
  // Close any existing connection
  if (activeSocket) {
    activeSocket.close();
  }

  // Reset reconnect attempts
  reconnectAttempts = 0;

  // Create a new WebSocket connection with proper error handling
  try {
    const socket = new WebSocket(
      `${WS_BASE_URL}?room=${encodeURIComponent(roomKey)}&name=${encodeURIComponent(name)}`
    );

    // Set up event handlers
    socket.onopen = () => {
      console.log('WebSocket connection established');
      reconnectAttempts = 0;
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        console.log('Received message:', data);

        // Handle different message types
        switch (data.type) {
          case 'initialize':
          case 'userJoined':
          case 'userLeft':
          case 'vote':
          case 'showVotes':
          case 'resetVotes':
          case 'newModerator':
            // Call the update callback with the new room data
            if (data.roomData) {
              onRoomUpdate(data.roomData);
            }

            // Also trigger any specific event listeners
            triggerEventListeners(data.type, data);
            break;

          case 'error':
            console.error('Server error:', data.error);
            triggerEventListeners('error', data);
            break;

          default:
            console.warn('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    socket.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);

      // Try to reconnect if not a normal closure
      if (event.code !== 1000 && event.code !== 1001) {
        handleReconnect(roomKey, name, onRoomUpdate);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      triggerEventListeners('error', { error: 'Connection error occurred' });
    };

    // Store the active socket
    activeSocket = socket;
    return socket;
  } catch (error) {
    console.error('Error creating WebSocket:', error);
    triggerEventListeners('error', { 
      error: error instanceof Error ? error.message : 'Failed to connect to server' 
    });
    throw error;
  }
}

/**
 * Handle reconnection logic with exponential backoff
 */
function handleReconnect(
  roomKey: string, 
  name: string, 
  onRoomUpdate: (data: RoomData) => void
): void {
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;

    // Exponential backoff with jitter
    const jitter = Math.random() * 0.3 + 0.85; // Random value between 0.85 and 1.15
    const delay = Math.min(
      RECONNECT_BASE_DELAY * 2 ** reconnectAttempts * jitter, 
      MAX_RECONNECT_DELAY
    );

    console.log(
      `Attempting to reconnect in ${Math.round(delay)}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
    );

    setTimeout(() => {
      connectToRoom(roomKey, name, onRoomUpdate);
    }, delay);
  } else {
    console.error('Max reconnection attempts reached');
    triggerEventListeners('disconnected', {
      error: 'Connection lost. Please refresh the page to reconnect.',
    });
  }
}

/**
 * Submit a vote
 * @param {VoteValue} vote - The vote value
 */
export function submitVote(vote: VoteValue): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error('Not connected to room');
  }

  activeSocket.send(
    JSON.stringify({
      type: 'vote',
      vote,
    })
  );
}

/**
 * Toggle showing/hiding votes (moderator only)
 */
export function toggleShowVotes(): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error('Not connected to room');
  }

  activeSocket.send(
    JSON.stringify({
      type: 'showVotes',
    })
  );
}

/**
 * Reset all votes (moderator only)
 */
export function resetVotes(): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error('Not connected to room');
  }

  activeSocket.send(
    JSON.stringify({
      type: 'resetVotes',
    })
  );
}

/**
 * Disconnect from the room
 */
export function disconnectFromRoom(): void {
  if (activeSocket) {
    activeSocket.close(1000, 'User left the room');
    activeSocket = null;
  }
}

/**
 * Add an event listener for specific WebSocket events
 * @param {WebSocketMessageType} event - The event type
 * @param {function} callback - The callback function
 */
export function addEventListener(
  event: WebSocketMessageType, 
  callback: (data: WebSocketMessage) => void
): void {
  if (!eventListeners[event]) {
    eventListeners[event] = [];
  }
  eventListeners[event].push(callback);
}

/**
 * Remove an event listener
 * @param {WebSocketMessageType} event - The event type
 * @param {function} callback - The callback function to remove
 */
export function removeEventListener(
  event: WebSocketMessageType, 
  callback: (data: any) => void
): void {
  if (!eventListeners[event]) return;

  eventListeners[event] = eventListeners[event].filter((cb) => cb !== callback);
}

/**
 * Trigger event listeners for a specific event
 * @param {WebSocketMessageType} event - The event type
 * @param {object} data - The event data
 */
function triggerEventListeners(event: WebSocketMessageType, data: any): void {
  if (!eventListeners[event]) return;

  for (const callback of eventListeners[event]) {
    try {
      callback(data);
    } catch (error) {
      console.error(`Error in ${event} event listener:`, error);
    }
  }
}

/**
 * Check if the WebSocket connection is active
 * @returns {boolean} - Whether the connection is active
 */
export function isConnected(): boolean {
  return activeSocket !== null && activeSocket.readyState === WebSocket.OPEN;
}

/**
 * Get the current connection state
 * @returns {number} - The WebSocket readyState
 */
export function getConnectionState(): number | null {
  return activeSocket ? activeSocket.readyState : null;
}