import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, Store, MessageSquare, LifeBuoy, Settings, Crown, Home, Package } from "lucide-react";

// Import admin components
import SimplifiedUserManagement from "@/components/admin/SimplifiedUserManagement";
import RoleManagement from "@/components/admin/RoleManagement";
import HomeMessageManagement from "@/components/admin/HomeMessageManagement";
import EnhancedStoreManagement from "@/components/admin/EnhancedStoreManagement";
import OrderManagement from "@/components/admin/OrderManagement";
import ForumManagement from "@/components/admin/ForumManagement";
import SupportManagement from "@/components/admin/SupportManagement";
import ModerationManagement from "@/components/admin/ModerationManagement";
import SettingsManagement from "@/components/admin/SettingsManagement";

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

interface UserWithRoles {
  id: string;
  email: string;
  created_at: string;
  roles: string[];
}

export default function Admin() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const canonical = typeof window !== 'undefined' ? window.location.origin + '/admin' : '';

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (!user) {
        setLoading(false);
        return;
      }

      // Check if user has admin privileges
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const hasAdminRole = roles?.some(r => 
        ['admin', 'senior_admin', 'system_admin', 'owner'].includes(r.role)
      );

      setHasAccess(!!hasAdminRole);
      
      if (hasAdminRole) {
        await loadUsers();
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      toast({
        title: "Error",
        description: "Failed to check admin permissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      // Get users from user_profiles
      const { data: profileUsers, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          username,
          display_name,
          created_at
        `)
        .order('created_at', { ascending: false });
      
      if (profileError) {
        throw profileError;
      }

      // Get all user roles separately
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) {
        throw rolesError;
      }

      const usersWithRoles: UserWithRoles[] = (profileUsers || []).map(profile => ({
        id: profile.user_id,
        email: profile.username || profile.display_name || 'Unknown',
        created_at: profile.created_at,
        roles: userRoles?.filter(ur => ur.user_id === profile.user_id).map(ur => ur.role) || []
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error", 
        description: "Failed to load users",
        variant: "destructive",
      });
    }
  };

  const assignRole = async (userId: string, role: string) => {
    try {
      // Validate role against available enum values
      const validRoles = ['owner', 'system_admin', 'senior_admin', 'admin', 'senior_moderator', 'moderator', 'helper', 'developer'];
      if (!validRoles.includes(role)) {
        throw new Error('Invalid role');
      }

      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: role as any });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Role ${role} assigned successfully`,
      });

      await loadUsers();
    } catch (error) {
      console.error('Error assigning role:', error);
      toast({
        title: "Error",
        description: "Failed to assign role",
        variant: "destructive",
      });
    }
  };

  const removeRole = async (userId: string, role: string) => {
    try {
      // Validate role against available enum values  
      const validRoles = ['owner', 'system_admin', 'senior_admin', 'admin', 'senior_moderator', 'moderator', 'helper', 'developer'];
      if (!validRoles.includes(role)) {
        throw new Error('Invalid role');
      }

      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role as any);

      if (error) throw error;

      toast({
        title: "Success", 
        description: `Role ${role} removed successfully`,
      });

      await loadUsers();
    } catch (error) {
      console.error('Error removing role:', error);
      toast({
        title: "Error",
        description: "Failed to remove role",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12">
        <div className="flex items-center justify-center">
          <div className="text-lg">Loading admin panel...</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="container mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please log in to access the admin panel.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="container mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle>Unauthorized</CardTitle>
            <CardDescription>You don't have permission to access the admin panel.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12">
      <Helmet>
        <title>Admin Panel | MythicPvP</title>
        <meta name="description" content="Administrative dashboard for managing MythicPvP server" />
        <link rel="canonical" href={canonical} />
      </Helmet>

      <div className="flex items-center gap-3 mb-8">
        <Shield className="h-8 w-8 text-primary" />
        <h1 className="font-brand text-4xl">Admin Panel</h1>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="home" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Home
          </TabsTrigger>
          <TabsTrigger value="forums" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Forums
          </TabsTrigger>
          <TabsTrigger value="store" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Store
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="support" className="flex items-center gap-2">
            <LifeBuoy className="h-4 w-4" />
            Support
          </TabsTrigger>
          <TabsTrigger value="moderation" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Moderation
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <SimplifiedUserManagement />
        </TabsContent>

        <TabsContent value="roles">
          <RoleManagement />
        </TabsContent>

        <TabsContent value="home">
          <HomeMessageManagement />
        </TabsContent>

        <TabsContent value="forums">
          <ForumManagement />
        </TabsContent>

        <TabsContent value="store">
          <EnhancedStoreManagement />
        </TabsContent>

        <TabsContent value="orders">
          <OrderManagement />
        </TabsContent>

        <TabsContent value="support">
          <SupportManagement />
        </TabsContent>

        <TabsContent value="moderation">
          <ModerationManagement />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}