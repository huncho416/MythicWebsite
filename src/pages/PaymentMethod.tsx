import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PaymentSuccessModal } from "@/components/ui/payment-success-modal";
import { 
  CreditCard, 
  ArrowLeft, 
  Shield,
  Loader2,
  CheckCircle
} from "lucide-react";

interface PaymentProvider {
  id: string;
  name: string;
  icon: string;
  description: string;
  enabled: boolean;
  fees?: {
    type: 'percent' | 'fixed';
    amount: number;
  };
}

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

export default function PaymentMethod() {
  const navigate = useNavigate();
  const { items, totals, couponCode } = useCart();
  const { toast } = useToast();
  
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successOrder, setSuccessOrder] = useState<{ orderNumber: string; total: number } | null>(null);

  const canonical = typeof window !== 'undefined' ? window.location.origin + '/checkout/payment' : '';

  useEffect(() => {
    loadCustomerInfo();
    loadPaymentProviders();
  }, []);

  const loadCustomerInfo = () => {
    const stored = localStorage.getItem('checkout_customer_info');
    if (!stored) {
      toast({
        title: "Missing information",
        description: "Please complete the checkout form first",
        variant: "destructive",
      });
      navigate('/checkout');
      return;
    }
    
    try {
      const info = JSON.parse(stored);
      setCustomerInfo(info);
    } catch (error) {
      console.error('Error parsing customer info:', error);
      navigate('/checkout');
    }
  };

  const loadPaymentProviders = async () => {
    try {
      setLoading(true);
      
      // Get enabled payment providers from settings
      const { data: settings, error } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'payments')
        .single();

      if (error) throw error;

      // Get payment configurations
      const { data: configs, error: configError } = await supabase
        .from('payment_configurations')
        .select('*')
        .eq('is_enabled', true);

      if (configError) throw configError;

      // Build provider list
      const availableProviders: PaymentProvider[] = [];

      if (configs.find(c => c.provider === 'stripe')) {
        availableProviders.push({
          id: 'stripe',
          name: 'Credit/Debit Card',
          icon: '💳',
          description: 'Pay securely with Visa, Mastercard, American Express, and more',
          enabled: true,
          fees: {
            type: 'percent',
            amount: 2.9
          }
        });
      }

      if (configs.find(c => c.provider === 'paypal')) {
        availableProviders.push({
          id: 'paypal',
          name: 'PayPal',
          icon: '🌐',
          description: 'Pay with your PayPal account or PayPal Credit',
          enabled: true,
          fees: {
            type: 'percent',
            amount: 3.49
          }
        });
      }

      // Always include manual/test method for development
      if (process.env.NODE_ENV === 'development') {
        availableProviders.push({
          id: 'manual',
          name: 'Test Payment',
          icon: '🧪',
          description: 'Test payment method for development (auto-succeeds)',
          enabled: true
        });
      }

      setProviders(availableProviders);
      
      // Auto-select first available provider
      if (availableProviders.length > 0) {
        setSelectedProvider(availableProviders[0].id);
      }
    } catch (error) {
      console.error('Error loading payment providers:', error);
      toast({
        title: "Error",
        description: "Failed to load payment methods",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async () => {
    if (!customerInfo || !selectedProvider) return;

    setCreating(true);
    
    try {
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('You must be logged in to create an order');
      }

      // Generate a unique order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create order with pending status
      const orderData = {
        user_id: user.id,
        order_number: orderNumber,
        subtotal: totals.subtotal,
        discount_total: totals.discount,
        tax_total: totals.tax,
        fee_total: totals.fees,
        total: totals.total,
        total_amount: totals.total,
        final_amount: totals.total,
        status: 'pending' as const,
        billing_name: `${customerInfo.firstName} ${customerInfo.lastName}`,
        billing_email: customerInfo.email,
        billing_address: customerInfo.address,
        payment_provider: selectedProvider,
        coupon_code: couponCode,
        currency: 'USD'
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select('*')
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        package_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Store order info for payment
      localStorage.setItem('pending_order', JSON.stringify({
        orderId: order.id,
        orderNumber: order.order_number,
        total: order.final_amount,
        provider: selectedProvider
      }));

      // Option 1: Navigate to payment processing page (current implementation)
      navigate(`/checkout/pay/${selectedProvider}?order=${order.id}`);
      
      // Option 2: Show success modal directly (uncomment to use instead of navigation)
      // setSuccessOrder({ orderNumber: order.order_number, total: order.final_amount });
      // setShowSuccessModal(true);
      
      
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "Error",
        description: "Failed to create order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setSuccessOrder(null);
  };

  const handleContinueShopping = () => {
    handleSuccessModalClose();
    navigate('/store');
  };

  const handleGoHome = () => {
    handleSuccessModalClose();
    navigate('/');
  };

  const calculateProviderFee = (provider: PaymentProvider) => {
    if (!provider.fees) return 0;
    
    if (provider.fees.type === 'percent') {
      return totals.total * (provider.fees.amount / 100);
    } else {
      return provider.fees.amount;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12">
        <Helmet>
          <title>Payment Method | MythicPvP</title>
          <meta name="description" content="Choose your payment method" />
          <link rel="canonical" href={canonical} />
        </Helmet>
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          Loading payment methods...
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12">
      <Helmet>
        <title>Payment Method | MythicPvP</title>
        <meta name="description" content="Choose your payment method" />
        <link rel="canonical" href={canonical} />
      </Helmet>

      <div className="flex items-center gap-3 mb-8">
        <CreditCard className="h-8 w-8 text-primary" />
        <h1 className="font-brand text-4xl">Payment Method</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Payment Methods */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Choose Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {providers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payment methods are currently available.
                </div>
              ) : (
                providers.map((provider) => (
                  <div
                    key={provider.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedProvider === provider.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedProvider(provider.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 flex items-center justify-center text-xl">
                        {provider.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{provider.name}</h3>
                          {selectedProvider === provider.id && (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {provider.description}
                        </p>
                        {provider.fees && (
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {provider.fees.type === 'percent' 
                                ? `${provider.fees.amount}% fee`
                                : `${formatPrice(provider.fees.amount)} fee`
                              }
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              ≈ {formatPrice(calculateProviderFee(provider))}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Security Notice */}
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-800">Secure Payment</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Your payment information is encrypted using industry-standard SSL technology. 
                    We never store your credit card details on our servers.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex gap-4 mt-6">
            <Button
              variant="outline"
              onClick={() => navigate('/checkout')}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Information
            </Button>
            <Button
              onClick={createOrder}
              disabled={!selectedProvider || creating || providers.length === 0}
              className="flex-1"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Order...
                </>
              ) : (
                `Pay ${formatPrice(totals.total)}`
              )}
            </Button>
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customerInfo && (
                <div className="text-sm">
                  <p className="font-medium">{customerInfo.firstName} {customerInfo.lastName}</p>
                  <p className="text-muted-foreground">{customerInfo.email}</p>
                </div>
              )}

              <Separator />

              {/* Items */}
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.store_packages.name} × {item.quantity}
                    </span>
                    <span>{formatPrice(item.quantity * item.unit_price)}</span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatPrice(totals.subtotal)}</span>
                </div>

                {totals.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount {couponCode && `(${couponCode})`}</span>
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
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Success Modal */}
      {successOrder && (
        <PaymentSuccessModal
          isOpen={showSuccessModal}
          onClose={handleSuccessModalClose}
          orderNumber={successOrder.orderNumber}
          total={successOrder.total}
          onContinueShopping={handleContinueShopping}
          onGoHome={handleGoHome}
        />
      )}
    </div>
  );
}
