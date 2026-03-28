<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AI Dungeon

A browser-based roleplaying sandbox for solo adventures and live multiplayer tables.

## Features

- Solo and multiplayer adventures with save/load support
- Character sheets, party management, and attached-character play
- Lorebook and world map tools with portrait and scene image generation
- Tagged chat flow for narrator, NPC, and player-style responses
- Realtime presence, typing indicators, host/admin/editor permissions, and join codes
- In-chat dice rolling, themed 3D dice trays, and custom experimental dice skins
- Setup flow for generating or customizing a campaign’s tone, rules, and visual style
- Sidebar adventure management with renaming, deletion, and separate solo/live handling

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Create `.env.local` and add at least one text provider key:
   `GEMINI_API_KEY=...`
3. Start the app:
   `npm run dev`

## Environment Variables

Required:

- One provider key for text generation, such as `GEMINI_API_KEY`

Optional:

- `OPENAI_API_KEY`
- `DEEPSEEK_API_KEY`
- `ANTHROPIC_API_KEY`
- `OPENROUTER_API_KEY`
- `CUSTOM_API_KEY`
- `CUSTOM_API_URL`
- `KOKORO_API_URL`
- `KOKORO_API_KEY`

## Deploy To Railway

This project can be deployed as a single Railway service. The Express server in [server.ts](c:/Users/unbir/Downloads/ai-dungeon-master%20(1)/server.ts) serves the built Vite app in production and handles the `/api/*` routes.

Railway settings:

- Root Directory: project root
- Build Command: `npm run build`
- Start Command: `npm run start`

Recommended production variables:

- `NODE_ENV=production`
- one provider key such as `GEMINI_API_KEY`

## Notes

- Firebase client config is loaded from [firebase-applet-config.json](c:/Users/unbir/Downloads/ai-dungeon-master%20(1)/firebase-applet-config.json), so production deployments should point to the correct Firebase project.
- Presence state for typing and generation status is currently stored in server memory, which works best on a single service instance.
- Text generation is routed through the Express server, so provider keys can stay in Railway environment variables instead of the client bundle.
