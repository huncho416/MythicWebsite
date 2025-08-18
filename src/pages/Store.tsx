import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
        supabase.from('store_categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('store_packages').select(`
          *,
          store_categories(name)
        `).eq('is_active', true).order('price')
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
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {categories.map((category) => (
              <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-2">
                <span style={{ color: category.color }}>{category.icon}</span>
                <span>{category.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((category) => (
            <TabsContent key={category.id} value={category.id} className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">{category.name}</h2>
                <p className="text-muted-foreground">{category.description}</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {getPackagesByCategory(category.id).map((pkg) => {
                  const IconComponent = getPackageIcon(pkg.package_type);
                  
                  return (
                    <Card key={pkg.id} className="bg-secondary/40 hover:bg-secondary/60 transition-colors">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                          <IconComponent className="h-5 w-5" style={{ color: category.color }} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span>{pkg.name}</span>
                              {pkg.is_featured && (
                                <Badge variant="secondary">
                                  <Star className="h-3 w-3 mr-1" />
                                  Featured
                                </Badge>
                              )}
                            </div>
                            <div className="text-2xl font-bold text-primary mt-1">
                              {formatPrice(pkg.price)}
                            </div>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">{pkg.description}</p>
                        
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
                        
                        <Button variant="hero" className="w-full">
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Purchase {pkg.name}
                        </Button>
                        
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Type: {pkg.package_type}</span>
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
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
