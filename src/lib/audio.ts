
export interface SpeakOptions {
  text: string;
  apiKey: string;
  voice: string;
  volume: number;
  provider?: 'gemini' | 'openai' | 'kokoro';
  kokoroUrl?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
}

let audioCtx: AudioContext | null = null;

export async function speak({ text, apiKey, voice, volume, provider = 'gemini', kokoroUrl, onStart, onEnd, onError }: SpeakOptions) {
  try {
    if (!apiKey) throw new Error("API Key missing");
    
    onStart?.();

    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }

    if (provider === 'gemini') {
      const { GoogleGenAI, Modality } = await import("@google/genai");
      const { withRetry } = await import("@/lib/utils");
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await withRetry(() => ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice as any },
            },
          },
        },
      }));

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const dataView = new DataView(bytes.buffer);
        const float32Array = new Float32Array(len / 2);
        for (let i = 0; i < len / 2; i++) {
          float32Array[i] = dataView.getInt16(i * 2, true) / 32768;
        }

        const buffer = audioCtx.createBuffer(1, float32Array.length, 24000);
        buffer.getChannelData(0).set(float32Array);

        const source = audioCtx.createBufferSource();
        source.buffer = buffer;

        const gainNode = audioCtx.createGain();
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        source.onended = () => {
          onEnd?.();
        };

        source.start();
      } else {
        throw new Error("No audio data received from Gemini");
      }
    } else if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: voice.toLowerCase(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `OpenAI TTS failed: ${response.statusText}`);
      }

      const audioData = await response.arrayBuffer();
      const buffer = await audioCtx.decodeAudioData(audioData);

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;

      const gainNode = audioCtx.createGain();
      gainNode.gain.value = volume;

      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      source.onended = () => {
        onEnd?.();
      };

      source.start();
    } else if (provider === 'kokoro') {
      const response = await fetch('/api/tts/kokoro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice: voice || 'af_heart',
          apiUrl: kokoroUrl,
          apiKey: apiKey !== 'kokoro-internal' ? apiKey : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Kokoro TTS failed: ${response.statusText}`);
      }

      const audioData = await response.arrayBuffer();
      console.log(`Kokoro TTS: Received ${audioData.byteLength} bytes of audio data`);
      
      if (audioData.byteLength === 0) {
        throw new Error("Kokoro TTS returned empty audio data");
      }

      // Create a copy of the buffer because decodeAudioData detaches the original
      const audioDataCopy = audioData.slice(0);

      try {
        const buffer = await audioCtx.decodeAudioData(audioData);

        const source = audioCtx.createBufferSource();
        source.buffer = buffer;

        const gainNode = audioCtx.createGain();
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        source.onended = () => {
          onEnd?.();
        };

        source.start();
      } catch (decodeError) {
        console.error("Failed to decode Kokoro audio data:", decodeError);
        const textDecoder = new TextDecoder();
        // Use the copy here to avoid "detached ArrayBuffer" error
        const possibleErrorText = textDecoder.decode(audioDataCopy.slice(0, 1000));
        console.log("Possible error text in audio data:", possibleErrorText);
        
        if (possibleErrorText.includes("<!DOCTYPE html>") || possibleErrorText.includes("<html>")) {
          throw new Error("Received HTML instead of audio. The TTS service might be down or showing an error page.");
        }
        
        throw new Error(`Unable to decode audio data. The response might not be a valid audio file. Start of response: ${possibleErrorText.slice(0, 100)}...`);
      }
    }
  } catch (error: any) {
    console.error("TTS Error:", error);
    onError?.(error instanceof Error ? error : new Error(error.message || "Unknown error"));
  }
}
