import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Users, Gamepad2 } from "lucide-react";

interface ServerStats {
  online: number;
  motd: string;
}

interface DiscordStats {
  presence_count: number;
}

export default function ServerStats() {
  const [serverStats, setServerStats] = useState<ServerStats>({ online: 0, motd: "Loading..." });
  const [discordStats, setDiscordStats] = useState<DiscordStats>({ presence_count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock server stats for now - in production, you'd call your Minecraft server API
    const fetchServerStats = async () => {
      try {
        // For demo purposes, using mock data
        // In production, replace with actual server API calls
        setTimeout(() => {
          setServerStats({
            online: Math.floor(Math.random() * 500) + 100, // Random number between 100-600
            motd: "play.mythicpvp.net"
          });
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error("Error fetching server stats:", error);
        setServerStats({ online: 0, motd: "play.mythicpvp.net" });
        setLoading(false);
      }
    };

    // Mock Discord stats
    const fetchDiscordStats = async () => {
      try {
        // For demo purposes, using mock data
        setTimeout(() => {
          setDiscordStats({
            presence_count: Math.floor(Math.random() * 1000) + 500 // Random number between 500-1500
          });
        }, 800);
      } catch (error) {
        console.error("Error fetching Discord stats:", error);
        setDiscordStats({ presence_count: 0 });
      }
    };

    fetchServerStats();
    fetchDiscordStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(() => {
      fetchServerStats();
      fetchDiscordStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full py-8">
      <div className="container mx-auto">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-8 mb-8">
          {/* Server Stats */}
          <Card className="bg-card/60 backdrop-blur-sm border-primary/20 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/20 rounded-lg">
                <Gamepad2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {loading ? "..." : serverStats.online.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">PLAYERS ONLINE</div>
                <div className="text-xs text-muted-foreground">{serverStats.motd}</div>
              </div>
            </div>
          </Card>

          {/* Logo */}
          <div className="flex-shrink-0">
            <img 
              src="/logo.jpg" 
              alt="MythicPvP Dragon Logo" 
              className="h-24 w-24 lg:h-32 lg:w-32 drop-shadow-lg"
            />
          </div>

          {/* Discord Stats */}
          <Card className="bg-card/60 backdrop-blur-sm border-accent/20 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent/20 rounded-lg">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">
                  {discordStats.presence_count.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">ONLINE</div>
                <div className="text-xs text-muted-foreground">DISCORD.GG/MYTHICPVP</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
