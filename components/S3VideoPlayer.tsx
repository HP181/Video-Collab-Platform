"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUserMembership } from "@/lib/UseUserMembership";

interface S3VideoPlayerProps {
  hlsUrl: string;
  title: string;
  isHls?: boolean;
}

export function S3VideoPlayer({ hlsUrl, title, isHls = true }: S3VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<string>("auto");
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Get the user's membership status
  const { isPaidMember } = useUserMembership();
  
  // Format time (seconds) to MM:SS
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };
  
  // Handle direct video or HLS source
  useEffect(() => {
    if (!videoRef.current) return;
    
    // Reset state
    setVideoReady(false);
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    const video = videoRef.current;
    
    if (isHls) {
      // Handle HLS (adaptive streaming)
      if (Hls.isSupported()) {
        const hls = new Hls({
          maxMaxBufferLength: 60,
          manifestLoadingTimeOut: 10000,
        });
        
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          console.log("HLS manifest parsed, levels:", data.levels);
          
          // Get available quality levels
          const parsedLevels = data.levels.map((level) => {
            const height = level.height;
            return height ? `${height}p` : "Unknown";
          });
          
          setAvailableQualities(["auto", ...parsedLevels]);
          
          // For non-paid members, set the initial quality to 720p
          if (!isPaidMember && parsedLevels.includes("1080p")) {
            console.log("Non-paid member - forcing 720p quality");
            
            // Find the index of the 720p level
            const quality720Index = hls.levels.findIndex(level => level.height === 720);
            if (quality720Index !== -1) {
              // Set the quality to 720p
              hls.currentLevel = quality720Index;
              setSelectedQuality("720p");
            }
          }
          
          setVideoReady(true);
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error("HLS error:", data);
          if (data.fatal) {
            switch(data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log("Network error, trying to recover...");
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log("Media error, trying to recover...");
                hls.recoverMediaError();
                break;
              default:
                console.error("Fatal error, destroying HLS instance");
                hls.destroy();
                break;
            }
          }
        });
        
        hlsRef.current = hls;
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Native HLS support (Safari)
        video.src = hlsUrl;
        setVideoReady(true);
      }
    } else {
      // Direct video source
      video.src = hlsUrl;
      setVideoReady(true);
    }
    
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [hlsUrl, isHls, isPaidMember]);
  
  // Handle play/pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };
  
  // Handle mute/unmute
  const toggleMute = () => {
    if (!videoRef.current) return;
    
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
      
      // Restore previous volume
      if (volume === 0) {
        setVolume(0.5);
        videoRef.current.volume = 0.5;
      }
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };
  
  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    if (!videoRef.current) return;
    
    const newVolume = value[0];
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    
    // Update mute state based on volume
    if (newVolume === 0) {
      videoRef.current.muted = true;
      setIsMuted(true);
    } else if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
  };
  
  // Handle time scrubbing
  const handleTimeChange = (value: number[]) => {
    if (!videoRef.current) return;
    
    const newTime = value[0];
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };
  
  // Handle fullscreen
  const toggleFullscreen = () => {
    if (!wrapperRef.current) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      wrapperRef.current.requestFullscreen();
    }
  };
  
  // Handle quality change
  const changeQuality = (level: string) => {
    if (!hlsRef.current || !isHls) return;
    
    // Don't allow non-paid members to select 1080p
    if (level === "1080p" && !isPaidMember) {
      // Show premium upgrade dialog
      setShowUpgradeDialog(true);
      return;
    }
    
    setSelectedQuality(level);
    
    if (level === "auto") {
      hlsRef.current.currentLevel = -1; // Auto quality
    } else {
      // Find the level index that matches the selected quality
      const levelIndex = hlsRef.current.levels.findIndex(
        l => l.height === parseInt(level.replace("p", ""))
      );
      
      if (levelIndex !== -1) {
        hlsRef.current.currentLevel = levelIndex;
      }
    }
  };
  
  // Show/hide controls on mouse movement
  const handleMouseMove = () => {
    setShowControls(true);
    
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    
    controlsTimeout.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };
  
  // Event listeners for video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onLoadedMetadata = () => setDuration(video.duration);
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, []);
  
  return (
    <div 
      ref={wrapperRef}
      className="relative w-full aspect-video bg-black rounded-lg overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        playsInline
        preload="auto"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
      />
      
      {/* Premium Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Crown className="h-5 w-5 text-yellow-500 mr-2" />
              Upgrade to Premium
            </DialogTitle>
            <DialogDescription>
              Unlock HD 1080p quality and other premium features by upgrading your membership.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="font-medium">Premium Benefits:</h3>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li>Watch all videos in HD 1080p quality</li>
                <li>Access to exclusive premium content</li>
                <li>Ad-free viewing experience</li>
                <li>Priority support</li>
              </ul>
            </div>
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm font-medium mb-1">Only $9.99/month</p>
              <p className="text-xs text-muted-foreground">Cancel anytime. No commitments.</p>
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Not Now
            </Button>
            <Button className="bg-primary hover:bg-primary/90">
              Upgrade Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Loading/buffering spinner */}
      {(!videoReady || buffering) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      )}
      
      {/* Big play button */}
      {!isPlaying && videoReady && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          <div className="w-20 h-20 rounded-full bg-primary/80 flex items-center justify-center">
            <Play className="w-10 h-10 text-primary-foreground" fill="currentColor" />
          </div>
        </div>
      )}
      
      {/* Controls overlay */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-12 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Title bar */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white text-sm font-medium truncate">{title}</h3>
          
          <div className="flex items-center gap-2">
            {/* Quality selector - only show for HLS */}
            {isHls && availableQualities.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {availableQualities.map((quality) => (
                          <DropdownMenuItem
                            key={quality}
                            onClick={() => changeQuality(quality)}
                            className={cn(
                              selectedQuality === quality && "font-medium bg-accent",
                              quality === "1080p" && !isPaidMember && "text-muted-foreground cursor-not-allowed"
                            )}
                            disabled={quality === "1080p" && !isPaidMember}
                          >
                            {quality === "1080p" && !isPaidMember ? (
                              <div className="flex items-center justify-between w-full">
                                <span>{quality}</span>
                                <span className="ml-1 text-xs flex items-center text-amber-500">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Premium
                                </span>
                              </div>
                            ) : (
                              quality
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Quality</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Fullscreen button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={toggleFullscreen}
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Fullscreen</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-2">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleTimeChange}
            className="cursor-pointer"
          />
        </div>
        
        {/* Bottom controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Play/Pause button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" fill="currentColor" />
              )}
            </Button>
            
            {/* Volume control */}
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={toggleMute}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              
              <div className="w-20">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.05}
                  onValueChange={handleVolumeChange}
                  className="cursor-pointer"
                />
              </div>
            </div>
          </div>
          
          {/* Time display */}
          <div className="text-white text-xs">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>
    </div>
  );
}