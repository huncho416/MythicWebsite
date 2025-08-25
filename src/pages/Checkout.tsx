import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  CreditCard, 
  User, 
  MapPin, 
  Mail, 
  Phone,
  ShoppingCart,
  ArrowLeft,
  Lock
} from "lucide-react";
import { validateEmail } from "@/lib/security";
import { supabase } from "@/integrations/supabase/client";
import { MinecraftUsernamePrompt } from "@/components/ui/minecraft-username-prompt";

interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  agreedToTos: boolean;
}

export default function Checkout() {
  const navigate = useNavigate();
  const { items, totals, loading, couponCode } = useCart();
  const { toast } = useToast();
  
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: {
      street: "",
      city: "",
      state: "",
      postalCode: "",
      country: "US"
    },
    agreedToTos: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showMinecraftPrompt, setShowMinecraftPrompt] = useState(false);
  const [hasMinecraftUsername, setHasMinecraftUsername] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const canonical = typeof window !== 'undefined' ? window.location.origin + '/checkout' : '';

  // Check if user has Minecraft username
  useEffect(() => {
    checkMinecraftUsername();
  }, []);

  // Redirect if cart is empty
  useEffect(() => {
    if (!loading && items.length === 0) {
      navigate('/cart');
    }
  }, [loading, items.length, navigate]);

  const checkMinecraftUsername = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('minecraft_username')
        .eq('user_id', user.id)
        .single();

      if (!profile?.minecraft_username) {
        setShowMinecraftPrompt(true);
        setHasMinecraftUsername(false);
      } else {
        setHasMinecraftUsername(true);
      }
    } catch (error) {
      console.error('Error checking Minecraft username:', error);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleMinecraftUsernameSet = (username: string) => {
    setShowMinecraftPrompt(false);
    setHasMinecraftUsername(true);
    toast({
      title: "Success",
      description: "You can now proceed with your purchase!",
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!customerInfo.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }
    if (!customerInfo.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }
    if (!customerInfo.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(customerInfo.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!customerInfo.address.street.trim()) {
      newErrors.street = "Street address is required";
    }
    if (!customerInfo.address.city.trim()) {
      newErrors.city = "City is required";
    }
    if (!customerInfo.address.state.trim()) {
      newErrors.state = "State/Province is required";
    }
    if (!customerInfo.address.postalCode.trim()) {
      newErrors.postalCode = "Postal code is required";
    }
    if (!customerInfo.agreedToTos) {
      newErrors.tos = "You must agree to the Terms of Service";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Please fix the errors",
        description: "Check the highlighted fields and try again",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    
    try {
      // Store customer info in localStorage for payment page
      localStorage.setItem('checkout_customer_info', JSON.stringify(customerInfo));
      
      // Navigate to payment selection
      navigate('/payment');
    } catch (error) {
      console.error('Error proceeding to payment:', error);
      toast({
        title: "Error",
        description: "Failed to proceed to payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const updateCustomerInfo = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setCustomerInfo(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof CustomerInfo] as any),
          [child]: value
        }
      }));
    } else {
      setCustomerInfo(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }
  };

  if (loading || checkingAuth) {
    return (
      <div className="container mx-auto py-12">
        <Helmet>
          <title>Checkout | MythicPvP</title>
          <meta name="description" content="Complete your purchase on MythicPvP" />
          <link rel="canonical" href={canonical} />
        </Helmet>
        <div className="text-center py-8">Loading checkout...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12">
      <Helmet>
        <title>Checkout | MythicPvP</title>
        <meta name="description" content="Complete your purchase on MythicPvP" />
        <link rel="canonical" href={canonical} />
      </Helmet>

      <div className="flex items-center gap-3 mb-8">
        <CreditCard className="h-8 w-8 text-primary" />
        <h1 className="font-brand text-4xl">Checkout</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Customer Information Form */}
        <div className="lg:col-span-2">
          {!hasMinecraftUsername && !showMinecraftPrompt && (
            <div className="mb-6 p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-yellow-500 rounded-full" />
                <p className="text-yellow-800 font-medium">
                  Minecraft Username Required
                </p>
              </div>
              <p className="text-yellow-700 text-sm mt-1">
                You need to set your Minecraft username before making a purchase. 
                <button 
                  className="underline ml-1"
                  onClick={() => setShowMinecraftPrompt(true)}
                  type="button"
                >
                  Click here to set it now
                </button>
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={customerInfo.firstName}
                      onChange={(e) => updateCustomerInfo('firstName', e.target.value)}
                      className={errors.firstName ? "border-destructive" : ""}
                    />
                    {errors.firstName && (
                      <p className="text-sm text-destructive mt-1">{errors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={customerInfo.lastName}
                      onChange={(e) => updateCustomerInfo('lastName', e.target.value)}
                      className={errors.lastName ? "border-destructive" : ""}
                    />
                    {errors.lastName && (
                      <p className="text-sm text-destructive mt-1">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => updateCustomerInfo('email', e.target.value)}
                      className={`pl-10 ${errors.email ? "border-destructive" : ""}`}
                      placeholder="your@email.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={customerInfo.phone}
                      onChange={(e) => updateCustomerInfo('phone', e.target.value)}
                      className="pl-10"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Billing Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Billing Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="street">Street Address *</Label>
                  <Input
                    id="street"
                    value={customerInfo.address.street}
                    onChange={(e) => updateCustomerInfo('address.street', e.target.value)}
                    className={errors.street ? "border-destructive" : ""}
                    placeholder="123 Main Street"
                  />
                  {errors.street && (
                    <p className="text-sm text-destructive mt-1">{errors.street}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={customerInfo.address.city}
                      onChange={(e) => updateCustomerInfo('address.city', e.target.value)}
                      className={errors.city ? "border-destructive" : ""}
                    />
                    {errors.city && (
                      <p className="text-sm text-destructive mt-1">{errors.city}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="state">State/Province *</Label>
                    <Input
                      id="state"
                      value={customerInfo.address.state}
                      onChange={(e) => updateCustomerInfo('address.state', e.target.value)}
                      className={errors.state ? "border-destructive" : ""}
                    />
                    {errors.state && (
                      <p className="text-sm text-destructive mt-1">{errors.state}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="postalCode">Postal Code *</Label>
                    <Input
                      id="postalCode"
                      value={customerInfo.address.postalCode}
                      onChange={(e) => updateCustomerInfo('address.postalCode', e.target.value)}
                      className={errors.postalCode ? "border-destructive" : ""}
                    />
                    {errors.postalCode && (
                      <p className="text-sm text-destructive mt-1">{errors.postalCode}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="country">Country *</Label>
                    <Select
                      value={customerInfo.address.country}
                      onValueChange={(value) => updateCustomerInfo('address.country', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                        <SelectItem value="UK">United Kingdom</SelectItem>
                        <SelectItem value="AU">Australia</SelectItem>
                        <SelectItem value="DE">Germany</SelectItem>
                        <SelectItem value="FR">France</SelectItem>
                        <SelectItem value="NL">Netherlands</SelectItem>
                        <SelectItem value="SE">Sweden</SelectItem>
                        <SelectItem value="NO">Norway</SelectItem>
                        <SelectItem value="DK">Denmark</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Terms of Service */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="tos"
                    checked={customerInfo.agreedToTos}
                    onCheckedChange={(checked) => updateCustomerInfo('agreedToTos', checked)}
                  />
                  <div className="space-y-1 leading-none">
                    <Label
                      htmlFor="tos"
                      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                        errors.tos ? "text-destructive" : ""
                      }`}
                    >
                      I agree to the Terms of Service and Privacy Policy *
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      By checking this box, you agree to our terms and conditions.
                    </p>
                  </div>
                </div>
                {errors.tos && (
                  <p className="text-sm text-destructive mt-2">{errors.tos}</p>
                )}
              </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/cart')}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Cart
              </Button>
              <Button
                type="submit"
                disabled={submitting || !hasMinecraftUsername}
                className="flex-1"
              >
                {submitting ? "Processing..." : 
                 !hasMinecraftUsername ? "Minecraft Username Required" : 
                 "Continue to Payment"}
                <Lock className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </form>
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items */}
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center">
                      {item.store_packages.image_url ? (
                        <img
                          src={item.store_packages.image_url}
                          alt={item.store_packages.name}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-primary/20 rounded" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.store_packages.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Qty: {item.quantity}</span>
                        <span>×</span>
                        <span>{formatPrice(item.unit_price)}</span>
                      </div>
                    </div>
                    <div className="font-medium text-sm">
                      {formatPrice(item.quantity * item.unit_price)}
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Coupon */}
              {couponCode && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1">
                      Coupon
                      <Badge variant="outline" className="text-xs">{couponCode}</Badge>
                    </span>
                    <span className="text-green-600">-{formatPrice(totals.discount)}</span>
                  </div>
                  <Separator />
                </>
              )}

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatPrice(totals.subtotal)}</span>
                </div>

                {totals.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(totals.discount)}</span>
                  </div>
                )}

                {totals.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Tax</span>
                    <span>{formatPrice(totals.tax)}</span>
                  </div>
                )}

                {totals.fees > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Processing Fee</span>
                    <span>{formatPrice(totals.fees)}</span>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatPrice(totals.total)}</span>
                </div>
              </div>

              {/* Security Notice */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 p-3 rounded">
                <Lock className="h-4 w-4" />
                <span>Your payment information is encrypted and secure</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Minecraft Username Prompt */}
      <MinecraftUsernamePrompt 
        open={showMinecraftPrompt} 
        onUsernameSet={handleMinecraftUsernameSet}
      />
    </div>
  );
}
