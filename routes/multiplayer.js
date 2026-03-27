const express = require('express');
const router = express.Router();
const sessionManager = require('../multiplayerSessionManager');

router.post('/create', (req, res) => {
    const { playerId } = req.body;
    const sessionId = sessionManager.createSession(playerId);
    res.json({ sessionId });
});

router.post('/join', (req, res) => {
    const { sessionId, playerId } = req.body;
    const success = sessionManager.joinSession(sessionId, playerId);
    res.json({ success });
});

router.post('/leave', (req, res) => {
    const { sessionId, playerId } = req.body;
    sessionManager.leaveSession(sessionId, playerId);
    res.json({ success: true });
});

router.get('/list', (req, res) => {
    res.json({ sessions: sessionManager.listSessions() });
});

router.get('/state/:sessionId', (req, res) => {
    const state = sessionManager.getSessionState(req.params.sessionId);
    res.json({ state });
});

module.exports = router;