import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Package, Clock, ArrowRight, Home, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface OrderDetails {
  orderId: string;
  orderNumber: string;
  total: number;
  provider: string;
  customerName?: string;
  email?: string;
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const canonical = typeof window !== 'undefined' ? window.location.origin + '/payment/success' : '';

  useEffect(() => {
    loadOrderDetails();
  }, []);

  const loadOrderDetails = async () => {
    try {
      const orderId = searchParams.get('order');
      const stored = localStorage.getItem('pending_order');
      
      let orderInfo: OrderDetails | null = null;
      
      if (stored) {
        orderInfo = JSON.parse(stored);
      } else if (orderId) {
        // Fallback: load order from database
        const { data: order, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();
          
        if (error) throw error;
        
        orderInfo = {
          orderId: order.id,
          orderNumber: order.order_number,
          total: order.final_amount,
          provider: order.payment_provider || 'unknown',
          customerName: order.billing_name,
          email: order.billing_email
        };
      }
      
      if (!orderInfo) {
        throw new Error('Order information not found');
      }
      
      setOrderDetails(orderInfo);
      
      // Clear the stored order info since payment is complete
      localStorage.removeItem('pending_order');
      
    } catch (error) {
      console.error('Error loading order details:', error);
      toast({
        title: "Error",
        description: "Could not load order details",
        variant: "destructive",
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getProviderBadge = (provider: string) => {
    const colors: Record<string, string> = {
      stripe: 'bg-purple-100 text-purple-800',
      paypal: 'bg-blue-100 text-blue-800',
      manual: 'bg-green-100 text-green-800',
    };
    
    return (
      <Badge className={colors[provider] || 'bg-gray-100 text-gray-800'}>
        {provider.charAt(0).toUpperCase() + provider.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div className="container mx-auto py-12">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-8">
            <p>Order details not found.</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12">
      <Helmet>
        <title>Payment Successful | MythicPvP</title>
        <meta name="description" content="Your payment has been processed successfully. Your items will be delivered shortly." />
        <link rel="canonical" href={canonical} />
      </Helmet>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Success Header */}
        <Card className="text-center border-purple-200 bg-purple-50">
          <CardContent className="py-8">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-purple-100 p-3">
                <CheckCircle className="h-12 w-12 text-purple-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-purple-800 mb-2">
              Payment Successful!
            </h1>
            <p className="text-purple-700 mb-4">
              Thank you for your purchase. Your payment has been processed successfully.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-purple-600">
              <Package className="h-4 w-4" />
              <span>Order #{orderDetails.orderNumber}</span>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Information */}
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-purple-800 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Delivery Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-purple-200">
                <div className="rounded-full bg-purple-100 p-2 mt-1">
                  <Package className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-purple-800 mb-1">
                    In-Game Delivery
                  </h3>
                  <p className="text-purple-700 text-sm mb-2">
                    Your items will be automatically delivered to your in-game account within <strong>10-15 minutes</strong>.
                  </p>
                  <p className="text-purple-600 text-xs">
                    Please ensure you are logged into the server to receive your items.
                  </p>
                </div>
              </div>
              
              <div className="text-center py-2">
                <p className="text-sm text-purple-600">
                  If you don't receive your items within 15 minutes, please contact our support team.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Order Number:</span>
                <span className="font-mono text-sm">{orderDetails.orderNumber}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Paid:</span>
                <span className="font-semibold text-lg">{formatPrice(orderDetails.total)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Payment Method:</span>
                {getProviderBadge(orderDetails.provider)}
              </div>
              
              {orderDetails.customerName && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Customer:</span>
                  <span>{orderDetails.customerName}</span>
                </div>
              )}
              
              {orderDetails.email && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Email:</span>
                  <span className="text-sm">{orderDetails.email}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button 
            onClick={() => navigate('/')}
            variant="outline"
            className="flex-1"
          >
            <Home className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          
          <Button 
            onClick={() => navigate('/store')}
            className="flex-1"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Continue Shopping
          </Button>
        </div>

        {/* Support Info */}
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="py-4">
            <p className="text-sm text-purple-700 text-center">
              Need help? Contact our{' '}
              <Button
                variant="link" 
                className="h-auto p-0 text-sm text-purple-600 hover:text-purple-800"
                onClick={() => navigate('/support')}
              >
                support team
              </Button>
              {' '}if you have any questions about your order.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
