import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Package, Command, DollarSign, Eye, EyeOff, Settings } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { PaymentConfigService } from '@/lib/payment-config';

type StorePackage = Tables<'store_packages'>;
type StoreCategory = Tables<'store_categories'>;

interface PaymentConfig {
  id?: string;
  provider: 'stripe' | 'paypal';
  is_enabled: boolean;
  is_test_mode: boolean;
  config: {
    publishable_key?: string;
    secret_key?: string;
    webhook_secret?: string;
    client_id?: string;
    client_secret?: string;
    environment?: string;
  };
}

interface PackageForm {
  name: string;
  description: string;
  price: number;
  sale_price: number | null;
  category_id: string;
  is_featured: boolean;
  is_active: boolean;
  stock_quantity: number | null;
  command_template: string;
  image_url: string | null;
  duration_days: number | null;
  sort_order: number;
}

const defaultPackageForm: PackageForm = {
  name: '',
  description: '',
  price: 0,
  sale_price: null,
  category_id: '',
  is_featured: false,
  is_active: true,
  stock_quantity: null,
  command_template: '',
  image_url: null,
  duration_days: null,
  sort_order: 0,
};

export default function EnhancedStoreManagement() {
  const [packages, setPackages] = useState<StorePackage[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingPackage, setEditingPackage] = useState<StorePackage | null>(null);
  const [editingCategory, setEditingCategory] = useState<StoreCategory | null>(null);
  const [packageForm, setPackageForm] = useState<PackageForm>(defaultPackageForm);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    slug: '',
    icon: '',
    color: '#6366f1',
    is_active: true,
    sort_order: 0
  });
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [stripeConfig, setStripeConfig] = useState<PaymentConfig>({
    provider: 'stripe',
    is_enabled: false,
    is_test_mode: true,
    config: {}
  });
  const [paypalConfig, setPaypalConfig] = useState<PaymentConfig>({
    provider: 'paypal',
    is_enabled: false,
    is_test_mode: true,
    config: {}
  });

  useEffect(() => {
    loadPackages();
    loadCategories();
    loadPaymentConfigs();
  }, []);

  const loadPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('store_packages')
        .select('*, store_categories(name)')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error loading packages:', error);
      toast({
        title: "Error",
        description: "Failed to load packages",
        variant: "destructive",
      });
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('store_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    }
  };

  const loadPaymentConfigs = async () => {
    try {
      console.log('Loading payment configurations...');
      
      const stripe = await PaymentConfigService.getConfig('stripe');
      const paypal = await PaymentConfigService.getConfig('paypal');

      console.log('Stripe config:', stripe);
      console.log('PayPal config:', paypal);

      if (stripe) {
        setStripeConfig(stripe);
      } else {
        console.log('No Stripe configuration found');
      }
      
      if (paypal) {
        setPaypalConfig(paypal);
      } else {
        console.log('No PayPal configuration found');
      }
    } catch (error) {
      console.error('Error loading payment configs:', error);
      toast({
        title: "Payment Config Warning",
        description: "Could not load payment configurations. Payment features may be limited.",
        variant: "destructive",
      });
    }
  };

  const openPackageDialog = (pkg?: StorePackage) => {
    if (pkg) {
      setEditingPackage(pkg);
      setPackageForm({
        name: pkg.name,
        description: pkg.description || '',
        price: pkg.price,
        sale_price: pkg.sale_price,
        category_id: pkg.category_id || '',
        is_featured: pkg.is_featured || false,
        is_active: pkg.is_active,
        stock_quantity: pkg.stock_quantity,
        command_template: pkg.command_template || '',
        image_url: pkg.image_url,
        duration_days: pkg.duration_days,
        sort_order: pkg.sort_order || 0,
      });
    } else {
      setEditingPackage(null);
      setPackageForm(defaultPackageForm);
    }
    setShowPackageDialog(true);
  };

  const savePackage = async () => {
    setLoading(true);
    try {
      const packageData = {
        ...packageForm,
        updated_at: new Date().toISOString(),
      };

      let error;
      if (editingPackage) {
        ({ error } = await supabase
          .from('store_packages')
          .update(packageData)
          .eq('id', editingPackage.id));
      } else {
        ({ error } = await supabase
          .from('store_packages')
          .insert([{
            ...packageData,
            created_at: new Date().toISOString(),
          }]));
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: `Package ${editingPackage ? 'updated' : 'created'} successfully`,
      });

      setShowPackageDialog(false);
      loadPackages();
    } catch (error) {
      console.error('Error saving package:', error);
      toast({
        title: "Error",
        description: "Failed to save package",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Please select a valid image file (JPEG, PNG, WebP, or GIF)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error", 
        description: "Image size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadingImage(true);

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `packages/${fileName}`;

      // Upload file to Supabase storage
      const { data, error } = await supabase.storage
        .from('package-images')
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('package-images')
        .getPublicUrl(filePath);

      // Update form with the uploaded image URL
      setPackageForm({ ...packageForm, image_url: publicUrl });

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = async () => {
    if (!packageForm.image_url) return;

    try {
      // Extract file path from URL for deletion
      const url = new URL(packageForm.image_url);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(-2).join('/'); // Get "packages/filename.ext"

      // Delete from storage
      const { error } = await supabase.storage
        .from('package-images')
        .remove([filePath]);

      if (error) {
        console.warn('Error deleting image from storage:', error);
      }

      // Remove from form
      setPackageForm({ ...packageForm, image_url: null });

      toast({
        title: "Success",
        description: "Image removed successfully",
      });
    } catch (error) {
      console.error('Error removing image:', error);
      // Still remove from form even if storage deletion fails
      setPackageForm({ ...packageForm, image_url: null });
      toast({
        title: "Warning",
        description: "Image removed from package, but may still exist in storage",
        variant: "destructive",
      });
    }
  };

  const savePaymentConfig = async (config: PaymentConfig) => {
    setLoading(true);
    try {
      await PaymentConfigService.saveConfig(config);

      toast({
        title: "Success",
        description: `${config.provider} configuration saved successfully`,
      });
    } catch (error) {
      console.error('Error saving payment config:', error);
      toast({
        title: "Error",
        description: "Failed to save payment configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openCategoryDialog = (category?: StoreCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        description: category.description || '',
        slug: category.slug || '',
        icon: category.icon || '',
        color: category.color || '#6366f1',
        is_active: category.is_active,
        sort_order: category.sort_order || 0
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({
        name: '',
        description: '',
        slug: '',
        icon: '',
        color: '#6366f1',
        is_active: true,
        sort_order: 0
      });
    }
    setShowCategoryDialog(true);
  };

  const saveCategory = async () => {
    setLoading(true);
    try {
      const categoryData = {
        ...categoryForm,
        updated_at: new Date().toISOString(),
      };

      let error;
      if (editingCategory) {
        ({ error } = await supabase
          .from('store_categories')
          .update(categoryData)
          .eq('id', editingCategory.id));
      } else {
        ({ error } = await supabase
          .from('store_categories')
          .insert([{
            ...categoryData,
            created_at: new Date().toISOString(),
          }]));
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: `Category ${editingCategory ? 'updated' : 'created'} successfully`,
      });

      setShowCategoryDialog(false);
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast({
        title: "Error",
        description: "Failed to save category",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('store_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Category deleted successfully",
      });

      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Store Management</h1>
          <p className="text-gray-600">Manage packages, payments, and Minecraft integration</p>
        </div>
      </div>

      <Tabs defaultValue="packages" className="space-y-6">
        <TabsList>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="payments">Payment Settings</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="packages">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Store Packages</h2>
              <Button
                onClick={() => openPackageDialog()}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Package
              </Button>
            </div>

            <div className="grid gap-6">
              {packages.map((pkg) => (
                <Card key={pkg.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {pkg.image_url ? (
                          <img
                            src={pkg.image_url}
                            alt={pkg.name}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                            <Package className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {pkg.name}
                            {pkg.is_featured && (
                              <Badge variant="secondary">Featured</Badge>
                            )}
                            {!pkg.is_active && (
                              <Badge variant="outline">Hidden</Badge>
                            )}
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-1">{pkg.description}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <span className="font-medium">
                                {pkg.sale_price ? (
                                  <>
                                    <span className="line-through text-gray-500">
                                      {formatPrice(pkg.price)}
                                    </span>
                                    <span className="ml-1 text-green-600">
                                      {formatPrice(pkg.sale_price)}
                                    </span>
                                  </>
                                ) : (
                                  formatPrice(pkg.price)
                                )}
                              </span>
                            </div>
                            {pkg.stock_quantity !== null && (
                              <Badge variant="outline">
                                Stock: {pkg.stock_quantity}
                              </Badge>
                            )}
                            {pkg.duration_days && (
                              <Badge variant="outline">
                                {pkg.duration_days} days
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPackageDialog(pkg)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {pkg.command_template && (
                    <CardContent className="pt-0">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Command className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">Command Template:</span>
                        </div>
                        <code className="text-sm text-gray-800 font-mono">
                          {pkg.command_template}
                        </code>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Payment Configuration</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Stripe Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Stripe
                    <Switch
                      checked={stripeConfig.is_enabled}
                      onCheckedChange={(enabled) => 
                        setStripeConfig({...stripeConfig, is_enabled: enabled})
                      }
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="stripePublishable">Publishable Key</Label>
                    <Input
                      id="stripePublishable"
                      type="text"
                      placeholder="pk_test_..."
                      value={stripeConfig.config.publishable_key || ''}
                      onChange={(e) => setStripeConfig({
                        ...stripeConfig,
                        config: {...stripeConfig.config, publishable_key: e.target.value}
                      })}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="stripeTestMode"
                      checked={stripeConfig.is_test_mode}
                      onCheckedChange={(testMode) => 
                        setStripeConfig({...stripeConfig, is_test_mode: testMode})
                      }
                    />
                    <Label htmlFor="stripeTestMode">Test Mode</Label>
                  </div>

                  <Button
                    onClick={() => savePaymentConfig(stripeConfig)}
                    disabled={loading}
                    className="w-full"
                  >
                    Save Stripe Config
                  </Button>
                </CardContent>
              </Card>

              {/* PayPal Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    PayPal
                    <Switch
                      checked={paypalConfig.is_enabled}
                      onCheckedChange={(enabled) => 
                        setPaypalConfig({...paypalConfig, is_enabled: enabled})
                      }
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="paypalClientId">Client ID</Label>
                    <Input
                      id="paypalClientId"
                      type="text"
                      placeholder="AX..."
                      value={paypalConfig.config.client_id || ''}
                      onChange={(e) => setPaypalConfig({
                        ...paypalConfig,
                        config: {...paypalConfig.config, client_id: e.target.value}
                      })}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="paypalTestMode"
                      checked={paypalConfig.is_test_mode}
                      onCheckedChange={(testMode) => 
                        setPaypalConfig({...paypalConfig, is_test_mode: testMode})
                      }
                    />
                    <Label htmlFor="paypalTestMode">Sandbox Mode</Label>
                  </div>

                  <Button
                    onClick={() => savePaymentConfig(paypalConfig)}
                    disabled={loading}
                    className="w-full"
                  >
                    Save PayPal Config
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Order Management</h2>
            <div className="text-center py-8 text-gray-500">
              Order management interface will be implemented here.
              This will show recent orders, payment status, and command execution logs.
            </div>
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Store Categories</h2>
              <Button
                onClick={() => openCategoryDialog()}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Category
              </Button>
            </div>

            <div className="grid gap-4">
              {categories.map((category) => (
                <Card key={category.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: category.color || '#6366f1' }}
                        />
                        <div>
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                          {category.description && (
                            <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {category.slug && (
                              <Badge variant="outline">/{category.slug}</Badge>
                            )}
                            {category.icon && (
                              <Badge variant="outline">
                                {category.icon}
                              </Badge>
                            )}
                            <Badge variant={category.is_active ? "default" : "secondary"}>
                              {category.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openCategoryDialog(category)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteCategory(category.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Package Dialog */}
      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? 'Edit Package' : 'Create Package'}
            </DialogTitle>
            <DialogDescription>
              {editingPackage ? 'Modify the package details below.' : 'Create a new store package with pricing and command configuration.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="packageName">Package Name</Label>
                <Input
                  id="packageName"
                  value={packageForm.name}
                  onChange={(e) => setPackageForm({...packageForm, name: e.target.value})}
                  placeholder="e.g., Diamond Rank"
                />
              </div>
              <div>
                <Label htmlFor="packageCategory">Category</Label>
                <Select
                  value={packageForm.category_id}
                  onValueChange={(value) => setPackageForm({...packageForm, category_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="packageDescription">Description</Label>
              <Textarea
                id="packageDescription"
                value={packageForm.description}
                onChange={(e) => setPackageForm({...packageForm, description: e.target.value})}
                placeholder="Package description..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="packageImage">Package Image</Label>
              <Input
                id="packageImage"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload an image for the package (JPEG, PNG, WebP, GIF - max 10MB)
              </p>
              {packageForm.image_url && (
                <div className="mt-2 space-y-2">
                  <img 
                    src={packageForm.image_url} 
                    alt="Package preview" 
                    className="w-32 h-20 object-cover rounded border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={removeImage}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove Image
                  </Button>
                </div>
              )}
              {uploadingImage && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm text-gray-600">Uploading image...</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="packagePrice">Price ($)</Label>
                <Input
                  id="packagePrice"
                  type="number"
                  step="0.01"
                  value={packageForm.price}
                  onChange={(e) => setPackageForm({...packageForm, price: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label htmlFor="packageSalePrice">Sale Price ($)</Label>
                <Input
                  id="packageSalePrice"
                  type="number"
                  step="0.01"
                  value={packageForm.sale_price || ''}
                  onChange={(e) => setPackageForm({
                    ...packageForm, 
                    sale_price: e.target.value ? parseFloat(e.target.value) : null
                  })}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="commandTemplate">Minecraft Command Template</Label>
              <Textarea
                id="commandTemplate"
                value={packageForm.command_template}
                onChange={(e) => setPackageForm({...packageForm, command_template: e.target.value})}
                placeholder="give {username} diamond 64&#10;lp user {username} parent add vip"
                rows={3}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use {'{username}'} for player substitution. Multiple commands on separate lines.
              </p>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="packageVisible"
                  checked={packageForm.is_active}
                  onCheckedChange={(checked) => setPackageForm({...packageForm, is_active: checked})}
                />
                <Label htmlFor="packageVisible">Visible to customers</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="packageFeatured"
                  checked={packageForm.is_featured}
                  onCheckedChange={(checked) => setPackageForm({...packageForm, is_featured: checked})}
                />
                <Label htmlFor="packageFeatured">Featured package</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPackageDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={savePackage}
                disabled={loading || !packageForm.name || !packageForm.category_id}
              >
                {editingPackage ? 'Update Package' : 'Create Package'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Modify the category details below.' : 'Create a new store category for organizing packages.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <Label htmlFor="categoryName">Category Name</Label>
              <Input
                id="categoryName"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                placeholder="e.g., VIP Packages"
              />
            </div>

            <div>
              <Label htmlFor="categoryDescription">Description</Label>
              <Textarea
                id="categoryDescription"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                placeholder="Category description..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="categorySlug">Slug</Label>
                <Input
                  id="categorySlug"
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm({...categoryForm, slug: e.target.value})}
                  placeholder="e.g., vip-packages"
                />
              </div>
              <div>
                <Label htmlFor="categoryIcon">Icon</Label>
                <Input
                  id="categoryIcon"
                  value={categoryForm.icon}
                  onChange={(e) => setCategoryForm({...categoryForm, icon: e.target.value})}
                  placeholder="e.g., mdi-star"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="categoryColor">Color</Label>
                <Input
                  id="categoryColor"
                  type="color"
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm({...categoryForm, color: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="categorySortOrder">Sort Order</Label>
                <Input
                  id="categorySortOrder"
                  type="number"
                  value={categoryForm.sort_order}
                  onChange={(e) => setCategoryForm({...categoryForm, sort_order: parseInt(e.target.value)})}
                />
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="categoryVisible"
                  checked={categoryForm.is_active}
                  onCheckedChange={(checked) => setCategoryForm({...categoryForm, is_active: checked})}
                />
                <Label htmlFor="categoryVisible">Visible to customers</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCategoryDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={saveCategory}
                disabled={loading || !categoryForm.name}
              >
                {editingCategory ? 'Update Category' : 'Create Category'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
