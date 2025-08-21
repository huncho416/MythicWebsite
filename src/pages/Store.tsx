import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Star, Package, Gift } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

export default function Store() {
  const [categories, setCategories] = useState<Tables<'store_categories'>[]>([]);
  const [packages, setPackages] = useState<Tables<'store_packages'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("");

  const canonical = typeof window !== 'undefined' ? window.location.origin + '/store' : '';

  useEffect(() => {
    loadStoreData();
  }, []);

  const loadStoreData = async () => {
    try {
      setLoading(true);
      
      const [categoriesRes, packagesRes] = await Promise.all([
        supabase.from('store_categories').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
        supabase.from('store_packages').select(`
          *,
          store_categories(name)
        `).eq('is_active', true).order('price', { ascending: true })
      ]);

      if (categoriesRes.data) {
        setCategories(categoriesRes.data);
        if (categoriesRes.data.length > 0) {
          setActiveCategory(categoriesRes.data[0].id);
        }
      }
      if (packagesRes.data) setPackages(packagesRes.data);
      
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

  const getPackageIcon = (packageType: string) => {
    const icons: Record<string, any> = {
      rank: Star,
      item: Package,
      cosmetic: Gift,
      bundle: ShoppingCart
    };
    return icons[packageType] || Package;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12">
        <Helmet>
          <title>Store | MythicPvP Ranks and Perks</title>
          <meta name="description" content="Purchase MythicPvP ranks, keys, and cosmetics to enhance your gameplay." />
          <link rel="canonical" href={canonical} />
        </Helmet>
        <h1 className="font-brand text-4xl mb-8">Server Store</h1>
        <div className="text-center py-8">Loading store...</div>
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
                    <span>Starting from {getPackagesByCategory(category.id).length > 0 && formatPrice(Math.min(...getPackagesByCategory(category.id).map(pkg => pkg.sale_price || pkg.price)))}</span>
                  </div>
                </div>

                {/* Packages Grid */}
                <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                  {getPackagesByCategory(category.id).map((pkg) => {
                    const IconComponent = getPackageIcon(pkg.package_type);
                    const hasDiscount = pkg.sale_price && pkg.sale_price < pkg.price;
                  
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
                              {hasDiscount ? (
                                <>
                                  <div className="text-2xl font-bold text-green-600">
                                    {formatPrice(pkg.sale_price!)}
                                  </div>
                                  <div className="text-lg line-through text-muted-foreground">
                                    {formatPrice(pkg.price)}
                                  </div>
                                  <Badge variant="destructive" className="text-xs">
                                    SALE
                                  </Badge>
                                </>
                              ) : (
                                <div className="text-2xl font-bold text-primary">
                                  {formatPrice(pkg.price)}
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
                        
                        <Button 
                          variant="hero" 
                          className="w-full" 
                          style={{ backgroundColor: category.color }}
                          disabled={pkg.stock_quantity === 0}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          {pkg.stock_quantity === 0 ? 'Out of Stock' : `Purchase ${pkg.name}`}
                        </Button>
                        
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
    </div>
  );
}
