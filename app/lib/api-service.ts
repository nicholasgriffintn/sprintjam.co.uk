// src/api/roomService.js
// This file handles all communication with the backend API and WebSocket connections

// API base URL - would be configured based on environment
const API_BASE_URL = 'https://sprintjam.co.uk/api';
const WS_BASE_URL = 'wss://sprintjam.co.uk/ws';

// Store the active WebSocket connection
let activeSocket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let eventListeners = {};

/**
 * Create a new planning poker room
 * @param {string} name - The name of the user creating the room
 * @returns {Promise<object>} - The room data
 */
export async function createRoom(name) {
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
      throw new Error(errorData.error || 'Failed to create room');
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
 * @returns {Promise<object>} - The room data
 */
export async function joinRoom(name, roomKey) {
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
      throw new Error(errorData.error || 'Failed to join room');
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
export function connectToRoom(roomKey, name, onRoomUpdate) {
  // Close any existing connection
  if (activeSocket) {
    activeSocket.close();
  }

  // Reset reconnect attempts
  reconnectAttempts = 0;

  // Create a new WebSocket connection
  const socket = new WebSocket(
    `${WS_BASE_URL}?room=${roomKey}&name=${encodeURIComponent(name)}`
  );

  // Set up event handlers
  socket.onopen = () => {
    console.log('WebSocket connection established');
    reconnectAttempts = 0;
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
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
          onRoomUpdate(data.roomData);

          // Also trigger any specific event listeners
          triggerEventListeners(data.type, data);
          break;

        case 'error':
          console.error('Server error:', data.error);
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
  };

  // Store the active socket
  activeSocket = socket;
  return socket;
}

/**
 * Handle reconnection logic
 */
function handleReconnect(roomKey, name, onRoomUpdate) {
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;

    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);

    console.log(
      `Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts})`
    );

    setTimeout(() => {
      connectToRoom(roomKey, name, onRoomUpdate);
    }, delay);
  } else {
    console.error('Max reconnection attempts reached');
    triggerEventListeners('disconnected', {
      error: 'Connection lost. Please refresh the page.',
    });
  }
}

/**
 * Submit a vote
 * @param {string} vote - The vote value
 */
export function submitVote(vote) {
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
export function toggleShowVotes() {
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
export function resetVotes() {
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
export function disconnectFromRoom() {
  if (activeSocket) {
    activeSocket.close(1000, 'User left the room');
    activeSocket = null;
  }
}

/**
 * Add an event listener for specific WebSocket events
 * @param {string} event - The event type
 * @param {function} callback - The callback function
 */
export function addEventListener(event, callback) {
  if (!eventListeners[event]) {
    eventListeners[event] = [];
  }
  eventListeners[event].push(callback);
}

/**
 * Remove an event listener
 * @param {string} event - The event type
 * @param {function} callback - The callback function to remove
 */
export function removeEventListener(event, callback) {
  if (!eventListeners[event]) return;

  eventListeners[event] = eventListeners[event].filter((cb) => cb !== callback);
}

/**
 * Trigger event listeners for a specific event
 * @param {string} event - The event type
 * @param {object} data - The event data
 */
function triggerEventListeners(event, data) {
  if (!eventListeners[event]) return;

  for (const callback of eventListeners[event]) {
    try {
      callback(data);
    } catch (error) {
      console.error(`Error in ${event} event listener:`, error);
    }
  }
}
