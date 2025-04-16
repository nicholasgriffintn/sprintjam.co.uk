declare const WebSocketPair: {
  new(): { 0: WebSocket; 1: WebSocket };
};

import type { DurableObjectState, WebSocket, Response as CfResponse } from '@cloudflare/workers-types';
import type { Env } from './index';

const VOTING_OPTIONS = ['1', '2', '3', '5', '8', '13', '21', '?'];

interface RoomData {
  key: string;
  users: string[];
  votes: Record<string, string | number>;
  showVotes: boolean;
  moderator: string;
  connectedUsers: Record<string, boolean>; // Track user connection status
  settings: {
    estimateOptions: (string | number)[];
    allowOthersToShowEstimates: boolean;
    allowOthersToDeleteEstimates: boolean;
    allowOthersToClearUsers: boolean;
    showTimer: boolean;
    showUserPresence: boolean;
    showAverage: boolean;
    showMedian: boolean;
  };
}

interface BroadcastMessage {
  type: string;
  [key: string]: unknown;
}

interface SessionInfo {
  webSocket: WebSocket;
  roomKey: string;
  userName: string;
}

export class PokerRoom {
  state: DurableObjectState;
  env: Env;
  sessions: Map<WebSocket, SessionInfo>;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map(); // Store WebSocket connections

