import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
const avatarUrl = "/avatar.png";

export default function TopDonor() {
  return (
    <section className="container mx-auto py-16">
      <Card className="bg-secondary/40">
        <CardHeader>
          <CardTitle className="font-brand">Top Donor</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <img src={avatarUrl} alt="Top donor avatar" className="h-12 w-12 rounded-full" loading="lazy" />
          <div>
            <p className="font-semibold">DragonSlayer_88</p>
            <p className="text-sm text-muted-foreground">Contributed $250 this month. Thank you!</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
