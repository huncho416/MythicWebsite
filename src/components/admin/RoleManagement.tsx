import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Plus, Pencil, Trash2, Shield, Crown, Users } from "lucide-react";

export default function RoleManagement() {
  const [roles, setRoles] = useState<Tables<'roles'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Tables<'roles'> | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: "",
    description: "",
    color: "#ffffff",
    prefix: "",
    priority: 0,
    permissions: {
      admin_access: false,
      manage_users: false,
      manage_forums: false,
      manage_store: false,
      manage_support: false,
      moderate_content: false,
      view_admin_logs: false,
      manage_roles: false
    }
  });

  const { toast } = useToast();

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error('Error loading roles:', error);
      toast({
        title: "Error",
        description: "Failed to load roles",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const roleData = {
        name: roleForm.name,
        description: roleForm.description,
        color: roleForm.color,
        prefix: roleForm.prefix,
        priority: roleForm.priority,
        permissions: roleForm.permissions
      };

      if (editingRole) {
        const { error } = await supabase
          .from('roles')
          .update(roleData)
          .eq('id', editingRole.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Role updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('roles')
          .insert([roleData]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Role created successfully"
        });
      }

      setDialogOpen(false);
      resetForm();
      loadRoles();
    } catch (error) {
      console.error('Error saving role:', error);
      toast({
        title: "Error",
        description: "Failed to save role",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (role: Tables<'roles'>) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description || "",
      color: role.color || "#ffffff",
      prefix: role.prefix || "",
      priority: role.priority || 0,
      permissions: (role.permissions as any) || {
        admin_access: false,
        manage_users: false,
        manage_forums: false,
        manage_store: false,
        manage_support: false,
        moderate_content: false,
        view_admin_logs: false,
        manage_roles: false
      }
    });
    setDialogOpen(true);
  };

  const handleDelete = async (role: Tables<'roles'>) => {
    if (!confirm(`Are you sure you want to delete the role "${role.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', role.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Role deleted successfully"
      });
      loadRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast({
        title: "Error",
        description: "Failed to delete role",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setEditingRole(null);
    setRoleForm({
      name: "",
      description: "",
      color: "#ffffff",
      prefix: "",
      priority: 0,
      permissions: {
        admin_access: false,
        manage_users: false,
        manage_forums: false,
        manage_store: false,
        manage_support: false,
        moderate_content: false,
        view_admin_logs: false,
        manage_roles: false
      }
    });
  };

  const updatePermission = (permission: string, value: boolean) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: value
      }
    }));
  };

  const getRoleIcon = (priority: number) => {
    if (priority >= 100) return <Crown className="h-4 w-4" />;
    if (priority >= 50) return <Shield className="h-4 w-4" />;
    return <Users className="h-4 w-4" />;
  };

  const getPermissionCount = (permissions: any) => {
    if (!permissions) return 0;
    return Object.values(permissions).filter(Boolean).length;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Role Management
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Role Name</Label>
                  <Input
                    id="name"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prefix">Prefix (optional)</Label>
                  <Input
                    id="prefix"
                    value={roleForm.prefix}
                    onChange={(e) => setRoleForm(prev => ({ ...prev, prefix: e.target.value }))}
                    placeholder="[ADMIN]"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    type="color"
                    value={roleForm.color}
                    onChange={(e) => setRoleForm(prev => ({ ...prev, color: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority (0-100)</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="0"
                    max="100"
                    value={roleForm.priority}
                    onChange={(e) => setRoleForm(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this role's purpose..."
                />
              </div>

              <div className="space-y-3">
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(roleForm.permissions).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={key}
                        checked={value}
                        onCheckedChange={(checked) => updatePermission(key, !!checked)}
                      />
                      <Label htmlFor={key} className="text-sm">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingRole ? 'Update Role' : 'Create Role'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading roles...</p>
        ) : roles.length === 0 ? (
          <p className="text-muted-foreground">No roles found. Create your first role!</p>
        ) : (
          <div className="space-y-3">
            {roles.map((role) => (
              <div key={role.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getRoleIcon(role.priority || 0)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold" style={{ color: role.color }}>
                        {role.prefix && `${role.prefix} `}{role.name}
                      </span>
                      <Badge variant="secondary">
                        Priority: {role.priority || 0}
                      </Badge>
                      <Badge variant="outline">
                        {getPermissionCount(role.permissions)} permissions
                      </Badge>
                    </div>
                    {role.description && (
                      <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(role)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(role)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
