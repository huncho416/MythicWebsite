import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, Clock, ArrowRight, Home } from "lucide-react";

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  total: number;
  onContinueShopping: () => void;
  onGoHome: () => void;
}

export function PaymentSuccessModal({ 
  isOpen, 
  onClose, 
  orderNumber, 
  total,
  onContinueShopping,
  onGoHome 
}: PaymentSuccessModalProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <DialogTitle className="text-2xl text-green-800">
            Payment Successful!
          </DialogTitle>
          <DialogDescription className="text-green-700">
            Thank you for your purchase. Your payment has been processed successfully.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Order Info */}
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">Order Number</p>
            <p className="font-mono text-lg font-semibold">{orderNumber}</p>
            <p className="text-2xl font-bold text-green-600">{formatPrice(total)}</p>
          </div>

          {/* Delivery Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-blue-100 p-2 mt-1">
                <Package className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-800 mb-1 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  In-Game Delivery
                </h3>
                <p className="text-blue-700 text-sm mb-2">
                  Your items will be automatically delivered to your in-game account within <strong>10-15 minutes</strong>.
                </p>
                <p className="text-blue-600 text-xs">
                  Please ensure you are logged into the server to receive your items.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button onClick={onContinueShopping} className="w-full">
              <ArrowRight className="h-4 w-4 mr-2" />
              Continue Shopping
            </Button>
            <Button onClick={onGoHome} variant="outline" className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>

          {/* Support Note */}
          <p className="text-xs text-gray-500 text-center">
            If you don't receive your items within 15 minutes, please contact our support team.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
