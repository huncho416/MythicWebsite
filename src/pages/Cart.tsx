import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart, type CartItem } from "@/hooks/use-cart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Tag, 
  ArrowRight,
  Package,
  ShoppingBag
} from "lucide-react";

export default function Cart() {
  const { 
    items, 
    totals, 
    loading, 
    updateQuantity, 
    removeItem, 
    applyCoupon, 
    removeCoupon, 
    couponCode 
  } = useCart();
  
  const [couponInput, setCouponInput] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const canonical = typeof window !== 'undefined' ? window.location.origin + '/cart' : '';

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    
    setApplyingCoupon(true);
    const success = await applyCoupon(couponInput.trim());
    if (success) {
      setCouponInput("");
    }
    setApplyingCoupon(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12">
        <Helmet>
          <title>Shopping Cart | MythicPvP</title>
          <meta name="description" content="Review your selected items and proceed to checkout" />
          <link rel="canonical" href={canonical} />
        </Helmet>
        <div className="text-center py-8">Loading cart...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12">
      <Helmet>
        <title>Shopping Cart | MythicPvP</title>
        <meta name="description" content="Review your selected items and proceed to checkout" />
        <link rel="canonical" href={canonical} />
      </Helmet>

      <div className="flex items-center gap-3 mb-8">
        <ShoppingCart className="h-8 w-8 text-primary" />
        <h1 className="font-brand text-4xl">Shopping Cart</h1>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Your cart is empty</h3>
            <p className="text-muted-foreground mb-6">
              Add some awesome packages to get started!
            </p>
            <Button asChild>
              <Link to="/store">
                <Package className="h-4 w-4 mr-2" />
                Browse Store
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Product Image */}
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-secondary flex items-center justify-center">
                      {item.store_packages.image_url ? (
                        <img
                          src={item.store_packages.image_url}
                          alt={item.store_packages.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{item.store_packages.name}</h3>
                          {item.store_packages.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {item.store_packages.description}
                            </p>
                          )}
                          
                          {/* Pricing */}
                          <div className="flex items-center gap-2 mt-2">
                            {item.store_packages.sale_price ? (
                              <>
                                <span className="text-lg font-bold text-primary">
                                  {formatPrice(item.store_packages.sale_price)}
                                </span>
                                <span className="text-sm line-through text-muted-foreground">
                                  {formatPrice(item.store_packages.price)}
                                </span>
                                <Badge variant="destructive" className="text-xs">
                                  SALE
                                </Badge>
                              </>
                            ) : (
                              <span className="text-lg font-bold text-primary">
                                {formatPrice(item.store_packages.price)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Remove Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-12 text-center font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="text-lg font-bold">
                          {formatPrice(item.quantity * item.unit_price)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            {/* Coupon Code */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Coupon Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {couponCode ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-800">{couponCode}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={removeCoupon}
                      className="text-green-600 hover:text-green-700"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter coupon code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleApplyCoupon()}
                    />
                    <Button
                      onClick={handleApplyCoupon}
                      disabled={!couponInput.trim() || applyingCoupon}
                      variant="outline"
                    >
                      {applyingCoupon ? "Applying..." : "Apply"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatPrice(totals.subtotal)}</span>
                </div>

                {totals.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(totals.discount)}</span>
                  </div>
                )}

                {totals.tax > 0 && (
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>{formatPrice(totals.tax)}</span>
                  </div>
                )}

                {totals.fees > 0 && (
                  <div className="flex justify-between">
                    <span>Processing Fee</span>
                    <span>{formatPrice(totals.fees)}</span>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatPrice(totals.total)}</span>
                </div>

                <Button asChild className="w-full" size="lg">
                  <Link to="/checkout">
                    Proceed to Checkout
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>

                <Button asChild variant="outline" className="w-full">
                  <Link to="/store">Continue Shopping</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
