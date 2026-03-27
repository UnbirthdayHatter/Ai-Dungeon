/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { THEME_CLASSES } from '@/constants';
import { cn } from '@/lib/utils';
import { Sidebar } from '@/components/Sidebar';
import { Chat } from '@/components/Chat';
import { CharacterSheet } from '@/components/CharacterSheet';
import { Lorebook } from '@/components/Lorebook';
import { Settings } from '@/components/Settings';
import { SetupAdventure } from '@/components/SetupAdventure';
import { DiceRoller } from '@/components/DiceRoller';
import { Roleplays } from '@/components/Roleplays';
import { Multiplayer } from '@/components/Multiplayer';
import { Immersion } from '@/components/Immersion';
import { WorldMap } from '@/components/WorldMap';
import { ClockTracker } from '@/components/ClockTracker';
import { Notes } from '@/components/Notes';

import { FirebaseProvider, FirestoreErrorBoundary, useAuth } from '@/components/FirebaseProvider';
import { LogIn } from 'lucide-react';

function AppContent() {
  const { 
    activeTab, 
    showClocks, 
    showJournal, 
    currentLiveRoleplayId,
    syncRoleplay, 
    theme,
    fetchUserSheets,
    fetchUserRoleplays,
    fetchUserConfig,
    syncPendingUpdates
  } = useStore();
  const { user, loading, signIn } = useAuth();

  useEffect(() => {
    const interval = setInterval(() => {
      syncPendingUpdates();
    }, 10000);
    return () => clearInterval(interval);
  }, [syncPendingUpdates]);

  useEffect(() => {
    if (user) {
      fetchUserSheets();
      fetchUserRoleplays();
      fetchUserConfig();
    }
  }, [user, fetchUserSheets, fetchUserRoleplays, fetchUserConfig]);

  useEffect(() => {
    if (currentLiveRoleplayId) {
      const unsub = syncRoleplay(currentLiveRoleplayId);
      return () => unsub();
    }
  }, [currentLiveRoleplayId, syncRoleplay]);

  const themeClasses = THEME_CLASSES[theme] || THEME_CLASSES.classic;

  if (loading) {
    return (
      <div className={cn("h-screen w-full flex items-center justify-center", themeClasses.root)}>
        <div className={cn("w-12 h-12 border-4 border-t-transparent rounded-full animate-spin", themeClasses.border)} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={cn("h-screen w-full flex items-center justify-center p-6", themeClasses.root)}>
        <div className={cn("max-w-md w-full border rounded-3xl p-8 text-center space-y-6 shadow-2xl", themeClasses.surface, themeClasses.border)}>
          <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center mx-auto border", themeClasses.bg, themeClasses.border)}>
            <LogIn className={cn("w-10 h-10", themeClasses.text)} />
          </div>
          <div className="space-y-2">
            <h1 className={cn("text-3xl font-serif font-bold", themeClasses.text)}>Welcome, Traveler</h1>
            <p className={themeClasses.muted}>Sign in to begin your adventure and sync your progress across the realms.</p>
          </div>
          <button
            onClick={signIn}
            className={cn("w-full py-4 text-white rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-3", themeClasses.button)}
          >
            <LogIn className="w-5 h-5" />
            Sign In with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-screen w-full overflow-hidden font-sans relative", themeClasses.root)}>
      <Immersion />
      <Sidebar activeTab={activeTab} />
      
      <main className="flex-1 relative flex h-full overflow-hidden z-10">
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {activeTab === 'chat' && <Chat />}
          {activeTab === 'character' && <CharacterSheet />}
          {activeTab === 'lorebook' && <Lorebook />}
          {activeTab === 'setup' && <SetupAdventure />}
          {activeTab === 'roleplays' && <Roleplays />}
          {activeTab === 'multiplayer' && <Multiplayer />}
          {activeTab === 'map' && <WorldMap />}
          {activeTab === 'settings' && <Settings />}
        </div>

        {activeTab === 'chat' && showClocks && <ClockTracker />}
        {activeTab === 'chat' && showJournal && <Notes />}
      </main>
      
      <DiceRoller />
    </div>
  );
}

export default function App() {
  return (
    <FirestoreErrorBoundary>
      <FirebaseProvider>
        <AppContent />
      </FirebaseProvider>
    </FirestoreErrorBoundary>
  );
}
