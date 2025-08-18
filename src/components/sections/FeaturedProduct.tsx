import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function FeaturedProduct() {
  return (
    <section className="container mx-auto py-16">
      <Card className="bg-secondary/40">
        <CardHeader>
          <CardTitle className="font-brand">Featured Product</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1">
            <h3 className="text-2xl font-semibold">Mythic Champion Rank</h3>
            <p className="text-muted-foreground">Unlock exclusive kits, cosmetic effects, queue priority and more.</p>
          </div>
          <Button asChild variant="hero" size="lg">
            <Link to="/store">Buy Now</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
