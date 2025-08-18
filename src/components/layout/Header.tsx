import { Link, NavLink } from "react-router-dom";
const logo = "/logo.png";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { User as UserIcon, LogOut, Home, ShoppingCart, MessageSquare, HelpCircle, Shield } from "lucide-react";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/store", label: "Store", icon: ShoppingCart },
  { to: "/forums", label: "Forums", icon: MessageSquare },
  { to: "/support", label: "Support", icon: HelpCircle },
];

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<{ display_name?: string; username?: string } | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminAccess(session.user.id);
        fetchUserProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          checkAdminAccess(session.user.id);
          fetchUserProfile(session.user.id);
        } else {
          setHasAdminAccess(false);
          setUserProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name, username')
        .eq('user_id', userId)
        .single();
      
      setUserProfile(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserProfile(null);
    }
  };

  const checkAdminAccess = async (userId: string) => {
    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const hasAccess = roles?.some(r => 
        ['admin', 'senior_admin', 'system_admin', 'owner'].includes(r.role)
      );
      setHasAdminAccess(!!hasAccess);
    } catch (error) {
      console.error('Error checking admin access:', error);
      setHasAdminAccess(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const adminNavItems = hasAdminAccess ? [{ to: "/admin", label: "Admin", icon: Shield }] : [];
  const allNavItems = [...navItems, ...adminNavItems];

  return (
    <header className="w-full sticky top-0 z-40 border-b border-border/20 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <nav className="container mx-auto flex items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="MythicPvP logo" className="h-10 w-10" loading="lazy" />
          <span className="font-brand text-xl text-primary">MythicPvP</span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          {allNavItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <NavLink key={item.to} to={item.to} className={({ isActive }) =>
                `text-sm flex items-center gap-2 px-3 py-2 rounded-md transition-all ${isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}>
                <IconComponent className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  {userProfile?.display_name || userProfile?.username || user.email?.split('@')[0] || 'User'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="ghost">
              <Link to="/login">Login</Link>
            </Button>
          )}
          <Button asChild variant="hero">
            <Link to="/store">Visit Store</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
