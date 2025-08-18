import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  Settings, 
  Plus, 
  Edit2, 
  Trash2, 
  Save,
  Globe,
  Lock,
  Server,
  CreditCard,
  MessageSquare,
  Users
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

export default function SettingsManagement() {
  const [settings, setSettings] = useState<Tables<'site_settings'>[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("general");
  const [editingSettings, setEditingSettings] = useState<Record<string, any>>({});
  
  // Forms state
  const [showSettingDialog, setShowSettingDialog] = useState(false);
  const [settingForm, setSettingForm] = useState({
    key: "",
    value: "",
    description: "",
    category: "general",
    is_public: false
  });

  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
    loadPackages();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      
      setSettings(data || []);
      
      // Initialize editing state
      const editingState: Record<string, any> = {};
      data?.forEach(setting => {
        try {
          editingState[setting.key] = typeof setting.value === 'string' 
            ? JSON.parse(setting.value) 
            : setting.value;
        } catch {
          editingState[setting.key] = setting.value;
        }
      });
      setEditingSettings(editingState);
      
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('store_packages')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error loading packages:', error);
    }
  };

  const createSetting = async () => {
    try {
      let value;
      try {
        // Try to parse as JSON first
        value = JSON.parse(settingForm.value);
      } catch {
        // If that fails, treat as string
        value = settingForm.value;
      }

      const { error } = await supabase
        .from('site_settings')
        .insert({
          key: settingForm.key,
          value: JSON.stringify(value),
          description: settingForm.description,
          category: settingForm.category,
          is_public: settingForm.is_public
        });

      if (error) throw error;

      toast({ title: "Success", description: "Setting created successfully" });
      setShowSettingDialog(false);
      setSettingForm({
        key: "", value: "", description: "", category: "general", is_public: false
      });
      loadSettings();
    } catch (error) {
      console.error('Error creating setting:', error);
      toast({
        title: "Error",
        description: "Failed to create setting",
        variant: "destructive",
      });
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      const { error } = await supabase
        .from('site_settings')
        .update({ 
          value: JSON.stringify(value),
          updated_at: new Date().toISOString()
        })
        .eq('key', key);

      if (error) throw error;

      toast({ title: "Success", description: "Setting updated successfully" });
      loadSettings();
    } catch (error) {
      console.error('Error updating setting:', error);
      toast({
        title: "Error",
        description: "Failed to update setting",
        variant: "destructive",
      });
    }
  };

  const deleteSetting = async (id: string) => {
    try {
      const { error } = await supabase
        .from('site_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Success", description: "Setting deleted successfully" });
      loadSettings();
    } catch (error) {
      console.error('Error deleting setting:', error);
      toast({
        title: "Error",
        description: "Failed to delete setting",
        variant: "destructive",
      });
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    setEditingSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveAllSettings = async () => {
    try {
      const updatePromises = Object.entries(editingSettings).map(([key, value]) => {
        return supabase
          .from('site_settings')
          .update({ 
            value: JSON.stringify(value),
            updated_at: new Date().toISOString()
          })
          .eq('key', key);
      });

      await Promise.all(updatePromises);

      toast({ title: "Success", description: "All settings saved successfully" });
      loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      general: Globe,
      store: CreditCard,
      forum: MessageSquare,
      support: Users,
      payments: CreditCard,
      social: Users,
      featured: Server
    };
    return icons[category] || Settings;
  };

  const renderSettingInput = (setting: Tables<'site_settings'>) => {
    const value = editingSettings[setting.key];
    
    // Special handling for featured package selection
    if (setting.key === 'featured_package_id') {
      return (
        <Select 
          value={value || ''} 
          onValueChange={(selectedValue) => handleSettingChange(setting.key, selectedValue)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select featured package" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No featured package</SelectItem>
            {packages.map((pkg) => (
              <SelectItem key={pkg.id} value={pkg.id}>
                {pkg.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    
    if (typeof value === 'boolean') {
      return (
        <Switch
          checked={value}
          onCheckedChange={(checked) => handleSettingChange(setting.key, checked)}
        />
      );
    }
    
    if (typeof value === 'number') {
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) => handleSettingChange(setting.key, parseFloat(e.target.value))}
        />
      );
    }
    
    if (typeof value === 'string' && value.length > 50) {
      return (
        <Textarea
          value={value}
          onChange={(e) => handleSettingChange(setting.key, e.target.value)}
          rows={2}
        />
      );
    }
    
    return (
      <Input
        value={value || ''}
        onChange={(e) => handleSettingChange(setting.key, e.target.value)}
      />
    );
  };

  const settingsByCategory = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, Tables<'site_settings'>[]>);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">Loading settings...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings Management
          </CardTitle>
          <CardDescription>
            Configure system settings and preferences
          </CardDescription>
          <div className="flex gap-2">
            <Dialog open={showSettingDialog} onOpenChange={setShowSettingDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Setting
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Setting</DialogTitle>
                  <DialogDescription>
                    Add a new system setting
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="settingKey">Key</Label>
                      <Input
                        id="settingKey"
                        value={settingForm.key}
                        onChange={(e) => setSettingForm({...settingForm, key: e.target.value})}
                        placeholder="setting_key"
                      />
                    </div>
                    <div>
                      <Label htmlFor="settingCategory">Category</Label>
                      <Select 
                        value={settingForm.category}
                        onValueChange={(value) => setSettingForm({...settingForm, category: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="store">Store</SelectItem>
                          <SelectItem value="forum">Forum</SelectItem>
                          <SelectItem value="support">Support</SelectItem>
                          <SelectItem value="payments">Payments</SelectItem>
                          <SelectItem value="social">Social</SelectItem>
                          <SelectItem value="featured">Featured</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="settingValue">Value (JSON format)</Label>
                    <Textarea
                      id="settingValue"
                      value={settingForm.value}
                      onChange={(e) => setSettingForm({...settingForm, value: e.target.value})}
                      placeholder='"text value" or true or 123 or {"key": "value"}'
                    />
                  </div>
                  <div>
                    <Label htmlFor="settingDescription">Description</Label>
                    <Input
                      id="settingDescription"
                      value={settingForm.description}
                      onChange={(e) => setSettingForm({...settingForm, description: e.target.value})}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isPublic"
                      checked={settingForm.is_public}
                      onCheckedChange={(checked) => setSettingForm({...settingForm, is_public: checked})}
                    />
                    <Label htmlFor="isPublic">Public setting (visible to users)</Label>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowSettingDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createSetting}>Create Setting</Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button onClick={saveAllSettings}>
              <Save className="h-4 w-4 mr-2" />
              Save All Changes
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              {Object.keys(settingsByCategory).map(category => {
                const Icon = getCategoryIcon(category);
                return (
                  <TabsTrigger key={category} value={category} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {Object.entries(settingsByCategory).map(([category, categorySettings]) => (
              <TabsContent key={category} value={category} className="space-y-4">
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Setting</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Visibility</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categorySettings.map((setting) => (
                        <TableRow key={setting.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{setting.key}</div>
                              <div className="text-sm text-muted-foreground">
                                {setting.description}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              {renderSettingInput(setting)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={setting.is_public ? "default" : "secondary"}>
                              {setting.is_public ? (
                                <>
                                  <Globe className="h-3 w-3 mr-1" />
                                  Public
                                </>
                              ) : (
                                <>
                                  <Lock className="h-3 w-3 mr-1" />
                                  Private
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateSetting(setting.key, editingSettings[setting.key])}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteSetting(setting.id)}
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
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
