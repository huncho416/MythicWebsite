import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Star, Package, Gift, Plus, Minus } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { useCart } from "@/hooks/use-cart";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { MinecraftUsernamePrompt } from "@/components/ui/minecraft-username-prompt";

export default function Store() {
  const [categories, setCategories] = useState<Tables<'store_categories'>[]>([]);
  const [packages, setPackages] = useState<Tables<'store_packages'>[]>([]);
  const [saleSettings, setSaleSettings] = useState<{
    enabled: boolean;
    percentage: number;
    start_date: string | null;
    end_date: string | null;
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [showMinecraftPrompt, setShowMinecraftPrompt] = useState(false);
  const [minecraftUsername, setMinecraftUsername] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(true);
  const { cart, items, totals, addItem, removeItem, updateQuantity } = useCart();
  const { toast } = useToast();

  const canonical = typeof window !== 'undefined' ? window.location.origin + '/store' : '';

  useEffect(() => {
    checkMinecraftUsername();
    loadStoreData();
  }, []);

  const checkMinecraftUsername = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setCheckingUsername(false);
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('minecraft_username')
        .eq('user_id', user.id)
        .single();

      if (profile?.minecraft_username) {
        setMinecraftUsername(profile.minecraft_username);
      } else {
        setShowMinecraftPrompt(true);
      }
    } catch (error) {
      console.error('Error checking Minecraft username:', error);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleMinecraftUsernameSet = (username: string) => {
    setMinecraftUsername(username);
    setShowMinecraftPrompt(false);
  };

  const loadStoreData = async () => {
    try {
      setLoading(true);
      
      const [categoriesRes, packagesRes, saleRes] = await Promise.all([
        supabase.from('store_categories').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
        supabase.from('store_packages').select(`
          *,
          store_categories(name)
        `).eq('is_active', true).order('price', { ascending: true }),
        supabase.from('store_settings').select('value').eq('key', 'global_sale').single()
      ]);

      if (categoriesRes.data) {
        setCategories(categoriesRes.data);
        if (categoriesRes.data.length > 0) {
          setActiveCategory(categoriesRes.data[0].id);
        }
      }
      if (packagesRes.data) setPackages(packagesRes.data);
      
      // Load sale settings
      if (saleRes.data?.value) {
        const saleData = saleRes.data.value as any;
        const now = new Date();
        const startDate = saleData.start_date ? new Date(saleData.start_date) : null;
        const endDate = saleData.end_date ? new Date(saleData.end_date) : null;
        
        // Check if sale is currently active
        const isActive = saleData.enabled && 
          (!startDate || now >= startDate) && 
          (!endDate || now <= endDate);
          
        setSaleSettings({
          enabled: isActive,
          percentage: saleData.percentage || 0,
          start_date: saleData.start_date,
          end_date: saleData.end_date,
          message: saleData.message || ''
        });
      }
      
    } catch (error) {
      console.error('Error loading store data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPackagesByCategory = (categoryId: string) => {
    return packages.filter(pkg => pkg.category_id === categoryId);
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  const getFinalPrice = (pkg: Tables<'store_packages'>) => {
    // Use individual package sale price if available
    if (pkg.sale_price && pkg.sale_price < pkg.price) {
      return pkg.sale_price;
    }
    
    // Apply global sale if active
    if (saleSettings?.enabled && saleSettings.percentage > 0) {
      return pkg.price * (1 - saleSettings.percentage / 100);
    }
    
    return pkg.price;
  };

  const getOriginalPrice = (pkg: Tables<'store_packages'>) => {
    return pkg.price;
  };

  const hasDiscount = (pkg: Tables<'store_packages'>) => {
    return getFinalPrice(pkg) < getOriginalPrice(pkg);
  };

  const getPackageIcon = (packageType: string) => {
    const icons: Record<string, any> = {
      rank: Star,
      item: Package,
      cosmetic: Gift,
      bundle: ShoppingCart
    };
    return icons[packageType] || Package;
  };

  const getItemQuantityInCart = (packageId: string) => {
    const cartItem = items.find(item => item.product_id === packageId);
    return cartItem ? cartItem.quantity : 0;
  };

  const handleAddToCart = async (pkg: Tables<'store_packages'>) => {
    // Check if Minecraft username is required
    if (!minecraftUsername) {
      setShowMinecraftPrompt(true);
      return;
    }

    try {
      await addItem(pkg.id, 1);
      toast({
        title: "Added to cart",
        description: `${pkg.name} has been added to your cart.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateQuantity = async (packageId: string, newQuantity: number) => {
    const cartItem = items.find(item => item.product_id === packageId);
    if (!cartItem) return;
    
    try {
      if (newQuantity === 0) {
        await removeItem(cartItem.id);
      } else {
        await updateQuantity(cartItem.id, newQuantity);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update cart. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading || checkingUsername) {
    return (
      <div className="container mx-auto py-12">
        <Helmet>
          <title>Store | MythicPvP Ranks and Perks</title>
          <meta name="description" content="Purchase MythicPvP ranks, keys, and cosmetics to enhance your gameplay." />
          <link rel="canonical" href={canonical} />
        </Helmet>
        <h1 className="font-brand text-4xl mb-8">Server Store</h1>
        <div className="text-center py-8">
          {checkingUsername ? 'Verifying profile...' : 'Loading store...'}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12">
      <Helmet>
        <title>Store | MythicPvP Ranks and Perks</title>
        <meta name="description" content="Purchase MythicPvP ranks, keys, and cosmetics to enhance your gameplay." />
        <link rel="canonical" href={canonical} />
      </Helmet>
      <h1 className="font-brand text-4xl mb-8">Server Store</h1>
      
      {/* Global Sale Banner */}
      {saleSettings?.enabled && (
        <div className="mb-8 p-6 bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500 rounded-full">
                <Gift className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-600">🔥 SALE ACTIVE!</h3>
                <p className="text-sm text-muted-foreground">
                  {saleSettings.message || `Save ${saleSettings.percentage}% on all packages!`}
                </p>
                {saleSettings.end_date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Sale ends: {new Date(saleSettings.end_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <Badge variant="destructive" className="text-lg px-3 py-1">
              {saleSettings.percentage}% OFF
            </Badge>
          </div>
        </div>
      )}
      
      {/* Cart Summary */}
      {items.length > 0 && (
        <Card className="mb-8 bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-medium">Your Cart</h3>
                  <p className="text-sm text-muted-foreground">
                    {items.length} item{items.length !== 1 ? 's' : ''} • Total: ${totals.total.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/cart">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    View Cart
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/checkout">
                    Checkout
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {categories.length === 0 ? (
        <Card className="bg-secondary/40">
          <CardContent className="p-6 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Store Coming Soon</h3>
            <p className="text-muted-foreground">Our store is being set up with amazing packages and perks. Check back soon!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-8">
          {/* Categories Sidebar */}
          <div className="w-80 flex-shrink-0">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={`w-full text-left p-4 hover:bg-secondary/50 transition-colors border-l-4 ${
                        activeCategory === category.id 
                          ? 'bg-secondary/60 border-l-primary' 
                          : 'border-l-transparent'
                      }`}
                      style={{ 
                        borderLeftColor: activeCategory === category.id ? category.color : 'transparent',
                        backgroundColor: activeCategory === category.id ? `${category.color}10` : undefined
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: category.color || '#6366f1' }}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{category.name}</div>
                          {category.description && (
                            <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {category.description}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {getPackagesByCategory(category.id).length}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Packages Content */}
          <div className="flex-1">
            {categories.filter(cat => cat.id === activeCategory).map((category) => (
              <div key={category.id} className="space-y-6">
                {/* Category Header */}
                <div className="text-center p-6 bg-secondary/20 rounded-lg border-l-4" style={{ borderLeftColor: category.color }}>
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: category.color }}
                    >
                      <Package className="h-4 w-4 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold">{category.name}</h2>
                  </div>
                  {category.description && (
                    <p className="text-muted-foreground mb-4">{category.description}</p>
                  )}
                  <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                    <span>{getPackagesByCategory(category.id).length} packages available</span>
                    <span>•</span>
                    <span>Starting from {getPackagesByCategory(category.id).length > 0 && formatPrice(Math.min(...getPackagesByCategory(category.id).map(pkg => getFinalPrice(pkg))))}</span>
                  </div>
                </div>

                {/* Packages Grid */}
                <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                  {getPackagesByCategory(category.id).map((pkg) => {
                    const IconComponent = getPackageIcon(pkg.package_type);
                    const finalPrice = getFinalPrice(pkg);
                    const originalPrice = getOriginalPrice(pkg);
                    const packageHasDiscount = hasDiscount(pkg);
                  
                  return (
                    <Card key={pkg.id} className="bg-secondary/40 hover:bg-secondary/60 transition-all duration-200 hover:shadow-lg border-l-4" style={{ borderLeftColor: category.color }}>
                      {/* Package Image */}
                      {pkg.image_url && (
                        <div className="relative h-48 overflow-hidden rounded-t-lg">
                          <img 
                            src={pkg.image_url} 
                            alt={pkg.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Hide image if it fails to load
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          {pkg.is_featured && (
                            <Badge variant="secondary" className="absolute top-2 right-2 bg-yellow-100 text-yellow-800">
                              <Star className="h-3 w-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                          <IconComponent className="h-5 w-5" style={{ color: category.color }} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span>{pkg.name}</span>
                              {pkg.is_featured && !pkg.image_url && (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                  <Star className="h-3 w-3 mr-1" />
                                  Featured
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {packageHasDiscount ? (
                                <>
                                  <div className="text-2xl font-bold text-green-600">
                                    {formatPrice(finalPrice)}
                                  </div>
                                  <div className="text-lg line-through text-muted-foreground">
                                    {formatPrice(originalPrice)}
                                  </div>
                                  <Badge variant="destructive" className="text-xs">
                                    SALE
                                  </Badge>
                                </>
                              ) : (
                                <div className="text-2xl font-bold text-primary">
                                  {formatPrice(finalPrice)}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">{pkg.description}</p>
                        
                        {/* Stock Information */}
                        {pkg.stock_quantity !== null && (
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {pkg.stock_quantity > 0 ? (
                                <span className="text-green-600">In Stock ({pkg.stock_quantity} available)</span>
                              ) : (
                                <span className="text-red-600">Out of Stock</span>
                              )}
                            </span>
                          </div>
                        )}

                        {/* Duration Information */}
                        {pkg.duration_days && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              Duration: {pkg.duration_days} days
                            </span>
                          </div>
                        )}
                        
                        {pkg.items && typeof pkg.items === 'object' && Array.isArray(pkg.items) && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Includes:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {(pkg.items as string[]).map((item, index) => (
                                <li key={index} className="flex items-center gap-2">
                                  <span className="text-green-500">✓</span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Cart Controls */}
                        {(() => {
                          const quantityInCart = getItemQuantityInCart(pkg.id);
                          const isOutOfStock = pkg.stock_quantity === 0;
                          
                          if (isOutOfStock) {
                            return (
                              <Button 
                                variant="secondary" 
                                className="w-full" 
                                disabled
                              >
                                <Package className="h-4 w-4 mr-2" />
                                Out of Stock
                              </Button>
                            );
                          }
                          
                          if (quantityInCart === 0) {
                            return (
                              <Button 
                                variant="hero" 
                                className="w-full" 
                                style={{ backgroundColor: category.color }}
                                onClick={() => handleAddToCart(pkg)}
                              >
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Add to Cart
                              </Button>
                            );
                          }
                          
                          return (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateQuantity(pkg.id, quantityInCart - 1)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="flex-1 text-center text-sm font-medium">
                                  {quantityInCart} in cart
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateQuantity(pkg.id, quantityInCart + 1)}
                                  className="h-8 w-8 p-0"
                                  disabled={pkg.stock_quantity !== null && quantityInCart >= pkg.stock_quantity}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              <Button 
                                variant="outline"
                                size="sm"
                                className="w-full text-red-600 hover:text-red-700"
                                onClick={() => handleUpdateQuantity(pkg.id, 0)}
                              >
                                Remove from Cart
                              </Button>
                            </div>
                          );
                        })()}
                        
                        <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                          <span>Type: {pkg.package_type?.replace('_', ' ')}</span>
                          {pkg.sort_order && <span>Priority: {pkg.sort_order}</span>}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                
                {getPackagesByCategory(category.id).length === 0 && (
                  <div className="col-span-full text-center py-8">
                    <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">No packages available in this category yet.</p>
                  </div>
                )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Minecraft Username Prompt */}
      <MinecraftUsernamePrompt
        open={showMinecraftPrompt}
        onUsernameSet={handleMinecraftUsernameSet}
      />
    </div>
  );
}
