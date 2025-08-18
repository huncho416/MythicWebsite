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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Shield, 
  Ban, 
  Clock, 
  AlertTriangle, 
  User, 
  Search,
  Plus,
  Eye,
  Undo
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

interface UserWithProfile {
  id: string;
  email: string;
  profile?: Tables<'user_profiles'>;
}

export default function ModerationManagement() {
  const [punishments, setPunishments] = useState<any[]>([]);
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Forms state
  const [showPunishmentDialog, setShowPunishmentDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(null);
  const [punishmentForm, setPunishmentForm] = useState({
    type: "warning",
    reason: "",
    duration_minutes: ""
  });

  const { toast } = useToast();

  useEffect(() => {
    loadModerationData();
  }, []);

  const loadModerationData = async () => {
    try {
      setLoading(true);
      
      const [punishmentsRes, usersRes] = await Promise.all([
        supabase.from('user_punishments').select(`
          *,
          user_profile:user_profiles!user_id(username, display_name, email),
          moderator_profile:user_profiles!moderator_id(username, display_name)
        `).order('created_at', { ascending: false }),
        
        supabase.auth.admin.listUsers()
      ]);

      if (punishmentsRes.data) setPunishments(punishmentsRes.data);
      
      if (usersRes.data) {
        // Get user profiles
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('*');

        const usersWithProfiles = usersRes.data.users.map(user => ({
          id: user.id,
          email: user.email || '',
          profile: profiles?.find(p => p.user_id === user.id)
        }));
        
        setUsers(usersWithProfiles);
      }
      
    } catch (error) {
      console.error('Error loading moderation data:', error);
      toast({
        title: "Error",
        description: "Failed to load moderation data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createPunishment = async () => {
    if (!selectedUser) return;

    try {
      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user) throw new Error("Not authenticated");

      const durationMinutes = punishmentForm.duration_minutes ? 
        parseInt(punishmentForm.duration_minutes) : null;

      const expiresAt = durationMinutes ? 
        new Date(Date.now() + durationMinutes * 60 * 1000).toISOString() : null;

      const { error } = await supabase
        .from('user_punishments')
        .insert({
          user_id: selectedUser.id,
          moderator_id: currentUser.data.user.id,
          type: punishmentForm.type,
          reason: punishmentForm.reason,
          duration_minutes: durationMinutes,
          expires_at: expiresAt
        });

      if (error) throw error;

      // If it's a ban, also update the user profile
      if (punishmentForm.type === 'ban') {
        await supabase
          .from('user_profiles')
          .upsert({
            user_id: selectedUser.id,
            is_banned: true,
            ban_reason: punishmentForm.reason
          });
      }

      toast({
        title: "Success",
        description: `${punishmentForm.type} applied successfully`,
      });

      setShowPunishmentDialog(false);
      setPunishmentForm({ type: "warning", reason: "", duration_minutes: "" });
      setSelectedUser(null);
      loadModerationData();
    } catch (error) {
      console.error('Error creating punishment:', error);
      toast({
        title: "Error",
        description: "Failed to apply punishment",
        variant: "destructive",
      });
    }
  };

  const revokePunishment = async (punishmentId: string, userId: string, type: string) => {
    try {
      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('user_punishments')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_by: currentUser.data.user.id
        })
        .eq('id', punishmentId);

      if (error) throw error;

      // If it's a ban being revoked, update user profile
      if (type === 'ban') {
        await supabase
          .from('user_profiles')
          .update({
            is_banned: false,
            ban_reason: null
          })
          .eq('user_id', userId);
      }

      toast({
        title: "Success",
        description: `${type} revoked successfully`,
      });

      loadModerationData();
    } catch (error) {
      console.error('Error revoking punishment:', error);
      toast({
        title: "Error",
        description: "Failed to revoke punishment",
        variant: "destructive",
      });
    }
  };

  const getPunishmentColor = (type: string) => {
    const colors: Record<string, string> = {
      warning: "bg-yellow-500",
      mute: "bg-orange-500",
      kick: "bg-red-500",
      ban: "bg-red-700"
    };
    return colors[type] || "bg-gray-500";
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "Permanent";
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  const filteredPunishments = punishments.filter(punishment => {
    if (activeTab === 'active') return punishment.is_active;
    if (activeTab === 'expired') return !punishment.is_active || (punishment.expires_at && new Date(punishment.expires_at) < new Date());
    return true;
  });

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.profile?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.profile?.minecraft_username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">Loading moderation data...</div>
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
            Moderation Management
          </CardTitle>
          <CardDescription>
            Manage user punishments and moderation actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="active">Active Punishments</TabsTrigger>
              <TabsTrigger value="expired">Expired/Revoked</TabsTrigger>
              <TabsTrigger value="users">Punish User</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Moderator</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPunishments.map((punishment) => (
                      <TableRow key={punishment.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {punishment.user_profile?.display_name || 
                               punishment.user_profile?.username || 
                               punishment.user_profile?.email ||
                               "Unknown User"}
                            </div>
                            {punishment.user_profile?.minecraft_username && (
                              <div className="text-sm text-muted-foreground">
                                MC: {punishment.user_profile.minecraft_username}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPunishmentColor(punishment.type)}>
                            {punishment.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="text-sm line-clamp-2">{punishment.reason}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDuration(punishment.duration_minutes)}
                          {punishment.expires_at && (
                            <div className="text-xs text-muted-foreground">
                              Expires: {new Date(punishment.expires_at).toLocaleString()}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {punishment.moderator_profile?.display_name || 
                           punishment.moderator_profile?.username || 
                           "Unknown"}
                        </TableCell>
                        <TableCell>
                          {new Date(punishment.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {punishment.is_active && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => revokePunishment(punishment.id, punishment.user_id, punishment.type)}
                            >
                              <Undo className="h-4 w-4 mr-1" />
                              Revoke
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="expired" className="space-y-4">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Moderator</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {punishments.filter(p => !p.is_active || (p.expires_at && new Date(p.expires_at) < new Date())).map((punishment) => (
                      <TableRow key={punishment.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {punishment.user_profile?.display_name || 
                               punishment.user_profile?.username || 
                               punishment.user_profile?.email ||
                               "Unknown User"}
                            </div>
                            {punishment.user_profile?.minecraft_username && (
                              <div className="text-sm text-muted-foreground">
                                MC: {punishment.user_profile.minecraft_username}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getPunishmentColor(punishment.type)}>
                            {punishment.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="text-sm line-clamp-2">{punishment.reason}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDuration(punishment.duration_minutes)}
                        </TableCell>
                        <TableCell>
                          {punishment.moderator_profile?.display_name || 
                           punishment.moderator_profile?.username || 
                           "Unknown"}
                        </TableCell>
                        <TableCell>
                          {new Date(punishment.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {punishment.revoked_at ? "Revoked" : "Expired"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users to punish..."
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
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.slice(0, 20).map((user) => (
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
                          {user.profile?.is_banned ? (
                            <Badge variant="destructive">Banned</Badge>
                          ) : (
                            <Badge variant="default">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Dialog 
                            open={showPunishmentDialog && selectedUser?.id === user.id} 
                            onOpenChange={(open) => {
                              setShowPunishmentDialog(open);
                              if (!open) setSelectedUser(null);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setSelectedUser(user)}
                                disabled={user.profile?.is_banned}
                              >
                                <AlertTriangle className="h-4 w-4 mr-1" />
                                Punish
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Punish User</DialogTitle>
                                <DialogDescription>
                                  Apply a punishment to {user.email}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="punishmentType">Punishment Type</Label>
                                  <Select 
                                    value={punishmentForm.type}
                                    onValueChange={(value) => setPunishmentForm({...punishmentForm, type: value})}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="warning">Warning</SelectItem>
                                      <SelectItem value="mute">Mute</SelectItem>
                                      <SelectItem value="kick">Kick</SelectItem>
                                      <SelectItem value="ban">Ban</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {punishmentForm.type !== 'warning' && punishmentForm.type !== 'kick' && (
                                  <div>
                                    <Label htmlFor="duration">Duration (minutes, leave empty for permanent)</Label>
                                    <Input
                                      id="duration"
                                      type="number"
                                      value={punishmentForm.duration_minutes}
                                      onChange={(e) => setPunishmentForm({...punishmentForm, duration_minutes: e.target.value})}
                                      placeholder="e.g., 60 for 1 hour"
                                    />
                                  </div>
                                )}
                                
                                <div>
                                  <Label htmlFor="reason">Reason</Label>
                                  <Textarea
                                    id="reason"
                                    value={punishmentForm.reason}
                                    onChange={(e) => setPunishmentForm({...punishmentForm, reason: e.target.value})}
                                    placeholder="Enter the reason for this punishment..."
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setShowPunishmentDialog(false);
                                    setSelectedUser(null);
                                    setPunishmentForm({ type: "warning", reason: "", duration_minutes: "" });
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={createPunishment}
                                  disabled={!punishmentForm.reason.trim()}
                                >
                                  Apply Punishment
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
