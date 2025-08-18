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
  Plus, 
  Package, 
  Tag, 
  Gift, 
  Percent, 
  ShoppingCart, 
  Eye, 
  Edit2, 
  Trash2,
  Star,
  DollarSign,
  Upload,
  X
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

export default function StoreManagement() {
  const [categories, setCategories] = useState<Tables<'store_categories'>[]>([]);
  const [packages, setPackages] = useState<Tables<'store_packages'>[]>([]);
  const [discounts, setDiscounts] = useState<Tables<'discounts'>[]>([]);
  const [giftCards, setGiftCards] = useState<Tables<'gift_cards'>[]>([]);
  const [orders, setOrders] = useState<Tables<'orders'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("packages");
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);
  const [editingGiftCardId, setEditingGiftCardId] = useState<string | null>(null);
  const [showEditCategoryDialog, setShowEditCategoryDialog] = useState(false);
  
  // Forms state
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [showDiscountDialog, setShowDiscountDialog] = useState(false);
  const [showGiftCardDialog, setShowGiftCardDialog] = useState(false);
  const [showEditDiscountDialog, setShowEditDiscountDialog] = useState(false);
  const [showEditGiftCardDialog, setShowEditGiftCardDialog] = useState(false);
  
  const [categoryForm, setCategoryForm] = useState({
    name: "", description: "", slug: "", icon: "", color: "#6366f1"
  });
  
  const [packageForm, setPackageForm] = useState({
    name: "", description: "", short_description: "", price: "", category_id: "",
    package_type: "one_time" as "one_time" | "subscription" | "bundle", commands: "", items: "", image_url: ""
  });
  
  const [discountForm, setDiscountForm] = useState({
    code: "", name: "", description: "", discount_type: "percentage" as "percentage" | "fixed_amount",
    discount_value: "", min_purchase_amount: "0", max_uses: ""
  });
  
  const [giftCardForm, setGiftCardForm] = useState({
    amount: "", expires_at: ""
  });

  const { toast } = useToast();

  useEffect(() => {
    loadStoreData();
  }, []);

  const loadStoreData = async () => {
    try {
      setLoading(true);
      
      const [categoriesRes, packagesRes, discountsRes, giftCardsRes, ordersRes] = await Promise.all([
        supabase.from('store_categories').select('*').order('name'),
        supabase.from('store_packages').select('*').order('created_at', { ascending: false }),
        supabase.from('discounts').select('*').order('created_at', { ascending: false }),
        supabase.from('gift_cards').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50)
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (packagesRes.data) setPackages(packagesRes.data);
      if (discountsRes.data) setDiscounts(discountsRes.data);
      if (giftCardsRes.data) setGiftCards(giftCardsRes.data);
      if (ordersRes.data) setOrders(ordersRes.data);
    } catch (error) {
      console.error('Error loading store data:', error);
      toast({
        title: "Error",
        description: "Failed to load store data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Category functions
  const createCategory = async () => {
    try {
      const { error } = await supabase
        .from('store_categories')
        .insert({
          ...categoryForm,
          slug: categoryForm.slug || categoryForm.name.toLowerCase().replace(/\s+/g, '-')
        });

      if (error) throw error;

      toast({ title: "Success", description: "Category created successfully" });
      setShowCategoryDialog(false);
      setCategoryForm({ name: "", description: "", slug: "", icon: "", color: "#6366f1" });
      loadStoreData();
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      });
    }
  };

  const updateCategory = async () => {
    if (!editingCategoryId) return;
    
    try {
      const { error } = await supabase
        .from('store_categories')
        .update({
          ...categoryForm,
          slug: categoryForm.slug || categoryForm.name.toLowerCase().replace(/\s+/g, '-')
        })
        .eq('id', editingCategoryId);

      if (error) throw error;

      toast({ title: "Success", description: "Category updated successfully" });
      setShowEditCategoryDialog(false);
      setEditingCategoryId(null);
      setCategoryForm({ name: "", description: "", slug: "", icon: "", color: "#6366f1" });
      loadStoreData();
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
      const { error } = await supabase
        .from('store_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      toast({ title: "Success", description: "Category deleted successfully" });
      loadStoreData();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const toggleCategoryVisibility = async (categoryId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('store_categories')
        .update({ is_active: !isActive })
        .eq('id', categoryId);

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: `Category ${!isActive ? 'activated' : 'deactivated'} successfully` 
      });
      loadStoreData();
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    }
  };

  const openEditCategoryDialog = (category: Tables<'store_categories'>) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name,
      description: category.description || "",
      slug: category.slug,
      icon: category.icon || "",
      color: category.color || "#6366f1"
    });
    setShowEditCategoryDialog(true);
  };

  // Package functions
  const createPackage = async () => {
    try {
      const { error } = await supabase
        .from('store_packages')
        .insert({
          ...packageForm,
          price: parseFloat(packageForm.price),
          commands: packageForm.commands ? packageForm.commands.split('\n').filter(cmd => cmd.trim()) : null,
          items: packageForm.items ? JSON.parse(packageForm.items) : null
        });

      if (error) throw error;

      toast({ title: "Success", description: "Package created successfully" });
      setShowPackageDialog(false);
      setPackageForm({
        name: "", description: "", short_description: "", price: "", category_id: "",
        package_type: "one_time", commands: "", items: "", image_url: ""
      });
      loadStoreData();
    } catch (error) {
      console.error('Error creating package:', error);
      toast({
        title: "Error",
        description: "Failed to create package",
        variant: "destructive",
      });
    }
  };

  const togglePackageStatus = async (packageId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('store_packages')
        .update({ is_active: !isActive })
        .eq('id', packageId);

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: `Package ${!isActive ? 'enabled' : 'disabled'} successfully` 
      });
      loadStoreData();
    } catch (error) {
      console.error('Error updating package:', error);
      toast({
        title: "Error",
        description: "Failed to update package",
        variant: "destructive",
      });
    }
  };

  const editPackage = (pkg: Tables<'store_packages'>) => {
    setPackageForm({
      name: pkg.name,
      description: pkg.description || "",
      short_description: pkg.short_description || "",
      price: pkg.price.toString(),
      category_id: pkg.category_id || "",
      package_type: pkg.package_type || "one_time",
      commands: Array.isArray(pkg.commands) ? pkg.commands.join('\n') : pkg.commands || "",
      items: pkg.items ? JSON.stringify(pkg.items, null, 2) : "",
      image_url: (pkg as any).image_url || ""
    });
    setEditingPackageId(pkg.id);
    setShowPackageDialog(true);
  };

  const deletePackage = async (packageId: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return;
    
    try {
      const { error } = await supabase
        .from('store_packages')
        .delete()
        .eq('id', packageId);

      if (error) throw error;

      toast({ title: "Success", description: "Package deleted successfully" });
      loadStoreData();
    } catch (error) {
      console.error('Error deleting package:', error);
      toast({
        title: "Error",
        description: "Failed to delete package",
        variant: "destructive",
      });
    }
  };

  // Discount functions
  const createDiscount = async () => {
    try {
      const { error } = await supabase
        .from('discounts')
        .insert({
          ...discountForm,
          discount_value: parseFloat(discountForm.discount_value),
          min_purchase_amount: parseFloat(discountForm.min_purchase_amount || "0"),
          max_uses: discountForm.max_uses ? parseInt(discountForm.max_uses) : null
        });

      if (error) throw error;

      toast({ title: "Success", description: "Discount created successfully" });
      setShowDiscountDialog(false);
      setDiscountForm({
        code: "", name: "", description: "", discount_type: "percentage",
        discount_value: "", min_purchase_amount: "0", max_uses: ""
      });
      loadStoreData();
    } catch (error) {
      console.error('Error creating discount:', error);
      toast({
        title: "Error",
        description: "Failed to create discount",
        variant: "destructive",
      });
    }
  };

  const editDiscount = async () => {
    if (!editingDiscountId) return;
    
    try {
      const { error } = await supabase
        .from('discounts')
        .update({
          ...discountForm,
          discount_value: parseFloat(discountForm.discount_value),
          min_purchase_amount: parseFloat(discountForm.min_purchase_amount || "0"),
          max_uses: discountForm.max_uses ? parseInt(discountForm.max_uses) : null
        })
        .eq('id', editingDiscountId);

      if (error) throw error;

      toast({ title: "Success", description: "Discount updated successfully" });
      setShowEditDiscountDialog(false);
      setEditingDiscountId(null);
      setDiscountForm({
        code: "", name: "", description: "", discount_type: "percentage",
        discount_value: "", min_purchase_amount: "0", max_uses: ""
      });
      loadStoreData();
    } catch (error) {
      console.error('Error updating discount:', error);
      toast({
        title: "Error",
        description: "Failed to update discount",
        variant: "destructive",
      });
    }
  };

  const deleteDiscount = async (discountId: string) => {
    if (!confirm('Are you sure you want to delete this discount?')) return;
    
    try {
      const { error } = await supabase
        .from('discounts')
        .delete()
        .eq('id', discountId);

      if (error) throw error;

      toast({ title: "Success", description: "Discount deleted successfully" });
      loadStoreData();
    } catch (error) {
      console.error('Error deleting discount:', error);
      toast({
        title: "Error",
        description: "Failed to delete discount",
        variant: "destructive",
      });
    }
  };

  const openEditDiscountDialog = (discount: Tables<'discounts'>) => {
    setEditingDiscountId(discount.id);
    setDiscountForm({
      code: discount.code,
      name: discount.name,
      description: discount.description || "",
      discount_type: discount.discount_type,
      discount_value: discount.discount_value.toString(),
      min_purchase_amount: discount.min_purchase_amount?.toString() || "0",
      max_uses: discount.max_uses?.toString() || ""
    });
    setShowEditDiscountDialog(true);
  };

  // Gift Card functions
  const createGiftCard = async () => {
    try {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const { error } = await supabase
        .from('gift_cards')
        .insert({
          code,
          amount: parseFloat(giftCardForm.amount),
          remaining_balance: parseFloat(giftCardForm.amount),
          expires_at: giftCardForm.expires_at || null,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: `Gift card created with code: ${code}` 
      });
      setShowGiftCardDialog(false);
      setGiftCardForm({ amount: "", expires_at: "" });
      loadStoreData();
    } catch (error) {
      console.error('Error creating gift card:', error);
      toast({
        title: "Error",
        description: "Failed to create gift card",
        variant: "destructive",
      });
    }
  };

  const editGiftCard = async () => {
    if (!editingGiftCardId) return;
    
    try {
      const { error } = await supabase
        .from('gift_cards')
        .update({
          amount: parseFloat(giftCardForm.amount),
          expires_at: giftCardForm.expires_at || null
        })
        .eq('id', editingGiftCardId);

      if (error) throw error;

      toast({ title: "Success", description: "Gift card updated successfully" });
      setShowEditGiftCardDialog(false);
      setEditingGiftCardId(null);
      setGiftCardForm({ amount: "", expires_at: "" });
      loadStoreData();
    } catch (error) {
      console.error('Error updating gift card:', error);
      toast({
        title: "Error",
        description: "Failed to update gift card",
        variant: "destructive",
      });
    }
  };

  const deleteGiftCard = async (giftCardId: string) => {
    if (!confirm('Are you sure you want to delete this gift card?')) return;
    
    try {
      const { error } = await supabase
        .from('gift_cards')
        .delete()
        .eq('id', giftCardId);

      if (error) throw error;

      toast({ title: "Success", description: "Gift card deleted successfully" });
      loadStoreData();
    } catch (error) {
      console.error('Error deleting gift card:', error);
      toast({
        title: "Error",
        description: "Failed to delete gift card",
        variant: "destructive",
      });
    }
  };

  const openEditGiftCardDialog = (giftCard: Tables<'gift_cards'>) => {
    setEditingGiftCardId(giftCard.id);
    setGiftCardForm({
      amount: giftCard.amount.toString(),
      expires_at: giftCard.expires_at ? new Date(giftCard.expires_at).toISOString().split('T')[0] : ""
    });
    setShowEditGiftCardDialog(true);
  };

  const handlePackageImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error", 
        description: "Image must be less than 5MB",
        variant: "destructive"
      });
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `packages/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('package-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('package-images')
        .getPublicUrl(fileName);

      setPackageForm(prev => ({ ...prev, image_url: data.publicUrl }));

      toast({
        title: "Success",
        description: "Package image uploaded successfully"
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive"
      });
    }
  };

  const removePackageImage = () => {
    setPackageForm(prev => ({ ...prev, image_url: "" }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">Loading store data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Store Management
          </CardTitle>
          <CardDescription>
            Manage your server store, packages, discounts, and orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="packages">Packages</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="discounts">Discounts</TabsTrigger>
              <TabsTrigger value="giftcards">Gift Cards</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
            </TabsList>

            <TabsContent value="packages" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Store Packages</h3>
                <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Package
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingPackageId ? 'Edit Package' : 'Create Package'}</DialogTitle>
                      <DialogDescription>
                        {editingPackageId ? 'Update the package details' : 'Add a new package to your store'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="packageName">Name</Label>
                          <Input
                            id="packageName"
                            value={packageForm.name}
                            onChange={(e) => setPackageForm({...packageForm, name: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="packagePrice">Price ($)</Label>
                          <Input
                            id="packagePrice"
                            type="number"
                            step="0.01"
                            value={packageForm.price}
                            onChange={(e) => setPackageForm({...packageForm, price: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="packageCategory">Category</Label>
                          <Select onValueChange={(value) => setPackageForm({...packageForm, category_id: value})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(category => (
                                <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="packageType">Type</Label>
                          <Select onValueChange={(value: any) => setPackageForm({...packageForm, package_type: value})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="one_time">One Time</SelectItem>
                              <SelectItem value="subscription">Subscription</SelectItem>
                              <SelectItem value="bundle">Bundle</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {/* Package Image Upload */}
                      <div>
                        <Label>Package Image</Label>
                        <div className="space-y-4">
                          {packageForm.image_url ? (
                            <div className="relative">
                              <img 
                                src={packageForm.image_url} 
                                alt="Package preview" 
                                className="w-full h-32 object-cover rounded-lg border"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute top-2 right-2"
                                onClick={removePackageImage}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground mb-2">Upload package image</p>
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={handlePackageImageUpload}
                                className="hidden"
                                id="package-image-upload"
                              />
                              <Label 
                                htmlFor="package-image-upload"
                                className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                              >
                                Choose Image
                              </Label>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="packageShortDesc">Short Description</Label>
                        <Input
                          id="packageShortDesc"
                          value={packageForm.short_description}
                          onChange={(e) => setPackageForm({...packageForm, short_description: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="packageDesc">Description</Label>
                        <Textarea
                          id="packageDesc"
                          value={packageForm.description}
                          onChange={(e) => setPackageForm({...packageForm, description: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="packageCommands">Commands (one per line)</Label>
                        <Textarea
                          id="packageCommands"
                          value={packageForm.commands}
                          onChange={(e) => setPackageForm({...packageForm, commands: e.target.value})}
                          placeholder="give %player% diamond 64"
                        />
                      </div>
                      <div>
                        <Label htmlFor="packageItems">Items (JSON format)</Label>
                        <Textarea
                          id="packageItems"
                          value={packageForm.items}
                          onChange={(e) => setPackageForm({...packageForm, items: e.target.value})}
                          placeholder='[{"item": "diamond", "amount": 64}]'
                        />
                      </div>
                      <div>
                        <Label htmlFor="packageImage">Image</Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            id="packageImage"
                            type="file"
                            accept="image/*"
                            onChange={handlePackageImageUpload}
                          />
                          {packageForm.image_url && (
                            <div className="flex gap-2 items-center">
                              <img src={packageForm.image_url} alt="Package" className="h-16 rounded-md" />
                              <Button
                                variant="outline"
                                onClick={removePackageImage}
                                className="h-8"
                              >
                                Remove
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => {
                        setShowPackageDialog(false);
                        setEditingPackageId(null);
                        setPackageForm({
                          name: "", description: "", short_description: "", price: "", category_id: "",
                          package_type: "one_time", commands: "", items: "", image_url: ""
                        });
                      }}>
                        Cancel
                      </Button>
                      <Button onClick={createPackage}>
                        {editingPackageId ? 'Update Package' : 'Create Package'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packages.map((pkg) => (
                      <TableRow key={pkg.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{pkg.name}</div>
                            <div className="text-sm text-muted-foreground">{pkg.short_description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {categories.find(c => c.id === pkg.category_id)?.name || 'Uncategorized'}
                        </TableCell>
                        <TableCell>${pkg.price}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {pkg.package_type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={pkg.is_active ? "default" : "secondary"}>
                            {pkg.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => editPackage(pkg)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => togglePackageStatus(pkg.id, pkg.is_active)}
                            >
                              {pkg.is_active ? 'Disable' : 'Enable'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deletePackage(pkg.id)}
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

            <TabsContent value="categories" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Store Categories</h3>
                <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Category</DialogTitle>
                      <DialogDescription>
                        Add a new category to organize your store packages
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="categoryName">Name</Label>
                        <Input
                          id="categoryName"
                          value={categoryForm.name}
                          onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="categorySlug">Slug</Label>
                        <Input
                          id="categorySlug"
                          value={categoryForm.slug}
                          onChange={(e) => setCategoryForm({...categoryForm, slug: e.target.value})}
                          placeholder="auto-generated from name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="categoryIcon">Icon</Label>
                        <Input
                          id="categoryIcon"
                          value={categoryForm.icon}
                          onChange={(e) => setCategoryForm({...categoryForm, icon: e.target.value})}
                          placeholder="package, star, gift, etc."
                        />
                      </div>
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
                        <Label htmlFor="categoryDesc">Description</Label>
                        <Textarea
                          id="categoryDesc"
                          value={categoryForm.description}
                          onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createCategory}>Create Category</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Icon</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{category.name}</div>
                            <div className="text-sm text-muted-foreground">{category.description}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{category.slug}</TableCell>
                        <TableCell>{category.icon}</TableCell>
                        <TableCell>
                          <Badge variant={category.is_active ? "default" : "secondary"}>
                            {category.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditCategoryDialog(category)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleCategoryVisibility(category.id, category.is_active || false)}
                            >
                              {category.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteCategory(category.id)}
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

            <TabsContent value="discounts" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Discount Codes</h3>
                <Dialog open={showDiscountDialog} onOpenChange={setShowDiscountDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Discount
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Discount Code</DialogTitle>
                      <DialogDescription>
                        Create a new discount code for your store
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="discountCode">Code</Label>
                          <Input
                            id="discountCode"
                            value={discountForm.code}
                            onChange={(e) => setDiscountForm({...discountForm, code: e.target.value.toUpperCase()})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="discountType">Type</Label>
                          <Select onValueChange={(value: any) => setDiscountForm({...discountForm, discount_type: value})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">Percentage</SelectItem>
                              <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="discountValue">
                            {discountForm.discount_type === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}
                          </Label>
                          <Input
                            id="discountValue"
                            type="number"
                            step="0.01"
                            value={discountForm.discount_value}
                            onChange={(e) => setDiscountForm({...discountForm, discount_value: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="minPurchase">Min Purchase ($)</Label>
                          <Input
                            id="minPurchase"
                            type="number"
                            step="0.01"
                            value={discountForm.min_purchase_amount}
                            onChange={(e) => setDiscountForm({...discountForm, min_purchase_amount: e.target.value})}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="discountName">Name</Label>
                        <Input
                          id="discountName"
                          value={discountForm.name}
                          onChange={(e) => setDiscountForm({...discountForm, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="discountDesc">Description</Label>
                        <Textarea
                          id="discountDesc"
                          value={discountForm.description}
                          onChange={(e) => setDiscountForm({...discountForm, description: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxUses">Max Uses (optional)</Label>
                        <Input
                          id="maxUses"
                          type="number"
                          value={discountForm.max_uses}
                          onChange={(e) => setDiscountForm({...discountForm, max_uses: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowDiscountDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createDiscount}>Create Discount</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Uses</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discounts.map((discount) => (
                      <TableRow key={discount.id}>
                        <TableCell className="font-mono">{discount.code}</TableCell>
                        <TableCell>{discount.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {discount.discount_type === 'percentage' ? 'Percentage' : 'Fixed Amount'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {discount.discount_type === 'percentage' 
                            ? `${discount.discount_value}%` 
                            : `$${discount.discount_value}`
                          }
                        </TableCell>
                        <TableCell>
                          {discount.uses_count} / {discount.max_uses || '∞'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={discount.is_active ? "default" : "secondary"}>
                            {discount.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDiscountDialog(discount)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteDiscount(discount.id)}
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

            <TabsContent value="giftcards" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Gift Cards</h3>
                <Dialog open={showGiftCardDialog} onOpenChange={setShowGiftCardDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Gift Card
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Gift Card</DialogTitle>
                      <DialogDescription>
                        Generate a new gift card for store credit
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="giftCardAmount">Amount ($)</Label>
                        <Input
                          id="giftCardAmount"
                          type="number"
                          step="0.01"
                          value={giftCardForm.amount}
                          onChange={(e) => setGiftCardForm({...giftCardForm, amount: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="giftCardExpiry">Expiry Date (optional)</Label>
                        <Input
                          id="giftCardExpiry"
                          type="date"
                          value={giftCardForm.expires_at}
                          onChange={(e) => setGiftCardForm({...giftCardForm, expires_at: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowGiftCardDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createGiftCard}>Create Gift Card</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {giftCards.map((card) => (
                      <TableRow key={card.id}>
                        <TableCell className="font-mono">{card.code}</TableCell>
                        <TableCell>${card.amount}</TableCell>
                        <TableCell>${card.remaining_balance}</TableCell>
                        <TableCell>
                          <Badge variant={card.is_active ? "default" : "secondary"}>
                            {card.is_active ? "Active" : "Used"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(card.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {card.expires_at ? new Date(card.expires_at).toLocaleDateString() : "Never"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditGiftCardDialog(card)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteGiftCard(card.id)}
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

            <TabsContent value="orders" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Recent Orders</h3>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono">{order.order_number}</TableCell>
                        <TableCell>{order.user_id}</TableCell>
                        <TableCell>${order.final_amount}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              order.status === 'completed' ? 'default' :
                              order.status === 'pending' ? 'secondary' :
                              order.status === 'failed' || order.status === 'cancelled' ? 'destructive' :
                              'outline'
                            }
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(order.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
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

      {/* Edit Category Dialog */}
      <Dialog open={showEditCategoryDialog} onOpenChange={setShowEditCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editCategoryName">Name</Label>
              <Input
                id="editCategoryName"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="editCategorySlug">Slug</Label>
              <Input
                id="editCategorySlug"
                value={categoryForm.slug}
                onChange={(e) => setCategoryForm({...categoryForm, slug: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="editCategoryIcon">Icon</Label>
              <Input
                id="editCategoryIcon"
                value={categoryForm.icon}
                onChange={(e) => setCategoryForm({...categoryForm, icon: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="editCategoryColor">Color</Label>
              <Input
                id="editCategoryColor"
                type="color"
                value={categoryForm.color}
                onChange={(e) => setCategoryForm({...categoryForm, color: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="editCategoryDesc">Description</Label>
              <Textarea
                id="editCategoryDesc"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditCategoryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={updateCategory}>Update Category</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Discount Dialog */}
      <Dialog open={showEditDiscountDialog} onOpenChange={setShowEditDiscountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Discount Code</DialogTitle>
            <DialogDescription>
              Update the discount code details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editDiscountCode">Code</Label>
                <Input
                  id="editDiscountCode"
                  value={discountForm.code}
                  onChange={(e) => setDiscountForm({...discountForm, code: e.target.value.toUpperCase()})}
                />
              </div>
              <div>
                <Label htmlFor="editDiscountType">Type</Label>
                <Select onValueChange={(value: any) => setDiscountForm({...discountForm, discount_type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editDiscountValue">
                  {discountForm.discount_type === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}
                </Label>
                <Input
                  id="editDiscountValue"
                  type="number"
                  step="0.01"
                  value={discountForm.discount_value}
                  onChange={(e) => setDiscountForm({...discountForm, discount_value: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="editMinPurchase">Min Purchase ($)</Label>
                <Input
                  id="editMinPurchase"
                  type="number"
                  step="0.01"
                  value={discountForm.min_purchase_amount}
                  onChange={(e) => setDiscountForm({...discountForm, min_purchase_amount: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="editDiscountName">Name</Label>
              <Input
                id="editDiscountName"
                value={discountForm.name}
                onChange={(e) => setDiscountForm({...discountForm, name: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="editDiscountDesc">Description</Label>
              <Textarea
                id="editDiscountDesc"
                value={discountForm.description}
                onChange={(e) => setDiscountForm({...discountForm, description: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="editMaxUses">Max Uses (optional)</Label>
              <Input
                id="editMaxUses"
                type="number"
                value={discountForm.max_uses}
                onChange={(e) => setDiscountForm({...discountForm, max_uses: e.target.value})}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditDiscountDialog(false)}>
              Cancel
            </Button>
            <Button onClick={editDiscount}>Update Discount</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Gift Card Dialog */}
      <Dialog open={showEditGiftCardDialog} onOpenChange={setShowEditGiftCardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Gift Card</DialogTitle>
            <DialogDescription>
              Update the gift card details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editGiftCardAmount">Amount ($)</Label>
              <Input
                id="editGiftCardAmount"
                type="number"
                step="0.01"
                value={giftCardForm.amount}
                onChange={(e) => setGiftCardForm({...giftCardForm, amount: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="editGiftCardExpiry">Expiry Date (optional)</Label>
              <Input
                id="editGiftCardExpiry"
                type="date"
                value={giftCardForm.expires_at}
                onChange={(e) => setGiftCardForm({...giftCardForm, expires_at: e.target.value})}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditGiftCardDialog(false)}>
              Cancel
            </Button>
            <Button onClick={editGiftCard}>Update Gift Card</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}