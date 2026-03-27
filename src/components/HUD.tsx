import React from 'react';
import { Heart, Zap, Shield, Star, User, ShieldCheck, Trash2, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore, Sheet } from '../store/useStore';
import { auth } from '../firebase';

interface HUDProps {
  sheet: Sheet;
  isCompact?: boolean;
}

export function HUD({ sheet, isCompact = false }: HUDProps) {
  const {
    updateSheet,
    isHost,
    currentLiveRoleplayId,
    togglePlayerPermission,
    editors,
    admins,
    removeSheetFromRoleplay
  } = useStore();
  if (!sheet) return null;

  const hpPercent = sheet.maxHp ? (sheet.hp || 0) / sheet.maxHp * 100 : 0;
  const isMe = sheet.ownerId === auth.currentUser?.uid;
  const isEditor = editors.includes(sheet.ownerId || '');
  const isAdmin = admins.includes(sheet.ownerId || '');
  const roleLabel = isMe ? 'You' : isAdmin ? 'Admin' : isEditor ? 'Editor' : 'Player';
  const roleBadgeClass = isMe
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    : isAdmin
      ? 'bg-red-500/10 text-red-400 border-red-500/30'
      : isEditor
        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
        : 'bg-zinc-800 text-zinc-400 border-zinc-700';

  // BitD Stats
  const stress = sheet.bitd?.stress || 0;
  const stressPercent = (stress / 9) * 100;
  const coin = sheet.bitd?.coin || 0;
  const stash = sheet.bitd?.stash || 0;

  // Harm calculation
  const harmCount = sheet.bitd ? [
    sheet.bitd.harm.light1, sheet.bitd.harm.light2,
    sheet.bitd.harm.medium1, sheet.bitd.harm.medium2,
    sheet.bitd.harm.severe, sheet.bitd.harm.fatal
  ].filter(h => h.trim().length > 0).length : 0;

  return (
    <div className={cn(
      "bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-xl p-3 pointer-events-auto shadow-xl flex flex-col gap-2 group relative hover:z-50",
      isCompact ? "p-2 gap-2" : "p-3 gap-4"
    )}>
      {/* Host Controls Overlay */}
      {isHost && !isMe && (
        <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={() => togglePlayerPermission(currentLiveRoleplayId!, sheet.ownerId!, isEditor ? 'viewer' : 'editor')}
            className={cn(
              "p-1.5 rounded-lg border shadow-lg transition-all",
              isEditor 
                ? "bg-amber-500 border-amber-400 text-white" 
                : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
            )}
            title={isEditor ? "Revoke Edit Permission" : "Grant Edit Permission"}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (confirm(`Remove ${sheet.name} from the session?`)) {
                removeSheetFromRoleplay(currentLiveRoleplayId!, sheet.id);
              }
            }}
            className="p-1.5 bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg shadow-lg transition-all"
            title="Remove Player"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Stats Tooltip */}
      <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-lg p-3 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 min-w-[120px]">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {sheet.type === 'bitd' && sheet.bitd ? (
            <>
              <div className="flex justify-between items-center gap-2">
                <span className="text-[10px] uppercase text-zinc-500 font-bold">Stress</span>
                <span className="text-xs font-mono text-zinc-200">{sheet.bitd.stress}/9</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-[10px] uppercase text-zinc-500 font-bold">Trauma</span>
                <span className="text-xs font-mono text-zinc-200">{sheet.bitd.trauma.length}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-[10px] uppercase text-zinc-500 font-bold">Coin</span>
                <span className="text-xs font-mono text-zinc-200">{sheet.bitd.coin}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-[10px] uppercase text-zinc-500 font-bold">Stash</span>
                <span className="text-xs font-mono text-zinc-200">{sheet.bitd.stash}</span>
              </div>
            </>
          ) : (
            <>
              {sheet.stats && Object.entries(sheet.stats).map(([stat, val]) => (
                <div key={stat} className="flex justify-between items-center gap-2">
                  <span className="text-[10px] uppercase text-zinc-500 font-bold">{stat}</span>
                  <span className="text-xs font-mono text-zinc-200">{val}</span>
                </div>
              ))}
            </>
          )}
          {sheet.customStats?.map(stat => (
            <div key={stat.id} className="flex justify-between items-center gap-2">
              <span className="text-[10px] uppercase text-zinc-500 font-bold truncate max-w-[40px]">{stat.name}</span>
              <span className="text-xs font-mono text-zinc-200">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className={cn(
          "rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0",
          isCompact ? "w-8 h-8" : "w-12 h-12"
        )}>
          {sheet.avatarUrl ? (
            <img src={sheet.avatarUrl} alt={sheet.name || 'Character'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
              <User className="w-1/2 h-1/2 text-zinc-600" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black text-zinc-100 uppercase tracking-widest truncate">
              {sheet.name?.trim() || 'Unnamed Hero'}
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              {sheet.type === 'bitd' ? `STRESS ${stress}/9` : `HP ${sheet.hp}/${sheet.maxHp}`}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className={cn("px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest", roleBadgeClass)}>
              {roleLabel}
            </span>
            {isMe && (
              <span className="text-[9px] uppercase tracking-widest text-zinc-500">
                Reserved to this player
              </span>
            )}
          </div>
          
          {/* Stress/HP Bar */}
          <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/50">
            <div 
              className={cn(
                "h-full transition-all duration-500 ease-out rounded-full",
                sheet.type === 'bitd' 
                  ? (stressPercent < 33 ? "bg-emerald-500" : stressPercent < 66 ? "bg-amber-500" : "bg-red-500")
                  : ((sheet.hp || 0) / (sheet.maxHp || 1) > 0.5 ? "bg-emerald-500" : (sheet.hp || 0) / (sheet.maxHp || 1) > 0.25 ? "bg-amber-500" : "bg-red-500")
              )}
              style={{ width: `${sheet.type === 'bitd' ? stressPercent : ((sheet.hp || 0) / (sheet.maxHp || 1) * 100)}%` }}
            />
          </div>

          <div className="flex items-center gap-3 mt-2">
            {sheet.type === 'bitd' ? (
              <>
                <div className="flex items-center gap-1" title="Harm">
                  <ShieldAlert className="w-3 h-3 text-red-400" />
                  <span className="text-[10px] font-mono font-bold text-zinc-300">{harmCount}</span>
                </div>
                <div className="flex items-center gap-1" title="Coin">
                  <Star className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] font-mono font-bold text-zinc-300">{coin}</span>
                </div>
                <div className="flex items-center gap-1" title="Trauma">
                  <Zap className="w-3 h-3 text-indigo-400" />
                  <span className="text-[10px] font-mono font-bold text-zinc-300">{sheet.bitd?.trauma.length || 0}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-blue-400" />
                  <span className="text-[10px] font-mono font-bold text-zinc-300">{sheet.ac || 10}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-indigo-400" />
                  <span className="text-[10px] font-mono font-bold text-zinc-300">
                    {sheet.stats?.dex ? (Math.floor((sheet.stats.dex - 10) / 2) >= 0 ? '+' : '') + Math.floor((sheet.stats.dex - 10) / 2) : '+0'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
