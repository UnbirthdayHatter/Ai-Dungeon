import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Wand2, Download, Upload, Plus, User, Sparkles, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { cn } from '@/lib/utils';

export function SetupAdventure() {
  const { 
    newRoleplay, 
    addMessage, 
    setSystemRules, 
    setContextAndRules, 
    setMood, 
    mood, 
    savedCharacters,
    addCharacterToAdventure,
    apiKey, 
    provider, 
    apiKeys 
  } = useStore();

  const [context, setContext] = useState('');
  const [adventureType, setAdventureType] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCharacterPopup, setShowCharacterPopup] = useState(false);

  const getApiKey = () => {
    if (provider === 'gemini' && apiKey) return apiKey;
    if (apiKeys.gemini) return apiKeys.gemini;
    return process.env.GEMINI_API_KEY || '';
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: getApiKey() });
      const prompt = `Generate a Blades in the Dark campaign based on the following:
      Mood/Tone: ${mood}
      Context/Rules: ${context}
      Adventure Type: ${adventureType}
      
      Return as JSON: { "setting": "...", "plotHook": "...", "initialScene": "..." }`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      
      const data = JSON.parse(response.text || '{}');
      
      newRoleplay(false);
      setSystemRules(`Setting: ${data.setting}\n\nPlot Hook: ${data.plotHook}`);
      setContextAndRules(`Initial Scene: ${data.initialScene}`);
      addMessage({
        role: 'assistant',
        content: `Adventure generated: ${data.setting}\n\n${data.plotHook}\n\n${data.initialScene}`,
      });
    } catch (e) {
      console.error(e);
      alert('Failed to generate adventure.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-transparent p-8 pt-20 md:pt-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-4 border-b border-zinc-800 pb-6">
          <div className="w-12 h-12 bg-indigo-900/30 border border-indigo-500/30 rounded-xl flex items-center justify-center">
            <Wand2 className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-3xl font-serif font-bold text-zinc-100">Setup Adventure</h2>
            <p className="text-zinc-500 mt-1">Describe your ideal campaign and let AI generate the world.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Mood / Tone (Optional)</label>
            <input
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100"
              placeholder="e.g., a sexy cyberpunk campaign"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Context and Rules (Optional)</label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 h-32"
              placeholder="e.g., No magic allowed, combat is lethal, always speak in archaic English..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Character for this Adventure</label>
            <div className="grid grid-cols-2 gap-4">
              <button className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-indigo-500 transition-colors">
                <Plus className="w-8 h-8 text-zinc-500" />
                <span className="font-medium text-zinc-100">New Character</span>
                <span className="text-xs text-zinc-500">Create a fresh sheet</span>
              </button>
              <button 
                onClick={() => setShowCharacterPopup(true)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-indigo-500 transition-colors"
              >
                <User className="w-8 h-8 text-zinc-500" />
                <span className="font-medium text-zinc-100">Existing Character</span>
                <span className="text-xs text-zinc-500">Select from saved</span>
              </button>
            </div>
          </div>

          {showCharacterPopup && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md space-y-4">
                <h3 className="text-xl font-bold text-zinc-100">Select Character</h3>
                <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                  {savedCharacters.map(char => (
                    <button
                      key={char.id}
                      onClick={() => {
                        addCharacterToAdventure(char.id);
                        setShowCharacterPopup(false);
                      }}
                      className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-left text-zinc-100"
                    >
                      {char.name}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setShowCharacterPopup(false)}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">What kind of adventure are you looking for?</label>
            <textarea
              value={adventureType}
              onChange={(e) => setAdventureType(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 h-32"
              placeholder="e.g., A dark fantasy campaign set in a cursed city where vampires rule the night, or a sci-fi space opera about smugglers trying to pay off a debt..."
            />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="flex gap-2">
            <button className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors">
              Save Settings
            </button>
            <button className="p-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors">
              <Download className="w-5 h-5" />
            </button>
            <button className="p-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors">
              <Upload className="w-5 h-5" />
            </button>
          </div>
          
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {isGenerating ? 'Generating...' : 'Generate Campaign'}
          </button>
          
          <p className="text-center text-xs text-zinc-500">
            Warning: This will overwrite your current System Rules and Lorebook, and clear the chat history.
          </p>
        </div>
      </div>
    </div>
  );
}
