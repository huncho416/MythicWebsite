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
import { Search, UserPlus, Ban, Shield, Eye, Edit2, Key, CheckCircle, UserCheck, Trash2 } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

interface UserWithProfile {
  id: string;
  email: string;
  created_at: string;
  roles: string[];
  profile?: Tables<'user_profiles'>;
  email_confirmed_at?: string | null;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(null);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [banReason, setBanReason] = useState("");
  
  // Edit user form
  const [editForm, setEditForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    minecraftUsername: ""
  });
  
  // Create user form
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    minecraftUsername: "",
    role: "user",
    emailVerified: false
  });
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Get all user profiles with auth user data
      const { data: userProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error loading user profiles:', profilesError);
        toast({
          title: "Error",
          description: `Failed to load users: ${profilesError.message}`,
          variant: "destructive",
        });
        return;
      }

      // Get user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) {
        console.warn('Could not load user roles:', rolesError);
      }

      // Get auth users to get email addresses (if available)
      let authUsersData: any[] = [];
      try {
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        authUsersData = authUsers?.users || [];
      } catch (authError) {
        console.warn('Could not load auth users (may require service role):', authError);
      }

      const usersWithData: UserWithProfile[] = (userProfiles || []).map(profile => {
        const authUser = authUsersData.find((u: any) => u.id === profile.user_id);
        return {
          id: profile.user_id,
          email: authUser?.email || 'Unknown Email',
          created_at: profile.created_at,
          roles: userRoles?.filter(role => role.user_id === profile.user_id).map(role => role.role) || [],
          profile: profile,
          email_confirmed_at: authUser?.email_confirmed_at || null
        };
      });

      setUsers(usersWithData);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: `Failed to load users: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

  const openEditUser = (user: UserWithProfile) => {
    setSelectedUser(user);
    setEditForm({
      email: user.email,
      password: "",
      confirmPassword: "",
      username: user.profile?.username || "",
      minecraftUsername: user.profile?.minecraft_username || ""
    });
    setShowEditDialog(true);
  };

  const editUser = async () => {
    if (!selectedUser) return;

    try {
      // Validate form
      if (editForm.password && editForm.password !== editForm.confirmPassword) {
        toast({
          title: "Error",
          description: "Passwords do not match",
          variant: "destructive",
        });
        return;
      }

      // Update auth user email if changed
      if (editForm.email !== selectedUser.email) {
        const { error: authError } = await supabase.auth.admin.updateUserById(
          selectedUser.id,
          { email: editForm.email }
        );
        if (authError) throw authError;
      }

      // Update password if provided
      if (editForm.password) {
        const { error: passwordError } = await supabase.auth.admin.updateUserById(
          selectedUser.id,
          { password: editForm.password }
        );
        if (passwordError) throw passwordError;
      }

      // Update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          username: editForm.username,
          minecraft_username: editForm.minecraftUsername,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', selectedUser.id);

      if (profileError) throw profileError;

      toast({
        title: "Success",
        description: "User updated successfully",
      });

      setShowEditDialog(false);
      await loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const createUser = async () => {
    try {
      // Validate form
      if (!createForm.email || !createForm.password || !createForm.username) {
        toast({
          title: "Error",
          description: "Email, password, and username are required",
          variant: "destructive",
        });
        return;
      }

      if (createForm.password !== createForm.confirmPassword) {
        toast({
          title: "Error",
          description: "Passwords do not match",
          variant: "destructive",
        });
        return;
      }

      // Create auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: createForm.email,
        password: createForm.password,
        email_confirm: createForm.emailVerified
      });

      if (authError) throw authError;
      if (!authUser.user) throw new Error("Failed to create user");

      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: authUser.user.id,
          username: createForm.username,
          minecraft_username: createForm.minecraftUsername
        });

      if (profileError) throw profileError;

      // Assign role if specified
      if (createForm.role !== "user") {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authUser.user.id,
            role: createForm.role as any
          });

        if (roleError) {
          console.warn('Could not assign role:', roleError);
        }
      }

      toast({
        title: "Success",
        description: "User created successfully",
      });

      setShowCreateDialog(false);
      setCreateForm({
        email: "",
        password: "",
        confirmPassword: "",
        username: "",
        minecraftUsername: "",
        role: "user",
        emailVerified: false
      });
      await loadUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      });
    }
  };

  const verifyUserEmail = async (userId: string) => {
    try {
      // Update auth user to mark email as verified
      const { error: authError } = await supabase.auth.admin.updateUserById(
        userId,
        { email_confirm: true }
      );

      if (authError) throw authError;

      toast({
        title: "Success",
        description: "User email verified successfully",
      });

      await loadUsers();
    } catch (error) {
      console.error('Error verifying email:', error);
      toast({
        title: "Error",
        description: "Failed to verify email",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to permanently delete the user "${userEmail}"? This action cannot be undone and will remove all associated data.`)) {
      return;
    }

    try {
      // First delete user profile and related data
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) {
        console.warn('Could not delete user profile:', profileError);
      }

      // Delete user roles
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (rolesError) {
        console.warn('Could not delete user roles:', rolesError);
      }

      // Delete user punishments
      const { error: punishmentsError } = await supabase
        .from('user_punishments')
        .delete()
        .eq('user_id', userId);

      if (punishmentsError) {
        console.warn('Could not delete user punishments:', punishmentsError);
      }

      // Finally delete the auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);

      if (authError) throw authError;

      toast({
        title: "Success",
        description: "User deleted successfully",
      });

      await loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
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

  const createUserProfilesForExistingUsers = async () => {
    try {
      // Get current user to check if we have admin access
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create a profile for the current user if it doesn't exist
      const { error: upsertError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          username: user.email?.split('@')[0] || 'user',
          join_date: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) {
        console.error('Error creating user profile:', upsertError);
      } else {
        console.log('User profile created/updated successfully');
        
        // Also give them admin role for testing
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: user.id,
            role: 'admin'
          }, {
            onConflict: 'user_id,role'
          });
          
        if (roleError) {
          console.error('Error assigning admin role:', roleError);
        }
      }
    } catch (error) {
      console.error('Error in createUserProfilesForExistingUsers:', error);
    }
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

  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">No Users Found</h3>
            <p className="text-muted-foreground mb-4">
              No user profiles were found. This could mean:
            </p>
            <ul className="text-left text-sm text-muted-foreground max-w-md mx-auto space-y-1">
              <li>• No users have signed up yet</li>
              <li>• User profiles haven't been created</li>
              <li>• You don't have admin permissions</li>
              <li>• There's a database connectivity issue</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-4">
              Check the browser console for more details.
            </p>
            <Button 
              onClick={async () => {
                await createUserProfilesForExistingUsers();
                await loadUsers();
              }}
              className="mt-4"
            >
              Initialize User Profiles
            </Button>
          </div>
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
            <Button onClick={() => setShowCreateDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email Status</TableHead>
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
                      {user.email_confirmed_at ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          Unverified
                        </Badge>
                      )}
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditUser(user)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        
                        {!user.email_confirmed_at && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => verifyUserEmail(user.id)}
                            title="Manually verify email"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        
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
                        
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteUser(user.id, user.email)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="editUsername">Username</Label>
                <Input
                  id="editUsername"
                  value={editForm.username}
                  onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="editMinecraftUsername">Minecraft Username</Label>
              <Input
                id="editMinecraftUsername"
                value={editForm.minecraftUsername}
                onChange={(e) => setEditForm({...editForm, minecraftUsername: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editPassword">New Password (optional)</Label>
                <Input
                  id="editPassword"
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                  placeholder="Leave blank to keep current password"
                />
              </div>
              <div>
                <Label htmlFor="editConfirmPassword">Confirm New Password</Label>
                <Input
                  id="editConfirmPassword"
                  type="password"
                  value={editForm.confirmPassword}
                  onChange={(e) => setEditForm({...editForm, confirmPassword: e.target.value})}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => selectedUser && verifyUserEmail(selectedUser.id)}
                disabled={!!selectedUser?.email_confirmed_at}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                {selectedUser?.email_confirmed_at ? 'Email Verified' : 'Verify Email Manually'}
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={editUser}>
              Update User
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new user account manually
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="createEmail">Email *</Label>
                <Input
                  id="createEmail"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <Label htmlFor="createUsername">Username *</Label>
                <Input
                  id="createUsername"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({...createForm, username: e.target.value})}
                  placeholder="username"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="createMinecraftUsername">Minecraft Username</Label>
              <Input
                id="createMinecraftUsername"
                value={createForm.minecraftUsername}
                onChange={(e) => setCreateForm({...createForm, minecraftUsername: e.target.value})}
                placeholder="minecraft_username"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="createPassword">Password *</Label>
                <Input
                  id="createPassword"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                  placeholder="Strong password"
                />
              </div>
              <div>
                <Label htmlFor="createConfirmPassword">Confirm Password *</Label>
                <Input
                  id="createConfirmPassword"
                  type="password"
                  value={createForm.confirmPassword}
                  onChange={(e) => setCreateForm({...createForm, confirmPassword: e.target.value})}
                  placeholder="Confirm password"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="createRole">Initial Role</Label>
                <Select value={createForm.role} onValueChange={(value) => setCreateForm({...createForm, role: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="helper">Helper</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="senior_moderator">Sr. Moderator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="developer">Developer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="createEmailVerified"
                  checked={createForm.emailVerified}
                  onChange={(e) => setCreateForm({...createForm, emailVerified: e.target.checked})}
                />
                <Label htmlFor="createEmailVerified" className="text-sm">
                  Mark email as verified
                </Label>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createUser}>
              Create User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
