import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';

interface Dice3DProps {
  result: number;
  diceType: number;
  onComplete: () => void;
}

const DICE_SKINS: Record<string, { from: string, via: string, to: string, border: string, shadow: string }> = {
  default: { from: 'amber-400', via: 'amber-600', to: 'amber-800', border: 'amber-200', shadow: 'rgba(245,158,11,0.6)' },
  obsidian: { from: 'zinc-700', via: 'zinc-800', to: 'zinc-950', border: 'zinc-500', shadow: 'rgba(0,0,0,0.6)' },
  ivory: { from: 'stone-100', via: 'stone-200', to: 'stone-400', border: 'stone-50', shadow: 'rgba(200,200,200,0.6)' },
  celestial: { from: 'indigo-400', via: 'indigo-600', to: 'indigo-900', border: 'indigo-200', shadow: 'rgba(79,70,229,0.6)' },
  bloodstone: { from: 'red-700', via: 'red-800', to: 'red-950', border: 'red-400', shadow: 'rgba(153,27,27,0.6)' },
};

export function Dice3D({ result, diceType, onComplete }: Dice3DProps) {
  const [isRolling, setIsRolling] = useState(true);
  const { diceSkin } = useStore();
  const skin = DICE_SKINS[diceSkin] || DICE_SKINS.default;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsRolling(false);
      setTimeout(() => {
        onComplete();
      }, 2000); // Wait a bit after showing result before closing
    }, 1500); // Roll duration

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm overflow-hidden pointer-events-none">
      {/* Background Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 0.5, 0], 
              scale: [0, 1, 0],
              x: [Math.random() * 1000 - 500, Math.random() * 1000 - 500],
              y: [Math.random() * 1000 - 500, Math.random() * 1000 - 500]
            }}
            transition={{ duration: 2, repeat: Infinity, delay: Math.random() * 2 }}
            className={`absolute left-1/2 top-1/2 w-2 h-2 bg-${skin.from} rounded-full blur-sm`}
          />
        ))}
      </div>

      <div className="flex flex-col items-center pointer-events-auto">
        <motion.div
          animate={{
            rotateX: isRolling ? [0, 720, 1440, 2160] : 0,
            rotateY: isRolling ? [0, 720, 1440, 2160] : 0,
            rotateZ: isRolling ? [0, 360, 720, 1080] : 0,
            scale: isRolling ? [1, 1.5, 1] : 1.5,
            y: isRolling ? [0, -100, 0] : 0,
          }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="relative w-40 h-40 flex items-center justify-center"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Stylized 3D Die */}
          <div className={`absolute inset-0 bg-gradient-to-br from-${skin.from} via-${skin.via} to-${skin.to} rounded-2xl shadow-[0_0_60px_${skin.shadow}] border-4 border-${skin.border}/40 flex items-center justify-center transform-gpu`}>
            {/* Inner Glow */}
            <div className={`absolute inset-2 border-2 border-${skin.border}/20 rounded-xl`} />
            
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: isRolling ? 0.8 : 1 }}
              className="text-white font-black text-7xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]"
            >
              {isRolling ? '?' : result}
            </motion.span>
          </div>
          
          {/* Decorative faces to give 3D illusion */}
          <div className={`absolute inset-0 bg-${skin.to}/50 rounded-2xl translate-z-[-20px] blur-sm`} />
          <div className={`absolute inset-0 bg-${skin.via}/30 rounded-2xl rotate-y-90 translate-x-[20px]`} />
          <div className={`absolute inset-0 bg-${skin.to}/30 rounded-2xl rotate-x-90 translate-y-[20px]`} />
        </motion.div>
        
        <AnimatePresence>
          {!isRolling && (
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              className="mt-12 text-center"
            >
              <div className="text-white font-black text-2xl uppercase tracking-[0.3em] mb-2 drop-shadow-lg">
                D{diceType} Result
              </div>
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: 1 }}
                className="text-white text-7xl font-black drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]"
              >
                {result}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
