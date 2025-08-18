import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Search, UserPlus, Ban, Shield, Eye, Edit2 } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

interface UserWithProfile {
  id: string;
  email: string;
  created_at: string;
  roles: string[];
  profile?: Tables<'user_profiles'>;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(null);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [banReason, setBanReason] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Get user profiles with their roles (simpler approach)
      const { data: userProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error loading user profiles:', profilesError);
        toast({
          title: "Error",
          description: "Failed to load user profiles",
          variant: "destructive",
        });
        return;
      }

      // Get user roles
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('*');

      const usersWithData: UserWithProfile[] = (userProfiles || []).map(profile => ({
        id: profile.user_id,
        email: profile.display_name || profile.username || 'Unknown User',
        created_at: profile.created_at,
        roles: userRoles?.filter(role => role.user_id === profile.user_id).map(role => role.role) || [],
        profile: profile
      }));

      setUsers(usersWithData);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const assignRole = async (userId: string, role: string) => {
    try {
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

  const banUser = async (userId: string, reason: string) => {
    try {
      // Update user profile to mark as banned
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          is_banned: true,
          ban_reason: reason,
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      // Add punishment record
      const { error: punishmentError } = await supabase
        .from('user_punishments')
        .insert({
          user_id: userId,
          moderator_id: (await supabase.auth.getUser()).data.user?.id || '',
          type: 'ban',
          reason: reason,
          is_active: true
        });

      if (punishmentError) throw punishmentError;

      toast({
        title: "Success",
        description: "User banned successfully",
      });

      setShowBanDialog(false);
      setBanReason("");
      await loadUsers();
    } catch (error) {
      console.error('Error banning user:', error);
      toast({
        title: "Error",
        description: "Failed to ban user",
        variant: "destructive",
      });
    }
  };

  const unbanUser = async (userId: string) => {
    try {
      // Update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          is_banned: false,
          ban_reason: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Deactivate punishment records
      const { error: punishmentError } = await supabase
        .from('user_punishments')
        .update({ 
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_by: (await supabase.auth.getUser()).data.user?.id || ''
        })
        .eq('user_id', userId)
        .eq('type', 'ban')
        .eq('is_active', true);

      if (punishmentError) throw punishmentError;

      toast({
        title: "Success",
        description: "User unbanned successfully",
      });

      await loadUsers();
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast({
        title: "Error",
        description: "Failed to unban user",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.profile?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.profile?.minecraft_username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      owner: "bg-red-500",
      system_admin: "bg-purple-500",
      senior_admin: "bg-blue-500",
      admin: "bg-green-500",
      senior_moderator: "bg-yellow-500",
      moderator: "bg-orange-500",
      helper: "bg-cyan-500",
      developer: "bg-pink-500"
    };
    return colors[role] || "bg-gray-500";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">Loading users...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            User Management
          </CardTitle>
          <CardDescription>
            Manage user accounts, roles, and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by email, username, or Minecraft name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Minecraft</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{user.email}</div>
                        {user.profile?.username && (
                          <div className="text-sm text-muted-foreground">
                            @{user.profile.username}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.profile?.minecraft_username || (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map(role => (
                          <div 
                            key={role} 
                            className={`${getRoleColor(role)} text-white flex items-center gap-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2`}
                          >
                            {role}
                            <button 
                              onClick={() => removeRole(user.id, role)}
                              className="ml-1 text-xs hover:text-red-200"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.profile?.is_banned ? (
                        <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80">Banned</div>
                      ) : (
                        <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">Active</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select onValueChange={(role) => assignRole(user.id, role)}>
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Add role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="senior_moderator">Sr. Moderator</SelectItem>
                            <SelectItem value="moderator">Moderator</SelectItem>
                            <SelectItem value="helper">Helper</SelectItem>
                            <SelectItem value="developer">Developer</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {user.profile?.is_banned ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => unbanUser(user.id)}
                          >
                            Unban
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowBanDialog(true);
                            }}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Ban User Dialog */}
      <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              You are about to ban {selectedUser?.email}. This action will prevent them from accessing the server.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="banReason">Reason for ban</Label>
              <Textarea
                id="banReason"
                placeholder="Enter the reason for banning this user..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBanDialog(false);
                  setBanReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedUser && banUser(selectedUser.id, banReason)}
                disabled={!banReason.trim()}
              >
                Ban User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
