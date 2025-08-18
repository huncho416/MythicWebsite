export default function Footer() {
  return (
    <footer className="border-t mt-16">
      <div className="container mx-auto py-10 grid gap-6 md:grid-cols-3">
        <div>
          <h3 className="font-brand text-lg mb-2">MythicPvP</h3>
          <p className="text-sm text-muted-foreground">Play. Conquer. Become Mythic.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Links</h4>
          <ul className="space-y-1 text-sm">
            <li><a href="/store" className="story-link">Store</a></li>
            <li><a href="/forums" className="story-link">Forums</a></li>
            <li><a href="/support" className="story-link">Support</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Status</h4>
          <p className="text-sm text-muted-foreground">mc.mythicpvp.net</p>
        </div>
      </div>
      <div className="border-t py-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} MythicPvP. All rights reserved.</div>
    </footer>
  );
}
