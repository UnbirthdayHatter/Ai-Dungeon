const express = require('express');
const app = express();
const multiplayerRoutes = require('./routes/multiplayer');

app.use('/api/multiplayer', multiplayerRoutes);