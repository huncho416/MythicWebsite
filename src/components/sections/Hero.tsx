const heroBanner = "/banner.jpg";
const logo = "/logo.jpg";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useBackgroundImage } from "@/hooks/use-background";
import { useEffect, useRef } from "react";
import ServerStats from "./ServerStats";

export default function Hero() {
  const { imageLoaded, imageError } = useBackgroundImage();
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Add error state to trigger fallback CSS
    if (heroRef.current) {
      if (imageError) {
        heroRef.current.setAttribute('data-bg-error', 'true');
      } else {
        heroRef.current.removeAttribute('data-bg-error');
      }
    }
  }, [imageError]);

  return (
    <section 
      ref={heroRef}
      aria-label="Hero" 
      className="relative overflow-hidden"
    >
      <div className="bg-hero">
        {/* Server Stats Bar */}
        <ServerStats />
        
        <div className="container mx-auto py-12 md:py-20">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-6 animate-fade-in">
              <h1 className="font-brand text-4xl md:text-6xl leading-tight text-white drop-shadow-lg">
                MythicPvP Network
              </h1>
              <p className="text-lg text-gray-200 max-w-xl drop-shadow-md">
                Battle across epic gamemodes, rank up, and join a thriving community. 
                IP: play.mythicpvp.net
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="hero" size="lg">
                  <Link to="/store">Shop Ranks</Link>
                </Button>
                <Button asChild variant="neon" size="lg">
                  <Link to="/forums">Visit Forums</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="https://discord.gg/MqdWE249AT" target="_blank" rel="noopener noreferrer">
                    Join Discord
                  </a>
                </Button>
              </div>
            </div>
            <div className="hidden md:block">
              <Card className="bg-card/60 backdrop-blur shadow-glow border-primary/20">
                <CardContent className="p-0">
                  <img 
                    src={heroBanner} 
                    alt="MythicPvP banner art" 
                    className="w-full h-full object-cover rounded-lg" 
                    loading="lazy" 
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        
        {/* Loading indicator for background image */}
        {!imageLoaded && !imageError && (
          <div className="absolute top-4 right-4 text-white/60 text-sm">
            Loading background...
          </div>
        )}
      </div>
    </section>
  );
}
