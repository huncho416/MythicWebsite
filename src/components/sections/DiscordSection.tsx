import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default function DiscordSection() {
  return (
    <section id="discord" className="container mx-auto py-16">
      <Card className="bg-secondary/40 overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-brand">Join the MythicPvP Discord</CardTitle>
            <Button asChild variant="hero" size="sm">
              <a href="https://discord.gg/mythicpvp" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Join Discord
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <iframe
            src="https://discord.com/widget?id=mythicpvp&theme=dark"
            width="100%"
            height="400"
            allowTransparency={true}
            frameBorder="0"
            sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
            title="Discord Widget"
            className="w-full"
          />
        </CardContent>
      </Card>
    </section>
  );
}
