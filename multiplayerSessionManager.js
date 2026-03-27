const { v4: uuidv4 } = require('uuid');

class MultiplayerSessionManager {
    constructor() {
        this.sessions = new Map(); // sessionId -> { players: Set, state: {} }
    }

    createSession(hostPlayerId) {
        const sessionId = uuidv4();
        this.sessions.set(sessionId, {
            players: new Set([hostPlayerId]),
            state: {},
        });
        return sessionId;
    }

    joinSession(sessionId, playerId) {
        const session = this.sessions.get(sessionId);
        if (!session) return false;
        session.players.add(playerId);
        return true;
    }

    leaveSession(sessionId, playerId) {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        session.players.delete(playerId);
        if (session.players.size === 0) {
            this.sessions.delete(sessionId); // Clean up empty session
        }
    }

    getSessionState(sessionId) {
        const session = this.sessions.get(sessionId);
        return session ? session.state : null;
    }

    updateSessionState(sessionId, newState) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.state = { ...session.state, ...newState };
        }
    }

    listSessions() {
        return Array.from(this.sessions.keys());
    }

    getSessionPlayers(sessionId) {
        const session = this.sessions.get(sessionId);
        return session ? Array.from(session.players) : [];
    }
}

module.exports = new MultiplayerSessionManager();
