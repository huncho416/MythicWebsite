import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface UserProfile {
  id: string;
  username: string;
  display_name: string;
}

interface UserPunishment {
  id: string;
  user_id: string;
  moderator_id: string;
  type: string;
  reason: string;
  duration_minutes: number | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
}

interface PunishmentWithUser extends UserPunishment {
  user?: UserProfile;
  moderator?: UserProfile;
  revoker?: UserProfile;
}

export default function ModerationManagement() {
  const [punishments, setPunishments] = useState<PunishmentWithUser[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // New punishment form state
  const [newPunishment, setNewPunishment] = useState({
    type: "",
    reason: "",
    duration_minutes: "",
    user_id: ""
  });

  useEffect(() => {
    loadPunishments();
    loadUsers();
  }, []);

  const loadPunishments = async () => {
    try {
      setLoading(true);
      
      // Get punishments
      const { data: punishmentsData, error: punishmentsError } = await supabase
        .from("user_punishments")
        .select("*")
        .order("created_at", { ascending: false });

      if (punishmentsError) throw punishmentsError;

      // Get unique user IDs from punishments
      const userIds = new Set<string>();
      const moderatorIds = new Set<string>();
      const revokerIds = new Set<string>();

      punishmentsData?.forEach((punishment) => {
        userIds.add(punishment.user_id);
        moderatorIds.add(punishment.moderator_id);
        if (punishment.revoked_by) revokerIds.add(punishment.revoked_by);
      });

      const allUserIds = Array.from(new Set([...userIds, ...moderatorIds, ...revokerIds]));

      // Get user profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("user_profiles")
        .select("id, username, display_name")
        .in("id", allUserIds);

      if (profilesError) throw profilesError;

      // Create lookup map
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Combine data
      const punishmentsWithUsers = punishmentsData?.map((punishment) => ({
        ...punishment,
        user: profilesMap.get(punishment.user_id),
        moderator: profilesMap.get(punishment.moderator_id),
        revoker: punishment.revoked_by ? profilesMap.get(punishment.revoked_by) : undefined
      })) || [];

      setPunishments(punishmentsWithUsers);
    } catch (error: any) {
      console.error("Error loading punishments:", error);
      toast({
        title: "Error",
        description: "Failed to load punishments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, username, display_name")
        .order("username");

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Error loading users:", error);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) return [];
    
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, username, display_name")
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error searching users:", error);
      return [];
    }
  };

  const createPunishment = async () => {
    if (!newPunishment.user_id || !newPunishment.type || !newPunishment.reason) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const duration = newPunishment.duration_minutes ? parseInt(newPunishment.duration_minutes) : null;
      const expiresAt = duration ? new Date(Date.now() + duration * 60 * 1000).toISOString() : null;

      const { error } = await supabase
        .from("user_punishments")
        .insert({
          user_id: newPunishment.user_id,
          moderator_id: user.id,
          type: newPunishment.type,
          reason: newPunishment.reason,
          duration_minutes: duration,
          expires_at: expiresAt,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Punishment created successfully"
      });

      setNewPunishment({
        type: "",
        reason: "",
        duration_minutes: "",
        user_id: ""
      });
      setSelectedUser(null);
      loadPunishments();
    } catch (error: any) {
      console.error("Error creating punishment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create punishment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const revokePunishment = async (punishmentId: string) => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_punishments")
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_by: user.id
        })
        .eq("id", punishmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Punishment revoked successfully"
      });

      loadPunishments();
    } catch (error: any) {
      console.error("Error revoking punishment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to revoke punishment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPunishmentBadgeVariant = (type: string) => {
    switch (type) {
      case "ban": return "destructive";
      case "mute": return "secondary";
      case "warning": return "outline";
      case "kick": return "default";
      default: return "default";
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "Permanent";
    
    if (minutes < 60) return `${minutes} minutes`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} hours`;
    return `${Math.round(minutes / 1440)} days`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Moderation Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="punishments" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="punishments">Active Punishments</TabsTrigger>
              <TabsTrigger value="create">Create Punishment</TabsTrigger>
            </TabsList>

            <TabsContent value="punishments" className="space-y-4">
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">Loading punishments...</div>
                ) : punishments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No punishments found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {punishments.map((punishment) => (
                      <Card key={punishment.id} className={`${!punishment.is_active ? 'opacity-60' : ''}`}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant={getPunishmentBadgeVariant(punishment.type)}>
                                  {punishment.type.toUpperCase()}
                                </Badge>
                                {!punishment.is_active && (
                                  <Badge variant="outline">REVOKED</Badge>
                                )}
                              </div>
                              <div>
                                <p className="font-medium">
                                  User: {punishment.user?.username || punishment.user?.display_name || "Unknown User"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Moderator: {punishment.moderator?.username || punishment.moderator?.display_name || "Unknown Moderator"}
                                </p>
                              </div>
                              <p className="text-sm">
                                <span className="font-medium">Reason:</span> {punishment.reason}
                              </p>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <p>Duration: {formatDuration(punishment.duration_minutes)}</p>
                                <p>Created: {format(new Date(punishment.created_at), "PPpp")}</p>
                                {punishment.expires_at && (
                                  <p>Expires: {format(new Date(punishment.expires_at), "PPpp")}</p>
                                )}
                                {punishment.revoked_at && (
                                  <p>
                                    Revoked: {format(new Date(punishment.revoked_at), "PPpp")} 
                                    {punishment.revoker && ` by ${punishment.revoker.username || punishment.revoker.display_name}`}
                                  </p>
                                )}
                              </div>
                            </div>
                            {punishment.is_active && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    Revoke
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Revoke Punishment</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to revoke this {punishment.type}? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => revokePunishment(punishment.id)}
                                      disabled={loading}
                                    >
                                      Revoke
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="create" className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="user-search">Search User</Label>
                  <div className="space-y-2">
                    <Input
                      id="user-search"
                      placeholder="Search by username or display name..."
                      value={searchUser}
                      onChange={async (e) => {
                        setSearchUser(e.target.value);
                        if (e.target.value.length >= 2) {
                          const results = await searchUsers(e.target.value);
                          if (results.length === 1) {
                            setSelectedUser(results[0]);
                            setNewPunishment(prev => ({ ...prev, user_id: results[0].id }));
                          }
                        }
                      }}
                    />
                    {selectedUser && (
                      <div className="flex items-center gap-2 p-2 bg-muted rounded">
                        <span className="text-sm">
                          Selected: {selectedUser.username || selectedUser.display_name}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(null);
                            setNewPunishment(prev => ({ ...prev, user_id: "" }));
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="punishment-type">Punishment Type</Label>
                  <Select
                    value={newPunishment.type}
                    onValueChange={(value) => setNewPunishment(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select punishment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="mute">Mute</SelectItem>
                      <SelectItem value="kick">Kick</SelectItem>
                      <SelectItem value="ban">Ban</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="punishment-reason">Reason</Label>
                  <Textarea
                    id="punishment-reason"
                    placeholder="Enter the reason for this punishment..."
                    value={newPunishment.reason}
                    onChange={(e) => setNewPunishment(prev => ({ ...prev, reason: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="punishment-duration">Duration (minutes)</Label>
                  <Input
                    id="punishment-duration"
                    type="number"
                    placeholder="Leave empty for permanent punishment"
                    value={newPunishment.duration_minutes}
                    onChange={(e) => setNewPunishment(prev => ({ ...prev, duration_minutes: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Common durations: 60 (1 hour), 1440 (24 hours), 10080 (7 days)
                  </p>
                </div>

                <Button
                  onClick={createPunishment}
                  disabled={loading || !selectedUser || !newPunishment.type || !newPunishment.reason}
                  className="w-full"
                >
                  {loading ? "Creating..." : "Create Punishment"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
