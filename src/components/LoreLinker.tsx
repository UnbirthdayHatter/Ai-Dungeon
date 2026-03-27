import React from 'react';
import { useStore } from '../store/useStore';

interface LoreLinkerProps {
  text: string;
  onLinkClick?: (id: string) => void;
}

export const LoreLinker: React.FC<LoreLinkerProps> = ({ text, onLinkClick }) => {
  const lorebook = useStore((state) => state.lorebook);

  if (!text || !lorebook || !lorebook.length) return <>{text || ''}</>;

  // Sort lore entries by name length descending to avoid partial matches
  // Filter out entries without names to avoid errors
  const sortedLore = [...lorebook]
    .filter(l => l && l.name)
    .sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0));
  
  // Create a regex that matches any of the lore entry names
  const names = sortedLore
    .map(l => l.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .filter(Boolean)
    .join('|');
  
  if (!names) return <>{text}</>;

  const regex = new RegExp(`\\b(${names})\\b`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        const entry = sortedLore.find(l => l.name.toLowerCase() === part.toLowerCase());
        if (entry) {
          return (
            <span
              key={i}
              className="text-amber-600 dark:text-amber-400 font-medium cursor-pointer hover:underline decoration-amber-500/50 underline-offset-2"
              onClick={() => onLinkClick?.(entry.id)}
            >
              {part}
            </span>
          );
        }
        return part;
      })}
    </>
  );
};
