import { useStore } from '@/store/useStore';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Volume2, VolumeX, Play, Pause, RotateCcw } from 'lucide-react';

export function Immersion() {
  const { 
    backgroundImageUrl, 
    ambientAudioUrl, 
    audioVolume, 
    setAudioVolume, 
    isAudioPlaying, 
    setIsAudioPlaying,
    setAmbientAudioUrl,
    isAudioLoading,
    setIsAudioLoading
  } = useStore();
  const audioRef = useRef<HTMLAudioElement>(null);

  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (ambientAudioUrl) {
      setIsAudioLoading(true);
    }
  }, [ambientAudioUrl]);

  // Check if URL is YouTube
  const isYouTube = useMemo(() => 
    ambientAudioUrl?.includes('youtube.com') || ambientAudioUrl?.includes('youtu.be'),
    [ambientAudioUrl]
  );

  useEffect(() => {
    const sendYoutubeCommand = (func: string, args: any[] = []) => {
      if (isYouTube && iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func,
          args
        }), '*');
      }
    };

    if (audioRef.current && !isYouTube) {
      audioRef.current.volume = audioVolume;
      if (isAudioPlaying && ambientAudioUrl) {
        audioRef.current.play().catch(e => {
          console.warn('Autoplay prevented:', e);
          setAutoplayBlocked(true);
        });
      } else {
        audioRef.current.pause();
      }
    }

    if (isYouTube) {
      sendYoutubeCommand('setVolume', [audioVolume * 100]);
      sendYoutubeCommand(isAudioPlaying ? 'playVideo' : 'pauseVideo');
    }
  }, [ambientAudioUrl, audioVolume, isAudioPlaying, isYouTube]);

  const handleIframeLoad = () => {
    setIsAudioLoading(false);
    // Initial volume and play state
    if (isYouTube && iframeRef.current && iframeRef.current.contentWindow) {
      const win = iframeRef.current.contentWindow;
      const send = (func: string, args: any[] = []) => {
        win.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
      };
      
      // Delay slightly to ensure API is ready
      setTimeout(() => {
        send('setVolume', [audioVolume * 100]);
        if (isAudioPlaying) send('playVideo');
        else send('pauseVideo');
      }, 1000);
    }
  };

  const handleEnableAudio = () => {
    setAutoplayBlocked(false);
    setIsAudioPlaying(true);
    if (audioRef.current) {
      audioRef.current.play();
    }
  };
  
  let youtubeEmbedUrl = '';
  if (isYouTube && ambientAudioUrl) {
    let videoId = '';
    if (ambientAudioUrl.includes('youtube.com/watch?v=')) {
      videoId = ambientAudioUrl.split('v=')[1].split('&')[0];
    } else if (ambientAudioUrl.includes('youtu.be/')) {
      videoId = ambientAudioUrl.split('youtu.be/')[1].split('?')[0];
    }
    // YouTube embed parameters:
    // autoplay=1 (if playing)
    // loop=1 & playlist=VIDEO_ID (to loop)
    // controls=0 (hide controls)
    // mute=0 (unmuted)
    // enablejsapi=1 (for better control)
    youtubeEmbedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=${isAudioPlaying ? 1 : 0}&loop=1&playlist=${videoId}&controls=0&mute=0&enablejsapi=1`;
  }

  return (
    <>
      {/* Background Image */}
      {backgroundImageUrl && (
        <div 
          className="fixed inset-0 z-0 pointer-events-none transition-opacity duration-1000"
          style={{
            backgroundImage: `url(${backgroundImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.15 // Keep it subtle so UI is readable
          }}
        />
      )}

      {/* Autoplay Blocked Prompt */}
      {autoplayBlocked && isAudioPlaying && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4">
          <button
            onClick={handleEnableAudio}
            className="bg-amber-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2 hover:bg-amber-500 transition-all border-2 border-amber-400/50"
          >
            <Play className="w-5 h-5" />
            Click to Enable Ambient Audio
          </button>
        </div>
      )}

      {/* Hidden Audio Elements */}
      {ambientAudioUrl && (
        <div className="hidden">
          {isYouTube ? (
            <iframe
              key={ambientAudioUrl}
              ref={iframeRef}
              width="0"
              height="0"
              src={youtubeEmbedUrl}
              frameBorder="0"
              allow="autoplay; encrypted-media"
              onLoad={handleIframeLoad}
            />
          ) : (
            <audio
              key={ambientAudioUrl}
              ref={audioRef}
              src={ambientAudioUrl}
              loop
              onCanPlayThrough={() => setIsAudioLoading(false)}
            />
          )}
        </div>
      )}
    </>
  );
}
