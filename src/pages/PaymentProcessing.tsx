import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CreditCard, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function PaymentProcessing() {
  const { provider } = useParams<{ provider: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  const [orderDetails, setOrderDetails] = useState<any>(null);

  const orderId = searchParams.get('order');
  const canonical = typeof window !== 'undefined' ? window.location.origin + `/checkout/pay/${provider}` : '';

  useEffect(() => {
    loadOrderAndProcess();
  }, [orderId, provider]);

  const loadOrderAndProcess = async () => {
    try {
      // Load order details
      if (orderId) {
        const { data: order, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (error) throw error;
        setOrderDetails(order);
      }

      // Simulate payment processing
      await processPayment();
    } catch (error) {
      console.error('Error processing payment:', error);
      setStatus('failed');
      toast({
        title: "Payment Failed",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const processPayment = async () => {
    // Simulate processing with progress bar
    const steps = [
      { progress: 20, message: "Verifying payment details..." },
      { progress: 40, message: "Processing payment..." },
      { progress: 60, message: "Confirming transaction..." },
      { progress: 80, message: "Updating order status..." },
      { progress: 100, message: "Payment completed!" },
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setProgress(step.progress);
    }

    // Simulate payment success (in real implementation, this would be based on actual payment gateway response)
    if (provider === 'manual') {
      // For manual payments, mark as pending and require admin approval
      await updateOrderStatus('pending');
      setStatus('success');
      // Redirect to success page after a short delay
      setTimeout(() => {
        navigate(`/payment/success?order=${orderId}`);
      }, 1500);
    } else {
      // For other providers (stripe, paypal), simulate successful payment
      await updateOrderStatus('completed');
      setStatus('success');
      // Redirect to success page after a short delay
      setTimeout(() => {
        navigate(`/payment/success?order=${orderId}`);
      }, 1500);
    }
  };

  const updateOrderStatus = async (status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled') => {
    if (!orderId) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const getProviderIcon = () => {
    switch (provider) {
      case 'stripe':
        return <CreditCard className="h-8 w-8 text-purple-600" />;
      case 'paypal':
        return <CreditCard className="h-8 w-8 text-blue-600" />;
      case 'manual':
        return <Clock className="h-8 w-8 text-green-600" />;
      default:
        return <CreditCard className="h-8 w-8 text-gray-600" />;
    }
  };

  const getProviderName = () => {
    switch (provider) {
      case 'stripe':
        return 'Stripe';
      case 'paypal':
        return 'PayPal';
      case 'manual':
        return 'Manual Payment';
      default:
        return 'Payment Gateway';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <div className="container mx-auto py-12">
      <Helmet>
        <title>Processing Payment | MythicPvP</title>
        <meta name="description" content="Processing your payment securely..." />
        <link rel="canonical" href={canonical} />
      </Helmet>

      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {status === 'processing' && getProviderIcon()}
              {status === 'success' && <CheckCircle className="h-8 w-8 text-green-600" />}
              {status === 'failed' && <XCircle className="h-8 w-8 text-red-600" />}
            </div>
            <CardTitle className="text-xl">
              {status === 'processing' && `Processing ${getProviderName()} Payment`}
              {status === 'success' && 'Payment Successful!'}
              {status === 'failed' && 'Payment Failed'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {orderDetails && (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Order #{orderDetails.order_number}</p>
                <p className="text-lg font-semibold">{formatPrice(orderDetails.final_amount)}</p>
              </div>
            )}

            {status === 'processing' && (
              <div className="space-y-4">
                <Progress value={progress} className="w-full" />
                <p className="text-center text-sm text-gray-600">
                  Please wait while we process your payment...
                </p>
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </div>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center space-y-4">
                <p className="text-green-600 font-medium">
                  Your payment has been processed successfully!
                </p>
                <p className="text-sm text-gray-600">
                  Redirecting to confirmation page...
                </p>
              </div>
            )}

            {status === 'failed' && (
              <div className="text-center space-y-4">
                <p className="text-red-600 font-medium">
                  Payment processing failed. Please try again.
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/payment')}
                    className="flex-1"
                  >
                    Try Again
                  </Button>
                  <Button 
                    onClick={() => navigate('/cart')}
                    className="flex-1"
                  >
                    Back to Cart
                  </Button>
                </div>
              </div>
            )}

            {provider === 'manual' && status === 'processing' && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Manual Payment:</strong> Your order will be processed once payment is confirmed by our team.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
