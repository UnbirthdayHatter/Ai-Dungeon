<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/38694450-973c-4b1d-9bdb-fafa8499d947

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy To Railway

This app can be deployed as a single Railway service. The Express server in [server.ts](./server.ts) serves the built Vite app in production and handles the `/api/*` routes for presence and TTS.

### Railway service settings

- Root Directory: project root
- Build Command: `npm run build`
- Start Command: `npm run start`

### Required environment variables

- `NODE_ENV=production`
- `GEMINI_API_KEY=...` or another provider key below

### Optional environment variables

- `KOKORO_API_URL=...`
- `KOKORO_API_KEY=...`
- `DEEPSEEK_API_KEY=...`
- `OPENAI_API_KEY=...`
- `ANTHROPIC_API_KEY=...`
- `OPENROUTER_API_KEY=...`
- `CUSTOM_API_KEY=...`
- `CUSTOM_API_URL=...`

### Notes

- Railway provides the `PORT` environment variable automatically. The server now reads that value in production.
- Firebase client config is loaded from [firebase-applet-config.json](./firebase-applet-config.json), so make sure that file contains the correct production project settings before deploying.
- Presence state for typing and AI generation is stored in server memory. It works well on a single Railway service, but it is not shared across multiple replicas.
- Text generation now runs through the Express server, so Railway environment variables can be used for Gemini, DeepSeek, OpenAI, Anthropic, OpenRouter, or a custom OpenAI-compatible endpoint.
