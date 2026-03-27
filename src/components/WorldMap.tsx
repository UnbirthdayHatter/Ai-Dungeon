import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Map as MapIcon, Navigation, MapPin, Search, Plus, Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth } from '../firebase';

interface Location {
  id: string;
  name: string;
  description: string;
  type: 'city' | 'dungeon' | 'landmark' | 'wilderness';
  coordinates: { x: number; y: number };
  imageUrl?: string;
}

export function WorldMap() {
  const { 
    lorebook, 
    updateLoreEntry, 
    isHost,
    currentRoleplayId,
    userRoleplays,
    joinedRoleplays,
    refreshRoleplayCollections
  } = useStore();
  
  const activeRoleplay = [...userRoleplays, ...joinedRoleplays].find(rp => rp.id === currentRoleplayId);
  const canEdit = isHost || activeRoleplay?.admins?.includes(auth.currentUser?.uid || '') || activeRoleplay?.editors?.includes(auth.currentUser?.uid || '');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isGeneratingMap, setIsGeneratingMap] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  useEffect(() => {
    if (currentRoleplayId) {
      refreshRoleplayCollections(currentRoleplayId);
    }
  }, [currentRoleplayId, refreshRoleplayCollections]);

  // Derive locations from lorebook entries that are tagged as locations
  const locations: Location[] = lorebook
    .filter(entry => entry.category.toLowerCase() === 'location' || entry.category.toLowerCase() === 'place')
    .map((entry, idx) => ({
      id: entry.id,
      name: entry.name,
      description: entry.description,
      type: entry.name.toLowerCase().includes('city') ? 'city' : 
            entry.name.toLowerCase().includes('crypt') || entry.name.toLowerCase().includes('dungeon') ? 'dungeon' :
            entry.name.toLowerCase().includes('forest') || entry.name.toLowerCase().includes('mountain') ? 'wilderness' : 'landmark',
      coordinates: entry.coordinates || { 
        x: 20 + (idx * 15) % 60, 
        y: 20 + (idx * 20) % 60 
      },
      imageUrl: entry.imageUrl || entry.avatarUrl
    }));

  const handleGenerateImage = async (location: Location) => {
    if (!canEdit) return;
    setIsGeneratingImage(true);
    try {
      const response = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `A high-quality fantasy landscape painting of ${location.name}. ${location.description}. Epic scale, detailed environment, cinematic lighting.`,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.imageUrl) {
        throw new Error(data?.error?.message || 'Failed to generate location image.');
      }
      const imageUrl = data.imageUrl as string;
      updateLoreEntry(location.id, { imageUrl });
      setSelectedLocation(prev => prev ? { ...prev, imageUrl } : null);
    } catch (error) {
      console.error('Error generating location image:', error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <MapIcon className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-zinc-100">World Map</h2>
            <p className="text-xs text-zinc-500 uppercase tracking-widest">Explore the Realm</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Map Area */}
        <div className="flex-1 relative bg-zinc-900 overflow-hidden group">
          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(circle, #3f3f46 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          
          {/* Map Content */}
          <div className="absolute inset-0 p-8">
            {locations.length > 0 ? (
              <div className="relative w-full h-full border border-zinc-800 rounded-2xl bg-zinc-950/50 overflow-hidden shadow-inner">
                {/* Compass Rose */}
                <div className="absolute top-4 right-4 opacity-20">
                  <Navigation className="w-12 h-12 text-zinc-400 rotate-45" />
                </div>

                {/* Location Pins */}
                {locations.map((loc, idx) => (
                  <button
                    key={`${loc.id}-${idx}`}
                    onClick={() => setSelectedLocation(loc)}
                    className={cn(
                      "absolute group/pin transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2",
                      selectedLocation?.id === loc.id ? "z-20 scale-125" : "z-10 hover:scale-110"
                    )}
                    style={{ left: `${loc.coordinates.x}%`, top: `${loc.coordinates.y}%` }}
                  >
                    <div className={cn(
                      "p-2 rounded-full border-2 shadow-lg transition-colors",
                      selectedLocation?.id === loc.id 
                        ? "bg-amber-500 border-white text-zinc-950" 
                        : "bg-zinc-800 border-zinc-700 text-amber-500 group-hover/pin:border-amber-500"
                    )}>
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className={cn(
                      "absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-300 whitespace-nowrap opacity-0 group-hover/pin:opacity-100 transition-opacity pointer-events-none shadow-xl",
                      selectedLocation?.id === loc.id && "opacity-100 text-amber-500"
                    )}>
                      {loc.name}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="p-6 bg-zinc-800/50 rounded-full mb-4">
                  <Search className="w-12 h-12 text-zinc-600" />
                </div>
                <h3 className="text-lg font-serif font-bold text-zinc-400">Terra Incognita</h3>
                <p className="text-sm text-zinc-600 max-w-xs mt-2">
                  No locations have been discovered yet. Explore the world and add places to your lorebook to see them on the map.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="w-80 border-l border-zinc-800 bg-zinc-900/30 overflow-y-auto">
          {selectedLocation ? (
            <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {selectedLocation.imageUrl ? (
                <div className="aspect-video rounded-xl overflow-hidden border border-zinc-800 shadow-lg relative group">
                  <img 
                    src={selectedLocation.imageUrl} 
                    alt={selectedLocation.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {canEdit && (
                    <button
                      onClick={() => handleGenerateImage(selectedLocation)}
                      disabled={isGeneratingImage}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                    >
                      {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Regenerate
                    </button>
                  )}
                </div>
              ) : (
                canEdit ? (
                  <button
                    onClick={() => handleGenerateImage(selectedLocation)}
                    disabled={isGeneratingImage}
                    className="w-full aspect-video rounded-xl border-2 border-dashed border-zinc-800 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-amber-500 group disabled:opacity-50"
                  >
                    {isGeneratingImage ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <ImageIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {isGeneratingImage ? 'Visualizing...' : 'Generate Visual'}
                    </span>
                  </button>
                ) : (
                  <div className="w-full aspect-video rounded-xl border border-zinc-800 flex flex-col items-center justify-center gap-2 text-zinc-600">
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">No Image</span>
                  </div>
                )
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                    {selectedLocation.type}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-600">
                    X: {selectedLocation.coordinates.x} Y: {selectedLocation.coordinates.y}
                  </span>
                </div>
                <h3 className="text-xl font-serif font-bold text-zinc-100">{selectedLocation.name}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed italic">
                  {selectedLocation.description}
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <button
                  onClick={() => setSelectedLocation(null)}
                  className="w-full py-2 text-xs font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-widest transition-colors"
                >
                  Close Details
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 flex flex-col items-center justify-center h-full text-center opacity-40">
              <MapPin className="w-8 h-8 text-zinc-600 mb-2" />
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest">Select a location to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
