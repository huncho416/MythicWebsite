import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Star, Upload, Image as ImageIcon, Package } from "lucide-react";

interface FeaturedProductForm {
  packageId: string;
  customName: string;
  customPrice: string;
  customImage: string;
  usePackageData: boolean;
}

export default function FeaturedProductManagement() {
  const [packages, setPackages] = useState<Tables<'store_packages'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [featuredForm, setFeaturedForm] = useState<FeaturedProductForm>({
    packageId: "",
    customName: "",
    customPrice: "",
    customImage: "",
    usePackageData: true
  });
  const [currentFeatured, setCurrentFeatured] = useState<{
    packageId?: string;
    name: string;
    price: string;
    image: string;
    usePackageData: boolean;
  }>({
    name: "VIP",
    price: "9.99",
    image: "",
    usePackageData: true
  });

  const { toast } = useToast();

  useEffect(() => {
    loadPackages();
    loadCurrentFeatured();
  }, []);

  const loadPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('store_packages')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error loading packages:', error);
      toast({
        title: "Error",
        description: "Failed to load packages",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentFeatured = async () => {
    try {
      // First check for package-based featured product
      const { data: packageIdSetting, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'featured_package_id')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (packageIdSetting?.value) {
        let packageId;
        try {
          packageId = JSON.parse(String(packageIdSetting.value));
        } catch {
          packageId = String(packageIdSetting.value);
        }

        const { data: packageData, error: packageError } = await supabase
          .from('store_packages')
          .select('name, price, image_url')
          .eq('id', packageId)
          .maybeSingle();

        if (packageError) {
          console.error('Error loading package data:', packageError);
        }

        if (packageData) {
          setCurrentFeatured({
            packageId: packageId,
            name: packageData.name,
            price: packageData.price.toString(),
            image: packageData.image_url || "",
            usePackageData: true
          });
          setFeaturedForm({
            packageId: packageId,
            customName: "",
            customPrice: "",
            customImage: "",
            usePackageData: true
          });
          return;
        }
      }

      // Fallback to custom settings
      const { data: settings } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['featured_product_name', 'featured_product_price', 'featured_product_image']);

      const settingsMap = (settings || []).reduce((acc, setting) => {
        try {
          acc[setting.key] = typeof setting.value === 'string' 
            ? JSON.parse(setting.value) 
            : setting.value;
        } catch {
          acc[setting.key] = setting.value;
        }
        return acc;
      }, {} as any);

      setCurrentFeatured({
        name: settingsMap.featured_product_name || "VIP",
        price: settingsMap.featured_product_price || "9.99",
        image: settingsMap.featured_product_image || "",
        usePackageData: false
      });

      setFeaturedForm({
        packageId: "",
        customName: settingsMap.featured_product_name || "",
        customPrice: settingsMap.featured_product_price || "",
        customImage: settingsMap.featured_product_image || "",
        usePackageData: false
      });
    } catch (error) {
      console.error('Error loading current featured product:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `featured-product-${Date.now()}.${fileExt}`;
      const filePath = `featured-products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('package-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('package-images')
        .getPublicUrl(filePath);

      setFeaturedForm(prev => ({
        ...prev,
        customImage: publicUrl
      }));

      toast({
        title: "Success",
        description: "Image uploaded successfully"
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (featuredForm.usePackageData && !featuredForm.packageId) {
        toast({
          title: "Error",
          description: "Please select a package",
          variant: "destructive"
        });
        return;
      }

      if (!featuredForm.usePackageData && (!featuredForm.customName || !featuredForm.customPrice)) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      if (featuredForm.usePackageData) {
        // Use package-based approach
        const { error: packageError } = await supabase
          .from('site_settings')
          .upsert({
            key: 'featured_package_id',
            value: JSON.stringify(featuredForm.packageId),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'key'
          });

        if (packageError) throw packageError;

        // Clear custom settings
        await supabase
          .from('site_settings')
          .delete()
          .in('key', ['featured_product_name', 'featured_product_price', 'featured_product_image']);
      } else {
        // Use custom settings approach
        const settings = [
          { key: 'featured_product_name', value: JSON.stringify(featuredForm.customName), updated_at: new Date().toISOString() },
          { key: 'featured_product_price', value: JSON.stringify(featuredForm.customPrice), updated_at: new Date().toISOString() },
          { key: 'featured_product_image', value: JSON.stringify(featuredForm.customImage), updated_at: new Date().toISOString() }
        ];

        const { error: settingsError } = await supabase
          .from('site_settings')
          .upsert(settings, {
            onConflict: 'key'
          });

        if (settingsError) throw settingsError;

        // Clear package-based setting
        await supabase
          .from('site_settings')
          .delete()
          .eq('key', 'featured_package_id');
      }

      toast({
        title: "Success",
        description: "Featured product updated successfully"
      });

      setDialogOpen(false);
      loadCurrentFeatured();
    } catch (error) {
      console.error('Error saving featured product:', error);
      toast({
        title: "Error",
        description: "Failed to save featured product",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = () => {
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFeaturedForm({
      packageId: "",
      customName: "",
      customPrice: "",
      customImage: "",
      usePackageData: true
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Featured Product Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Featured Product Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Featured Product Preview */}
        <div className="border rounded-lg p-4 bg-gradient-to-br from-accent/30 to-primary/30">
          <h3 className="font-semibold mb-3">Current Featured Product</h3>
          <div className="flex items-center gap-4">
            {currentFeatured.image && (
              <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                <img 
                  src={currentFeatured.image} 
                  alt={currentFeatured.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <h4 className="font-semibold">{currentFeatured.name}</h4>
              <p className="text-sm text-muted-foreground">${currentFeatured.price} USD</p>
              <p className="text-xs text-muted-foreground">
                {currentFeatured.usePackageData ? 'Using package data' : 'Using custom data'}
              </p>
            </div>
            <Button onClick={openEditDialog} variant="outline" size="sm">
              Edit Featured Product
            </Button>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Featured Product</DialogTitle>
              <DialogDescription>
                Configure which product appears as featured on the home page.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Source Selection */}
              <div className="space-y-3">
                <Label>Product Source</Label>
                <div className="grid gap-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="use-package"
                      checked={featuredForm.usePackageData}
                      onChange={() => setFeaturedForm(prev => ({ ...prev, usePackageData: true }))}
                    />
                    <Label htmlFor="use-package">Use existing store package</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="use-custom"
                      checked={!featuredForm.usePackageData}
                      onChange={() => setFeaturedForm(prev => ({ ...prev, usePackageData: false }))}
                    />
                    <Label htmlFor="use-custom">Use custom product details</Label>
                  </div>
                </div>
              </div>

              {featuredForm.usePackageData ? (
                /* Package Selection */
                <div className="space-y-2">
                  <Label htmlFor="package-select">Select Package</Label>
                  <Select
                    value={featuredForm.packageId}
                    onValueChange={(value) => setFeaturedForm(prev => ({ ...prev, packageId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a package..." />
                    </SelectTrigger>
                    <SelectContent>
                      {packages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            <span>{pkg.name} - ${pkg.price}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                /* Custom Product Details */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="custom-name">Product Name</Label>
                    <Input
                      id="custom-name"
                      value={featuredForm.customName}
                      onChange={(e) => setFeaturedForm(prev => ({ ...prev, customName: e.target.value }))}
                      placeholder="e.g., VIP Rank"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custom-price">Price (USD)</Label>
                    <Input
                      id="custom-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={featuredForm.customPrice}
                      onChange={(e) => setFeaturedForm(prev => ({ ...prev, customPrice: e.target.value }))}
                      placeholder="9.99"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custom-image">Product Image</Label>
                    <div className="space-y-2">
                      {featuredForm.customImage && (
                        <div className="w-32 h-32 rounded-md overflow-hidden border">
                          <img 
                            src={featuredForm.customImage} 
                            alt="Featured product preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Input
                          id="custom-image"
                          value={featuredForm.customImage}
                          onChange={(e) => setFeaturedForm(prev => ({ ...prev, customImage: e.target.value }))}
                          placeholder="https://... or upload below"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={uploading}
                          onClick={() => document.getElementById('image-upload')?.click()}
                        >
                          {uploading ? 'Uploading...' : <Upload className="h-4 w-4" />}
                        </Button>
                      </div>
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      <p className="text-xs text-muted-foreground">
                        Upload an image or enter a URL. Max 5MB.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save Featured Product
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
