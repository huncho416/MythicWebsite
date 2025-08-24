import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Settings, Shield, Calendar, Globe, Mail, Gamepad2, Upload, X } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { validateFileUpload, validateUsername, validateEmail, validateUrl } from "@/lib/security";
import { compressImage } from "@/lib/performance";
import { LazyImage } from "@/components/ui/lazy-image";

export default function Profile() {
  const [profile, setProfile] = useState<Tables<'user_profiles'> | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [profileForm, setProfileForm] = useState({
    username: "",
    bio: "",
    minecraft_username: "",
    birthday: "",
    gender: "",
    timezone: "",
    avatar_url: "",
    location: "",
    website: "",
    discord_username: ""
  });

  const [securityForm, setSecurityForm] = useState({
    email_notifications: true,
    profile_visibility: "public" as "public" | "friends" | "private",
    show_online_status: true,
    allow_friend_requests: true
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to view your profile",
          variant: "destructive"
        });
        return;
      }

      // Get user profile
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Get user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error loading profile:', profileError);
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive"
        });
        return;
      }

      if (rolesError) {
        console.error('Error loading roles:', rolesError);
      }

      setProfile(userProfile);
      setUserRoles(roles?.map(r => r.role) || []);
      
      // Populate forms
      if (userProfile) {
        setProfileForm({
          username: userProfile.username || "",
          bio: userProfile.bio || "",
          minecraft_username: userProfile.minecraft_username || "",
          birthday: (userProfile as any).birthday || "",
          gender: (userProfile as any).gender || "",
          timezone: (userProfile as any).timezone || "",
          avatar_url: userProfile.avatar_url || "",
          location: (userProfile as any).location || "",
          website: (userProfile as any).website || "",
          discord_username: (userProfile as any).discord_username || ""
        });

        setSecurityForm({
          email_notifications: (userProfile as any).email_notifications ?? true,
          profile_visibility: (userProfile as any).profile_visibility || "public",
          show_online_status: (userProfile as any).show_online_status ?? true,
          allow_friend_requests: (userProfile as any).allow_friend_requests ?? true
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Check if username is already taken by another user
      const { data: existingUser, error: checkError } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('username', profileForm.username)
        .neq('user_id', user.id)
        .single();

      if (existingUser) {
        throw new Error('Username is already taken. Please choose a different username.');
      }

      // Prepare the profile data with only valid fields
      const profileData = {
        user_id: user.id,
        username: profileForm.username,
        bio: profileForm.bio,
        minecraft_username: profileForm.minecraft_username,
        avatar_url: profileForm.avatar_url,
        birthday: profileForm.birthday || null,
        gender: profileForm.gender || null,
        timezone: profileForm.timezone || null,
        location: profileForm.location || null,
        website: profileForm.website || null,
        discord_username: profileForm.discord_username || null,
        updated_at: new Date().toISOString()
      };

      // Check if profile exists first
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let error;
      if (existingProfile) {
        // Update existing profile
        const result = await supabase
          .from('user_profiles')
          .update(profileData)
          .eq('user_id', user.id);
        error = result.error;
      } else {
        // Insert new profile
        const result = await supabase
          .from('user_profiles')
          .insert([profileData]);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully"
      });

      loadProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: `Failed to save profile: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const saveSecuritySettings = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Prepare the security data with only valid fields
      const securityData = {
        email_notifications: securityForm.email_notifications,
        profile_visibility: securityForm.profile_visibility,
        show_online_status: securityForm.show_online_status,
        allow_friend_requests: securityForm.allow_friend_requests,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_profiles')
        .update(securityData)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Security settings updated successfully"
      });

      loadProfile();
    } catch (error) {
      console.error('Error saving security settings:', error);
      toast({
        title: "Error",
        description: `Failed to save security settings: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (passwordForm.new_password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.new_password
      });

      if (error) throw error;

      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: ""
      });

      toast({
        title: "Success",
        description: "Password updated successfully"
      });
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: "Failed to change password",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image must be less than 5MB",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update form state
      setProfileForm(prev => ({ ...prev, avatar_url: data.publicUrl }));

      // Automatically save the avatar to the database
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Update the profile state as well
      setProfile(prev => prev ? { ...prev, avatar_url: data.publicUrl } : null);

      toast({
        title: "Success",
        description: "Avatar uploaded and saved successfully"
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update database
      const { error } = await supabase
        .from('user_profiles')
        .update({ avatar_url: null })
        .eq('user_id', user.id);

      if (error) throw error;

      // Update form and profile state
      setProfileForm(prev => ({ ...prev, avatar_url: "" }));
      setProfile(prev => prev ? { ...prev, avatar_url: null } : null);

      toast({
        title: "Success",
        description: "Avatar removed successfully"
      });
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast({
        title: "Error",
        description: "Failed to remove avatar",
        variant: "destructive"
      });
    }
  };

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
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">Loading profile...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">Manage your account information and preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Privacy & Security
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="text-xl">
                    {profile?.username?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">{profile?.username || "User"}</h2>
                  <div className="flex flex-wrap gap-2">
                    {userRoles.map(role => (
                      <Badge 
                        key={role} 
                        className={`${getRoleColor(role)} text-white`}
                      >
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {profile?.bio && (
                <div>
                  <h3 className="font-semibold mb-2">About</h3>
                  <p className="text-muted-foreground">{profile.bio}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profile?.minecraft_username && (
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Minecraft:</span>
                    <span className="font-medium">{profile.minecraft_username}</span>
                  </div>
                )}
                
                {(profile as any)?.location && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Location:</span>
                    <span className="font-medium">{(profile as any).location}</span>
                  </div>
                )}

                {(profile as any)?.birthday && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Birthday:</span>
                    <span className="font-medium">{new Date((profile as any).birthday).toLocaleDateString()}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Joined:</span>
                  <span className="font-medium">{new Date(profile?.created_at || "").toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={profileForm.username}
                    onChange={(e) => setProfileForm({...profileForm, username: e.target.value})}
                    placeholder="Your unique username"
                    pattern="[a-zA-Z0-9_]+"
                    minLength={3}
                    maxLength={20}
                    title="Username can only contain letters, numbers, and underscores"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    3-20 characters, letters, numbers, and underscores only
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minecraft_username">Minecraft Username</Label>
                  <Input
                    id="minecraft_username"
                    value={profileForm.minecraft_username}
                    onChange={(e) => setProfileForm({...profileForm, minecraft_username: e.target.value})}
                    placeholder="Your Minecraft username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discord_username">Discord Username</Label>
                  <Input
                    id="discord_username"
                    value={profileForm.discord_username}
                    onChange={(e) => setProfileForm({...profileForm, discord_username: e.target.value})}
                    placeholder="Your Discord username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthday">Birthday</Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={profileForm.birthday}
                    onChange={(e) => setProfileForm({...profileForm, birthday: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select 
                    value={profileForm.gender} 
                    onValueChange={(value) => setProfileForm({...profileForm, gender: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="non-binary">Non-binary</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={profileForm.timezone}
                    onChange={(e) => setProfileForm({...profileForm, timezone: e.target.value})}
                    placeholder="e.g., UTC, EST, PST"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={profileForm.location}
                    onChange={(e) => setProfileForm({...profileForm, location: e.target.value})}
                    placeholder="Your location"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Avatar Image</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profileForm.avatar_url} />
                    <AvatarFallback className="text-xl">
                      {profileForm.username?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {uploading ? "Uploading..." : "Upload Image"}
                    </Button>
                    {profileForm.avatar_url && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={removeAvatar}
                        className="flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        Remove
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Max 5MB. Supports JPG, PNG, GIF
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={profileForm.website}
                  onChange={(e) => setProfileForm({...profileForm, website: e.target.value})}
                  placeholder="Your website URL"
                />
              </div>

              <Button onClick={saveProfile} disabled={saving}>
                {saving ? "Saving..." : "Save Profile"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your account password for better security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                  placeholder="Enter new password"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm New Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                  placeholder="Confirm new password"
                />
              </div>
              
              <Button 
                onClick={changePassword} 
                disabled={saving || !passwordForm.new_password || !passwordForm.confirm_password}
              >
                {saving ? "Updating..." : "Update Password"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Privacy & Security Settings</CardTitle>
              <CardDescription>Manage your privacy and security preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profile_visibility">Profile Visibility</Label>
                  <Select 
                    value={securityForm.profile_visibility} 
                    onValueChange={(value: any) => setSecurityForm({...securityForm, profile_visibility: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public - Anyone can view</SelectItem>
                      <SelectItem value="friends">Friends Only</SelectItem>
                      <SelectItem value="private">Private - Only you can view</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive email notifications for important updates</p>
                  </div>
                  <Button
                    variant={securityForm.email_notifications ? "default" : "outline"}
                    onClick={() => setSecurityForm({...securityForm, email_notifications: !securityForm.email_notifications})}
                  >
                    {securityForm.email_notifications ? "Enabled" : "Disabled"}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Online Status</Label>
                    <p className="text-sm text-muted-foreground">Let others see when you're online</p>
                  </div>
                  <Button
                    variant={securityForm.show_online_status ? "default" : "outline"}
                    onClick={() => setSecurityForm({...securityForm, show_online_status: !securityForm.show_online_status})}
                  >
                    {securityForm.show_online_status ? "Enabled" : "Disabled"}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Friend Requests</Label>
                    <p className="text-sm text-muted-foreground">Allow other users to send you friend requests</p>
                  </div>
                  <Button
                    variant={securityForm.allow_friend_requests ? "default" : "outline"}
                    onClick={() => setSecurityForm({...securityForm, allow_friend_requests: !securityForm.allow_friend_requests})}
                  >
                    {securityForm.allow_friend_requests ? "Enabled" : "Disabled"}
                  </Button>
                </div>
              </div>

              <Button onClick={saveSecuritySettings} disabled={saving}>
                {saving ? "Saving..." : "Save Security Settings"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="current_password">Current Password</Label>
                  <Input
                    id="current_password"
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                    placeholder="Enter your current password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new_password">New Password</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                    placeholder="Enter a new password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                    placeholder="Confirm your new password"
                  />
                </div>
              </div>

              <Button onClick={changePassword} disabled={saving}>
                {saving ? "Changing..." : "Change Password"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
