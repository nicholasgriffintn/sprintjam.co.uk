export class PokerRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map(); // Store WebSocket connections

    // Initialize room data with default values
    this.state.blockConcurrencyWhile(async () => {
      let roomData = await this.state.storage.get('roomData');
      if (!roomData) {
        roomData = {
          key: '',
          users: [],
          votes: {},
          showVotes: false,
          moderator: '',
        };
        await this.state.storage.put('roomData', roomData);
      }
    });
  }

  // Handle HTTP requests
  async fetch(request) {
    const url = new URL(request.url);

    // Initialize a new room
    if (url.pathname === '/initialize' && request.method === 'POST') {
      const { roomKey, moderator } = await request.json();

      return await this.state.blockConcurrencyWhile(async () => {
        let roomData = await this.state.storage.get('roomData');

        // Check if room is already initialized
        if (roomData.key) {
          return new Response(
            JSON.stringify({ error: 'Room already exists' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        // Initialize the room
        roomData = {
          key: roomKey,
          users: [moderator],
          votes: {},
          showVotes: false,
          moderator,
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
        );
      });
    }

    // Join an existing room
    if (url.pathname === '/join' && request.method === 'POST') {
      const { name } = await request.json();

      return await this.state.blockConcurrencyWhile(async () => {
        const roomData = await this.state.storage.get('roomData');

        // Check if room exists
        if (!roomData || !roomData.key) {
          return new Response(JSON.stringify({ error: 'Room not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Check if user already exists
        if (roomData.users.includes(name)) {
          return new Response(
            JSON.stringify({ error: 'User already exists in this room' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        // Add user to the room
        roomData.users.push(name);
        await this.state.storage.put('roomData', roomData);

        // Notify all connected clients about the new user
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
        );
      });
    }

    // Vote
    if (url.pathname === '/vote' && request.method === 'POST') {
      const { name, vote } = await request.json();

      return await this.state.blockConcurrencyWhile(async () => {
        const roomData = await this.state.storage.get('roomData');

        // Check if room exists
        if (!roomData || !roomData.key) {
          return new Response(JSON.stringify({ error: 'Room not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Check if user exists in the room
        if (!roomData.users.includes(name)) {
          return new Response(
            JSON.stringify({ error: 'User not found in this room' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          );
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
        );
      });
    }

    // Show votes (moderator only)
    if (url.pathname === '/showVotes' && request.method === 'POST') {
      const { name } = await request.json();

      return await this.state.blockConcurrencyWhile(async () => {
        const roomData = await this.state.storage.get('roomData');

        // Check if room exists
        if (!roomData || !roomData.key) {
          return new Response(JSON.stringify({ error: 'Room not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Check if user is the moderator
        if (roomData.moderator !== name) {
          return new Response(
            JSON.stringify({ error: 'Only the moderator can show votes' }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          );
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
        );
      });
    }

    // Reset votes (moderator only)
    if (url.pathname === '/resetVotes' && request.method === 'POST') {
      const { name } = await request.json();

      return await this.state.blockConcurrencyWhile(async () => {
        const roomData = await this.state.storage.get('roomData');

        // Check if room exists
        if (!roomData || !roomData.key) {
          return new Response(JSON.stringify({ error: 'Room not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Check if user is the moderator
        if (roomData.moderator !== name) {
          return new Response(
            JSON.stringify({ error: 'Only the moderator can reset votes' }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          );
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
        );
      });
    }

    return new Response('Not found', { status: 404 });
  }

  // Handle WebSocket connections
  async websocket(request) {
    // Accept the WebSocket connection
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    const url = new URL(request.url);
    const roomKey = url.searchParams.get('room');
    const userName = url.searchParams.get('name');

    await this.handleSession(server, roomKey, userName);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  // Handle an individual WebSocket session
  async handleSession(webSocket, roomKey, userName) {
    // Store the WebSocket connection
    const session = { webSocket, roomKey, userName };
    this.sessions.set(webSocket, session);

    // Set up event listeners
    webSocket.accept();

    // Send initial room data
    const roomData = await this.state.storage.get('roomData');
    webSocket.send(
      JSON.stringify({
        type: 'initialize',
        roomData,
      })
    );

    // Listen for messages from the client
    webSocket.addEventListener('message', async (msg) => {
      try {
        const data = JSON.parse(msg.data);

        if (data.type === 'vote') {
          await this.handleVote(userName, data.vote);
        } else if (data.type === 'showVotes') {
          await this.handleShowVotes(userName);
        } else if (data.type === 'resetVotes') {
          await this.handleResetVotes(userName);
        }
      } catch (err) {
        webSocket.send(
          JSON.stringify({
            type: 'error',
            error: err.message,
          })
        );
      }
    });

    // Handle disconnection
    webSocket.addEventListener('close', async () => {
      // Remove the session
      this.sessions.delete(webSocket);

      // Remove the user from the room if they were the last connection for that user
      const stillConnected = Array.from(this.sessions.values()).some(
        (s) => s.userName === userName
      );

      if (!stillConnected) {
        await this.state.blockConcurrencyWhile(async () => {
          const roomData = await this.state.storage.get('roomData');

          // Remove the user from the room
          roomData.users = roomData.users.filter((user) => user !== userName);

          // Remove their vote
          if (roomData.votes[userName]) {
            delete roomData.votes[userName];
          }

          await this.state.storage.put('roomData', roomData);

          // Notify remaining clients
          this.broadcast({
            type: 'userLeft',
            name: userName,
            roomData,
          });

          // Check if room is empty
          if (roomData.users.length === 0) {
            // Delete the room data after some time if no one rejoins
            setTimeout(async () => {
              const currentData = await this.state.storage.get('roomData');
              if (currentData.users.length === 0) {
                await this.state.storage.delete('roomData');
              }
            }, 1000 * 60 * 60); // 1 hour
          }

          // If moderator left, assign a new moderator
          if (userName === roomData.moderator && roomData.users.length > 0) {
            roomData.moderator = roomData.users[0];
            await this.state.storage.put('roomData', roomData);

            // Notify about new moderator
            this.broadcast({
              type: 'newModerator',
              name: roomData.moderator,
              roomData,
            });
          }
        });
      }
    });
  }

  // Handle vote messages
  async handleVote(userName, vote) {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.state.storage.get('roomData');

      // Record the vote
      roomData.votes[userName] = vote;
      await this.state.storage.put('roomData', roomData);

      // Notify all connected clients
      this.broadcast({
        type: 'vote',
        name: userName,
        roomData,
      });
    });
  }

  // Handle showVotes messages (moderator only)
  async handleShowVotes(userName) {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.state.storage.get('roomData');

      // Check if user is the moderator
      if (roomData.moderator !== userName) {
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
  async handleResetVotes(userName) {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.state.storage.get('roomData');

      // Check if user is the moderator
      if (roomData.moderator !== userName) {
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

  // Broadcast a message to all connected clients
  broadcast(message) {
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
