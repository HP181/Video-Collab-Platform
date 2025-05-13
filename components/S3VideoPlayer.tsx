"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Play, Pause, Volume2, VolumeX, Maximize, Settings } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  hlsUrl: string;
  poster?: string;
  title?: string;
  isHls?: boolean; // Add flag for HLS vs direct video
}

export function S3VideoPlayer({ hlsUrl, poster, title, isHls = true }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const hideControlsTimeout = useRef<NodeJS.Timeout>();
  const hlsInstance = useRef<Hls | null>(null);

  // Initialize player based on URL type
  useEffect(() => {
    let hls: Hls | null = null;
    const video = videoRef.current;
    
    if (!video || !hlsUrl) return;
    
    console.log(`Initializing video player with URL: ${hlsUrl.substring(0, 50)}...`);
    console.log(`Using HLS: ${isHls}`);
    
    // Clean up any existing HLS instance
    if (hlsInstance.current) {
      hlsInstance.current.destroy();
      hlsInstance.current = null;
    }
    
    const initializeVideo = async () => {
      // For direct video URL (not HLS)
      if (!isHls) {
        console.log("Using direct video URL");
        video.src = hlsUrl;
        return;
      }
      
      // For HLS content
      // First check if HLS is supported natively
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        console.log("Using native HLS support");
        video.src = hlsUrl;
      } else if (Hls.isSupported()) {
        // Use HLS.js for other browsers
        console.log("Using HLS.js");
        hls = new Hls({
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          debug: true, // Enable debug logs
        });
        
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        hlsInstance.current = hls;
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log("HLS manifest parsed successfully");
          if (video) {
            setDuration(video.duration);
          }
        });
        
        hls.on(Hls.Events.ERROR, (_, data) => {
          console.error('HLS error:', data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log("Fatal network error, trying to recover");
                hls?.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log("Fatal media error, trying to recover");
                hls?.recoverMediaError();
                break;
              default:
                console.error("Fatal error, cannot recover", data);
                break;
            }
          }
        });
      } else {
        console.error('HLS is not supported in this browser and no fallback provided');
      }
    };
    
    initializeVideo();
    
    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [hlsUrl, isHls]);

  // Handle video events
  useEffect(() => {
    const video = videoRef.current;
    
    if (!video) return;
    
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
    const handleLoadedData = () => setIsBuffering(false);
    
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('loadeddata', handleLoadedData);
    
    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, []);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle control visibility
  useEffect(() => {
    const container = videoContainerRef.current;
    
    if (!container) return;
    
    const handleMouseMove = () => {
      setShowControls(true);
      
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
      
      if (isPlaying) {
        hideControlsTimeout.current = setTimeout(() => {
          setShowControls(false);
        }, 3000);
      }
    };
    
    const handleMouseLeave = () => {
      if (isPlaying) {
        setShowControls(false);
      }
    };
    
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, [isPlaying]);

  // Play/pause control
  const togglePlay = () => {
    const video = videoRef.current;
    
    if (!video) return;
    
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  // Mute/unmute control
  const toggleMute = () => {
    const video = videoRef.current;
    
    if (!video) return;
    
    video.muted = !video.muted;
  };

  // Volume control
  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    
    if (!video) return;
    
    const newVolume = value[0];
    video.volume = newVolume;
    
    if (newVolume === 0) {
      video.muted = true;
    } else if (video.muted) {
      video.muted = false;
    }
  };

  // Time control
  const handleTimeChange = (value: number[]) => {
    const video = videoRef.current;
    
    if (!video) return;
    
    video.currentTime = value[0];
  };

  // Fullscreen control
  const toggleFullscreen = () => {
    const container = videoContainerRef.current;
    
    if (!container) return;
    
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Format time (seconds to MM:SS)
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={videoContainerRef}
      className={cn(
        "relative overflow-hidden bg-black rounded-lg group",
        isFullscreen ? "fixed inset-0 z-50" : "aspect-video"
      )}
    >
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        className="w-full h-full object-contain"
        onClick={togglePlay}
      />
      
      {/* Loading indicator */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-primary" />
        </div>
      )}
      
      {/* Play/pause overlay button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
          "h-16 w-16 rounded-full bg-primary/20 opacity-0",
          "transition-opacity duration-300",
          "group-hover:opacity-100",
          !isPlaying && "opacity-100",
          !showControls && "opacity-0"
        )}
        onClick={togglePlay}
      >
        {isPlaying ? (
          <Pause className="h-8 w-8 text-white" />
        ) : (
          <Play className="h-8 w-8 text-white" />
        )}
      </Button>
      
      {/* Controls bar */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent",
          "transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Progress bar */}
        <div className="mb-2">
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 100}
            step={0.1}
            onValueChange={handleTimeChange}
            className="h-1"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white"
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white"
                onClick={toggleMute}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              
              <div className="w-20">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  className="h-1"
                />
              </div>
            </div>
            
            <span className="text-xs text-white">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white"
              onClick={toggleFullscreen}
            >
              <Maximize className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Title overlay */}
      {title && showControls && (
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent">
          <h3 className="text-white font-medium">{title}</h3>
        </div>
      )}
    </div>
  );
}