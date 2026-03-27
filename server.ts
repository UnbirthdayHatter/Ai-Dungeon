import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global error handlers to prevent process crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});

async function startServer() {
  console.log("Starting server...");
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  const presenceState = new Map<string, { typingUsers: Record<string, { isTyping: boolean; timestamp: number; name: string }>; isAIGenerating: boolean }>();
  const presenceClients = new Map<string, Set<express.Response>>();

  app.use(express.json());

  const getProviderApiKey = (provider: string, requestApiKey?: string) => {
    if (requestApiKey) return requestApiKey;
    switch (provider) {
      case 'gemini':
        return process.env.GEMINI_API_KEY || '';
      case 'deepseek':
        return process.env.DEEPSEEK_API_KEY || '';
      case 'openai':
        return process.env.OPENAI_API_KEY || '';
      case 'anthropic':
        return process.env.ANTHROPIC_API_KEY || '';
      case 'openrouter':
        return process.env.OPENROUTER_API_KEY || '';
      case 'custom':
        return process.env.CUSTOM_API_KEY || '';
      default:
        return '';
    }
  };

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const {
        provider = 'gemini',
        apiKey: requestApiKey,
        customEndpointUrl,
        systemPrompt = '',
        messages = [],
        responseMimeType,
        } = req.body || {};

      const apiKey = getProviderApiKey(provider, requestApiKey);

      if (!Array.isArray(messages)) {
        return res.status(400).json({ error: { message: 'messages must be an array' } });
      }

      if (!apiKey) {
        return res.status(400).json({ error: { message: `API key for ${provider} is missing.` } });
      }

      if (provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey });
        const result = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: messages.map((message: any) => ({
            role: message.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: message.content || '' }],
          })),
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.7,
            responseMimeType: responseMimeType || undefined,
          }
        });

        return res.json({ text: result?.text || '' });
      }

      let endpoint = '';
      let model = '';
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      let body: Record<string, unknown> = {};

      switch (provider) {
        case 'openai':
          endpoint = 'https://api.openai.com/v1/chat/completions';
          model = 'gpt-4o-mini';
          headers.Authorization = `Bearer ${apiKey.trim()}`;
          body = {
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages,
            ],
            temperature: 0.7,
            max_tokens: 1000,
          };
          break;
        case 'anthropic':
          endpoint = 'https://api.anthropic.com/v1/messages';
          model = 'claude-3-haiku-20240307';
          headers['x-api-key'] = apiKey.trim();
          headers['anthropic-version'] = '2023-06-01';
          body = {
            model,
            system: systemPrompt,
            messages,
            max_tokens: 1000,
            temperature: 0.7,
          };
          break;
        case 'openrouter':
          endpoint = 'https://openrouter.ai/api/v1/chat/completions';
          model = 'gryphe/mythomax-l2-13b';
          headers.Authorization = `Bearer ${apiKey.trim()}`;
          body = {
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages,
            ],
            temperature: 0.7,
            max_tokens: 1000,
          };
          break;
        case 'custom':
          endpoint = customEndpointUrl || process.env.CUSTOM_API_URL || '';
          model = 'default';
          headers.Authorization = `Bearer ${apiKey.trim()}`;
          body = {
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages,
            ],
            temperature: 0.7,
            max_tokens: 1000,
          };
          break;
        case 'deepseek':
        default:
          endpoint = 'https://api.deepseek.com/chat/completions';
          model = 'deepseek-chat';
          headers.Authorization = `Bearer ${apiKey.trim()}`;
          body = {
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages,
            ],
            temperature: 0.7,
            max_tokens: 1000,
          };
          break;
      }

      if (!endpoint) {
        return res.status(400).json({ error: { message: `Endpoint for ${provider} is missing.` } });
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return res.status(response.status).json({
          error: {
            message: data?.error?.message || data?.message || `${provider} request failed`,
            details: data,
          }
        });
      }

      const text = provider === 'anthropic'
        ? data?.content?.[0]?.text || ''
        : data?.choices?.[0]?.message?.content || '';

      return res.json({ text });
    } catch (error: any) {
      console.error("AI chat proxy exception:", error);
      return res.status(500).json({ error: { message: error.message || "Internal Server Error" } });
    }
  });

  app.post("/api/ai/image", async (req, res) => {
    try {
      const { prompt, apiKey: requestApiKey } = req.body || {};
      if (!prompt) {
        return res.status(400).json({ error: { message: 'prompt is required' } });
      }

      const apiKey = getProviderApiKey('gemini', requestApiKey);
      if (!apiKey) {
        return res.status(400).json({ error: { message: 'Gemini API key is missing.' } });
      }

      const ai = new GoogleGenAI({ apiKey });
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K",
          }
        }
      });

      for (const part of result.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          return res.json({
            imageUrl: `data:image/png;base64,${part.inlineData.data}`,
          });
        }
      }

      return res.status(502).json({ error: { message: 'Image generation returned no image data.' } });
    } catch (error: any) {
      console.error("AI image proxy exception:", error);
      return res.status(500).json({ error: { message: error.message || "Internal Server Error" } });
    }
  });

  const ensurePresenceRoom = (roleplayId: string) => {
    if (!presenceState.has(roleplayId)) {
      presenceState.set(roleplayId, { typingUsers: {}, isAIGenerating: false });
    }
    if (!presenceClients.has(roleplayId)) {
      presenceClients.set(roleplayId, new Set());
    }
    return {
      state: presenceState.get(roleplayId)!,
      clients: presenceClients.get(roleplayId)!,
    };
  };

  const broadcastPresence = (roleplayId: string) => {
    const room = ensurePresenceRoom(roleplayId);
    const payload = JSON.stringify(room.state);
    room.clients.forEach((client) => {
      client.write(`data: ${payload}\n\n`);
    });
  };

  // Health check at the top
  app.get("/api/health", (req, res) => {
    console.log("Health check requested");
    res.json({ status: "ok" });
  });

  app.get("/api/presence/stream/:roleplayId", (req, res) => {
    const { roleplayId } = req.params;
    const room = ensurePresenceRoom(roleplayId);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    room.clients.add(res);
    res.write(`data: ${JSON.stringify(room.state)}\n\n`);

    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      room.clients.delete(res);
      if (room.clients.size === 0 && Object.keys(room.state.typingUsers).length === 0 && !room.state.isAIGenerating) {
        presenceClients.delete(roleplayId);
        presenceState.delete(roleplayId);
      }
    });
  });

  app.post("/api/presence/update", (req, res) => {
    const { roleplayId, userId, name, isTyping, isAIGenerating } = req.body || {};
    if (!roleplayId) {
      return res.status(400).json({ error: { message: "roleplayId is required" } });
    }

    const room = ensurePresenceRoom(roleplayId);

    if (typeof isTyping === 'boolean' && userId) {
      if (isTyping) {
        room.state.typingUsers[userId] = {
          isTyping: true,
          timestamp: Date.now(),
          name: name || 'Player',
        };
      } else {
        delete room.state.typingUsers[userId];
      }
    }

    if (typeof isAIGenerating === 'boolean') {
      room.state.isAIGenerating = isAIGenerating;
    }

    broadcastPresence(roleplayId);
    res.json({ ok: true });
  });

  // Kokoro TTS Proxy
  app.post("/api/tts/kokoro", async (req, res) => {
    console.log("Received Kokoro TTS request");
    try {
      const { text, voice, apiUrl: reqApiUrl, apiKey: reqApiKey } = req.body;
      const apiUrl = reqApiUrl || process.env.KOKORO_API_URL || 'https://kokoro-api-lwtw.onrender.com/api/v1/';
      const apiKey = reqApiKey || process.env.KOKORO_API_KEY || 'my-super-secret-tts-key-123';

      console.log(`Calling Kokoro API: ${apiUrl} for voice: ${voice}`);
      
      if (typeof fetch === 'undefined') {
        throw new Error("Global fetch is not defined. Please ensure you are using Node.js 18 or higher.");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); 

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const body = {
          model: "model_q8f16",
          voice: voice || 'af_heart',
          input: text,
        };

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Kokoro API error (${response.status}):`, errorText || "No error body received");
          return res.status(response.status).json({ 
            error: { 
              message: `Kokoro API returned ${response.status}`,
              details: errorText || "The upstream service returned a 502 Bad Gateway. This usually means the Render service is offline or crashing."
            } 
          });
        }

        const contentType = response.headers.get('Content-Type');
        if (contentType && !contentType.includes('audio') && !contentType.includes('application/octet-stream')) {
          const text = await response.text();
          console.error(`Kokoro API returned non-audio content type (${contentType}):`, text.slice(0, 500));
          return res.status(500).json({ 
            error: { 
              message: "Upstream returned non-audio data", 
              details: text.slice(0, 200) 
            } 
          });
        }

        const audioBuffer = await response.arrayBuffer();
        if (audioBuffer.byteLength === 0) {
          throw new Error("Kokoro API returned empty audio data");
        }

        res.set('Content-Type', 'audio/mpeg');
        res.send(Buffer.from(audioBuffer));
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          return res.status(504).json({ error: { message: "Kokoro API request timed out after 60s" } });
        }
        throw fetchError;
      }
    } catch (error: any) {
      console.error("Kokoro Proxy Exception:", error);
      res.status(500).json({ error: { message: error.message || "Internal Server Error" } });
    }
  });

  // Global Error Handler for Express
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Express Error:', err);
    res.status(500).json({ 
      error: { 
        message: "Internal Server Error",
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      } 
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting Vite in middleware mode...");
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware attached");
    } catch (viteError) {
      console.error("Failed to create Vite server:", viteError);
      throw viteError;
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    console.log(`Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