    // Initialize room data with default values
    this.state.blockConcurrencyWhile(async () => {
      let roomData = await this.state.storage.get<RoomData>('roomData');
      if (!roomData) {
        roomData = {
          key: '',
          users: [],
          votes: {},
          showVotes: false,
          moderator: '',
          connectedUsers: {},
          settings: {
            estimateOptions: VOTING_OPTIONS,
            allowOthersToShowEstimates: true,
            allowOthersToDeleteEstimates: true,
            allowOthersToClearUsers: true,
            showTimer: false,
            showUserPresence: false,
            showAverage: false,
            showMedian: false,
          }
        };
        await this.state.storage.put('roomData', roomData);
      } else if (!roomData.connectedUsers) {
        // Initialize connectedUsers for existing rooms
        roomData.connectedUsers = {};
        // Set all users as disconnected by default
        for (const user of roomData.users) {
          roomData.connectedUsers[user] = false;
        }
        await this.state.storage.put('roomData', roomData);
      }
    });
  }

  // Handle HTTP requests and WebSocket upgrades
  async fetch(request: Request): Promise<CfResponse> {
    const url = new URL(request.url);

    // Handle WebSocket upgrade requests
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader === 'websocket') {
      const roomKey = url.searchParams.get('room');
      const userName = url.searchParams.get('name');

      if (!roomKey || !userName) {
        return new Response('Missing room key or user name', { status: 400 }) as unknown as CfResponse;
      }

      // Create the WebSocket pair for the client and server
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

      // Start handling the WebSocket session
      await this.handleSession(server, roomKey, userName);

      // Return the response to establish the WebSocket connection
      return new Response(null, { status: 101, webSocket: client } as unknown as CfResponse) as unknown as CfResponse;
    }

    // Initialize a new room
    if (url.pathname === '/initialize' && request.method === 'POST') {
      const { roomKey, moderator } = await request.json() as { roomKey: string; moderator: string };

      return await this.state.blockConcurrencyWhile(async () => {
        let roomData = await this.state.storage.get<RoomData>('roomData');

        // Check if room exists before checking key
        if (!roomData) {
          // TODO: Handle case where roomData is not found during initialization attempt
          // This scenario might need specific logic depending on requirements,
          // maybe return an error or proceed with initialization.
          // For now, let's assume initialization proceeds if roomData is null/undefined.
        } else if (roomData.key) {
          return new Response(
            JSON.stringify({ error: 'Room already exists' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          ) as unknown as CfResponse;
        }

        // Initialize the room
        roomData = {
          key: roomKey,
          users: [moderator],
          votes: {},
          showVotes: false,
          moderator,
          connectedUsers: { [moderator]: true },
          settings: {
            estimateOptions: VOTING_OPTIONS,
            allowOthersToShowEstimates: true,
            allowOthersToDeleteEstimates: true,
            allowOthersToClearUsers: true,
            showTimer: false,
            showUserPresence: false,
            showAverage: false,
            showMedian: false,
          }
        };

        await this.state.storage.put('roomData', roomData);

        return new Response(
          JSON.stringify({
            success: true,
            room: roomData,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        ) as unknown as CfResponse;
      });
    }

    // Join an existing room
    if (url.pathname === '/join' && request.method === 'POST') {
      const { name } = await request.json() as { name: string };

      return await this.state.blockConcurrencyWhile(async () => {
        const roomData = await this.state.storage.get<RoomData>('roomData');

        // Check if room exists
        if (!roomData || !roomData.key) {
          return new Response(JSON.stringify({ error: 'Room not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }) as unknown as CfResponse;
        }

        // Ensure connectedUsers exists
        if (!roomData.connectedUsers) {
          roomData.connectedUsers = {};
          for (const user of roomData.users) {
            roomData.connectedUsers[user] = false;
          }
        }

        // Add user to the room if they're not already there
        if (!roomData.users.includes(name)) {
          roomData.users.push(name);
        }
        
        // Mark user as connected
        roomData.connectedUsers[name] = true;
        
        await this.state.storage.put('roomData', roomData);

        // Notify all connected clients about the user joining
        this.broadcast({
          type: 'userJoined',
          name,
          roomData,
        });

        return new Response(
          JSON.stringify({
            success: true,
            room: roomData,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        ) as unknown as CfResponse;
      });
    }

    // Vote
    if (url.pathname === '/vote' && request.method === 'POST') {
      const { name, vote } = await request.json() as { name: string; vote: string | number };

      return await this.state.blockConcurrencyWhile(async () => {
        const roomData = await this.state.storage.get<RoomData>('roomData');

        // Check if room exists
        if (!roomData || !roomData.key) {
          return new Response(JSON.stringify({ error: 'Room not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }) as unknown as CfResponse;
        }

        // Check if user exists in the room
        if (!roomData.users.includes(name)) {
          return new Response(
            JSON.stringify({ error: 'User not found in this room' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          ) as unknown as CfResponse;
        }

        // Record the vote
        roomData.votes[name] = vote;
        await this.state.storage.put('roomData', roomData);

        // Notify all connected clients about the new vote
        this.broadcast({
          type: 'vote',
          name,
          roomData,
        });

        return new Response(
          JSON.stringify({
            success: true,
            room: roomData,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        ) as unknown as CfResponse;
      });
    }

    // Show votes (moderator only)
    if (url.pathname === '/showVotes' && request.method === 'POST') {
      const { name } = await request.json() as { name: string };

      return await this.state.blockConcurrencyWhile(async () => {
        const roomData = await this.state.storage.get<RoomData>('roomData');

        // Check if room exists
        if (!roomData || !roomData.key) {
          return new Response(JSON.stringify({ error: 'Room not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }) as unknown as CfResponse;
        }

        // Check if user is the moderator or if non-moderators are allowed to show votes
        if (roomData.moderator !== name && !roomData.settings.allowOthersToShowEstimates) {
          return new Response(
            JSON.stringify({ error: 'Only the moderator can show votes' }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          ) as unknown as CfResponse;
        }

        // Toggle showing votes
        roomData.showVotes = !roomData.showVotes;
        await this.state.storage.put('roomData', roomData);

        // Notify all connected clients
        this.broadcast({
          type: 'showVotes',
          showVotes: roomData.showVotes,
          roomData,
        });

        return new Response(
          JSON.stringify({
            success: true,
            room: roomData,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        ) as unknown as CfResponse;
      });
    }

    // Reset votes (moderator only)
    if (url.pathname === '/resetVotes' && request.method === 'POST') {
      const { name } = await request.json() as { name: string };

      return await this.state.blockConcurrencyWhile(async () => {
        const roomData = await this.state.storage.get<RoomData>('roomData');

        // Check if room exists
        if (!roomData || !roomData.key) {
          return new Response(JSON.stringify({ error: 'Room not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }) as unknown as CfResponse;
        }

        // Check if user is the moderator or if non-moderators are allowed to delete estimates
        if (roomData.moderator !== name && !roomData.settings.allowOthersToDeleteEstimates) {
          return new Response(
            JSON.stringify({ error: 'Only the moderator can reset votes' }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          ) as unknown as CfResponse;
        }

        // Reset votes and hide results
        roomData.votes = {};
        roomData.showVotes = false;
        await this.state.storage.put('roomData', roomData);

        // Notify all connected clients
        this.broadcast({
          type: 'resetVotes',
          roomData,
        });

        return new Response(
          JSON.stringify({
            success: true,
            room: roomData,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        ) as unknown as CfResponse;
      });
    }

    // Get room settings
    if (url.pathname === '/settings' && request.method === 'GET') {
      return await this.state.blockConcurrencyWhile(async () => {
        const roomData = await this.state.storage.get<RoomData>('roomData');

        // Check if room exists
        if (!roomData || !roomData.key) {
          return new Response(JSON.stringify({ error: 'Room not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }) as unknown as CfResponse;
        }

        return new Response(
          JSON.stringify({
            success: true,
            settings: roomData.settings,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        ) as unknown as CfResponse;
      });
    }

    // Update room settings (moderator only)
    if (url.pathname === '/settings' && request.method === 'PUT') {
      const { name, settings } = await request.json() as { 
        name: string; 
        settings: RoomData['settings']
      };

      return await this.state.blockConcurrencyWhile(async () => {
        const roomData = await this.state.storage.get<RoomData>('roomData');

        // Check if room exists
        if (!roomData || !roomData.key) {
          return new Response(JSON.stringify({ error: 'Room not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }) as unknown as CfResponse;
        }

        // Check if user is the moderator
        if (roomData.moderator !== name) {
          return new Response(
            JSON.stringify({ error: 'Only the moderator can update settings' }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          ) as unknown as CfResponse;
        }

        // Update settings
        roomData.settings = {
          ...roomData.settings,
          ...settings
        };
        await this.state.storage.put('roomData', roomData);

        // Notify all connected clients
        this.broadcast({
          type: 'settingsUpdated',
          settings: roomData.settings,
          roomData,
        });

        return new Response(
          JSON.stringify({
            success: true,
            settings: roomData.settings,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        ) as unknown as CfResponse;
      });
    }

    // Cast non-websocket response
    return new Response('Not found', { status: 404 }) as unknown as CfResponse;
  }

  // Handle an individual WebSocket session
  async handleSession(webSocket: WebSocket, roomKey: string, userName: string) {
    // Store the WebSocket connection
    const session = { webSocket, roomKey, userName };
    this.sessions.set(webSocket, session);

    // Set up event listeners
    webSocket.accept();

    // Update user connection status
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.state.storage.get<RoomData>('roomData');
      if (roomData) {
        // Ensure connectedUsers exists
        if (!roomData.connectedUsers) {
          roomData.connectedUsers = {};
          for (const user of roomData.users) {
            roomData.connectedUsers[user] = false;
          }
        }
        
        // Add user to the room if they're not already there
        if (!roomData.users.includes(userName)) {
          roomData.users.push(userName);
        }
        
        // Mark the user as connected
        roomData.connectedUsers[userName] = true;
        
        await this.state.storage.put('roomData', roomData);
        
        // Broadcast a more explicit message about user connection status
        this.broadcast({
          type: 'userConnectionStatus',
          user: userName,
          isConnected: true,
          roomData,
        });
      }
    });

    // Send initial room data
    const roomData = await this.state.storage.get<RoomData>('roomData');
    webSocket.send(
      JSON.stringify({
        type: 'initialize',
        roomData,
      })
    );

    // Listen for messages from the client
    webSocket.addEventListener('message', async (msg) => {
      try {
        // Ensure msg.data is a string before parsing
        const messageData = typeof msg.data === 'string' ? msg.data : new TextDecoder().decode(msg.data);
        const data = JSON.parse(messageData);

        if (data.type === 'vote') {
          await this.handleVote(userName, data.vote);
        } else if (data.type === 'showVotes') {
          await this.handleShowVotes(userName);
        } else if (data.type === 'resetVotes') {
          await this.handleResetVotes(userName);
        } else if (data.type === 'updateSettings') {
          await this.handleUpdateSettings(userName, data.settings);
        }
      } catch (err: unknown) {
        webSocket.send(
          JSON.stringify({
            type: 'error',
            error: err instanceof Error ? err.message : String(err),
          })
        );
      }
    });

    // Handle disconnection
    webSocket.addEventListener('close', async () => {
      // Remove the session
      this.sessions.delete(webSocket);

      // Check if the user has any other active connections
      const stillConnected = Array.from(this.sessions.values()).some(
        (s: SessionInfo) => s.userName === userName
      );

      if (!stillConnected) {
        await this.state.blockConcurrencyWhile(async () => {
          const roomData = await this.state.storage.get<RoomData>('roomData');

          // Ensure roomData exists before modifying
          if (roomData) {
            // Ensure connectedUsers exists
            if (!roomData.connectedUsers) {
              roomData.connectedUsers = {};
              for (const user of roomData.users) {
                roomData.connectedUsers[user] = false;
              }
            }
            
            // Mark the user as disconnected but keep them in the room
            roomData.connectedUsers[userName] = false;
            
            await this.state.storage.put('roomData', roomData);

            // Broadcast a more explicit message about user connection status
            this.broadcast({
              type: 'userConnectionStatus',
              user: userName,
              isConnected: false,
              roomData,
            });

            // If moderator left and there are still connected users, assign a new moderator
            if (userName === roomData.moderator) {
              const connectedUsers = roomData.users.filter(user => roomData.connectedUsers[user]);
              
              if (connectedUsers.length > 0) {
                roomData.moderator = connectedUsers[0];
                await this.state.storage.put('roomData', roomData);

                // Notify about new moderator
                this.broadcast({
                  type: 'newModerator',
                  name: roomData.moderator,
                  roomData,
                });
              }
            }
          }
        });
      }
    });
  }

  // Handle vote messages
  async handleVote(userName: string, vote: string | number) {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.state.storage.get<RoomData>('roomData');
      if (roomData) { // Check roomData exists
        // Record the vote
        roomData.votes[userName] = vote;
        await this.state.storage.put('roomData', roomData);

        // Notify all connected clients
        this.broadcast({
          type: 'vote',
          name: userName,
          roomData,
        });
      }
    });
  }

  // Handle showVotes messages (moderator only)
  async handleShowVotes(userName: string) {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.state.storage.get<RoomData>('roomData');
      if (!roomData) return; // Check roomData exists

      // Check if user is the moderator or if non-moderators are allowed to show votes
      if (roomData.moderator !== userName && !roomData.settings.allowOthersToShowEstimates) {
        return;
      }

      // Toggle showing votes
      roomData.showVotes = !roomData.showVotes;
      await this.state.storage.put('roomData', roomData);

      // Notify all connected clients
      this.broadcast({
        type: 'showVotes',
        showVotes: roomData.showVotes,
        roomData,
      });
    });
  }

  // Handle resetVotes messages (moderator only)
  async handleResetVotes(userName: string) {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.state.storage.get<RoomData>('roomData');
      if (!roomData) return; // Check roomData exists

      // Check if user is the moderator or if non-moderators are allowed to delete estimates
      if (roomData.moderator !== userName && !roomData.settings.allowOthersToDeleteEstimates) {
        return;
      }

      // Reset votes and hide results
      roomData.votes = {};
      roomData.showVotes = false;
      await this.state.storage.put('roomData', roomData);

      // Notify all connected clients
      this.broadcast({
        type: 'resetVotes',
        roomData,
      });
    });
  }

  // Handle updateSettings messages (moderator only)
  async handleUpdateSettings(userName: string, settings: Partial<RoomData['settings']>) {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.state.storage.get<RoomData>('roomData');
      if (!roomData) return; // Check roomData exists

      // Check if user is the moderator
      if (roomData.moderator !== userName) {
        return;
      }

      // Update settings
      roomData.settings = {
        ...roomData.settings,
        ...settings
      };
      await this.state.storage.put('roomData', roomData);

      // Notify all connected clients
      this.broadcast({
        type: 'settingsUpdated',
        settings: roomData.settings,
        roomData,
      });
    });
  }

  // Broadcast a message to all connected clients
  broadcast(message: BroadcastMessage) {
    const json = JSON.stringify(message);
    for (const session of this.sessions.values()) {
      try {
        session.webSocket.send(json);
      } catch (err) {
        // Ignore errors (the WebSocket might already be closed)
      }
    }
  }
}
