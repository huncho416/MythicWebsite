import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Users, Search, Edit2, Shield, Crown, UserX, UserCheck } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

interface UserWithProfile {
  id: string;
  username: string;
  display_name: string | null;
  created_at: string;
  roles: string[];
  profile: Tables<'user_profiles'>;
}

const AVAILABLE_ROLES = [
  'owner',
  'system_admin', 
  'senior_admin',
  'admin',
  'senior_moderator',
  'moderator',
  'helper',
  'developer'
];

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'owner': return 'bg-red-100 text-red-800 border-red-300';
    case 'system_admin': return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'senior_admin': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'admin': return 'bg-green-100 text-green-800 border-green-300';
    case 'senior_moderator': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'moderator': return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'helper': return 'bg-cyan-100 text-cyan-800 border-cyan-300';
    case 'developer': return 'bg-pink-100 text-pink-800 border-pink-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export default function SimplifiedUserManagement() {
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  
  const [editForm, setEditForm] = useState({
    username: "",
    display_name: "",
    bio: ""
  });

  const [selectedRole, setSelectedRole] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Get user profiles
      const { data: userProfiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profileError) {
        throw profileError;
      }

      // Get user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) {
        console.warn('Could not load user roles:', rolesError);
      }

      // Map user profiles with their roles
      const usersWithData: UserWithProfile[] = (userProfiles || []).map(profile => {
        return {
          id: profile.user_id,
          username: profile.username || 'Unknown',
          display_name: profile.display_name,
          created_at: profile.created_at,
          roles: userRoles?.filter(role => role.user_id === profile.user_id).map(role => role.role) || [],
          profile: profile
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

  const openEditDialog = (user: UserWithProfile) => {
    setSelectedUser(user);
    setEditForm({
      username: user.profile.username || "",
      display_name: user.profile.display_name || "",
      bio: user.profile.bio || ""
    });
    setShowEditDialog(true);
  };

  const openRoleDialog = (user: UserWithProfile) => {
    setSelectedUser(user);
    setSelectedRole("");
    setShowRoleDialog(true);
  };

  const updateUserProfile = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          username: editForm.username,
          display_name: editForm.display_name || null,
          bio: editForm.bio || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', selectedUser.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User profile updated successfully",
      });

      setShowEditDialog(false);
      await loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: `Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const assignRole = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      // Check if user already has this role
      const hasRole = selectedUser.roles.includes(selectedRole);
      if (hasRole) {
        toast({
          title: "Info",
          description: "User already has this role",
          variant: "default",
        });
        return;
      }

      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUser.id,
          role: selectedRole as any
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Role ${selectedRole} assigned successfully`,
      });

      setShowRoleDialog(false);
      await loadUsers();
    } catch (error) {
      console.error('Error assigning role:', error);
      toast({
        title: "Error",
        description: `Failed to assign role: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
        .eq('role', role as any); // Type cast to handle role enum

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
        description: `Failed to remove role: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // First, delete all user roles
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (rolesError) {
        console.warn('Error deleting user roles:', rolesError);
      }

      // Then delete the user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Note: We cannot delete the actual auth user without service role access
      // The user's auth record will remain, but their profile and roles are removed

      toast({
        title: "Success",
        description: `User ${username} has been removed from the system`,
      });

      await loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: `Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.display_name && user.display_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    user.roles.some(role => role.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading users...</span>
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
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users by username, display name, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={loadUsers} variant="outline">
              Refresh
            </Button>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">User</th>
                  <th className="text-left p-3 font-semibold">Roles</th>
                  <th className="text-left p-3 font-semibold">Joined</th>
                  <th className="text-left p-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{user.display_name || user.username}</div>
                        <div className="text-sm text-gray-500">@{user.username}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length > 0 ? (
                          user.roles.map((role) => (
                            <Badge
                              key={role}
                              className={`text-xs ${getRoleBadgeColor(role)} cursor-pointer hover:opacity-80`}
                              onClick={() => removeRole(user.id, role)}
                              title="Click to remove role"
                            >
                              {role}
                              <UserX className="h-3 w-3 ml-1" />
                            </Badge>
                          ))
                        ) : (
                          <span className="text-gray-400 text-sm">No roles</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-gray-600">
                        {formatDate(user.created_at)}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openRoleDialog(user)}
                        >
                          <Crown className="h-4 w-4 mr-1" />
                          Role
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteUser(user.id, user.username)}
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No users found matching your search.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>
              Update user profile information for {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                placeholder="Enter username"
              />
            </div>

            <div>
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={editForm.display_name}
                onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                placeholder="Enter display name"
              />
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                placeholder="Enter user bio"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={updateUserProfile}>
              Update Profile
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              Assign a new role to {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="role">Select Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a role to assign" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        {role}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedUser && (
              <div className="text-sm text-gray-600">
                Current roles: {selectedUser.roles.length > 0 ? selectedUser.roles.join(', ') : 'None'}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={assignRole} disabled={!selectedRole}>
              Assign Role
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
