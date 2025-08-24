import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

export type CartItem = {
  id: string;
  cart_id: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  unit_price: number;
  metadata?: any;
  created_at: string;
  updated_at: string;
  store_packages: Tables<'store_packages'>;
};

export type Cart = {
  id: string;
  user_id?: string;
  session_id?: string;
  created_at: string;
  updated_at: string;
  cart_items: CartItem[];
};

interface CartTotals {
  subtotal: number;
  discount: number;
  tax: number;
  fees: number;
  total: number;
  valid_coupon: boolean;
}

interface UseCartReturn {
  cart: Cart | null;
  items: CartItem[];
  totals: CartTotals;
  loading: boolean;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  couponCode: string | null;
}

// Generate a session ID for guest users
const getSessionId = () => {
  let sessionId = localStorage.getItem('cart_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('cart_session_id', sessionId);
  }
  return sessionId;
};

export const useCart = (): UseCartReturn => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [totals, setTotals] = useState<CartTotals>({
    subtotal: 0,
    discount: 0,
    tax: 0,
    fees: 0,
    total: 0,
    valid_coupon: false,
  });
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const { toast } = useToast();

  // Get or create cart
  const getOrCreateCart = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let cartQuery;
      if (user) {
        cartQuery = supabase
          .from('carts')
          .select(`
            *,
            cart_items (
              *,
              store_packages (*)
            )
          `)
          .eq('user_id', user.id)
          .single();
      } else {
        const sessionId = getSessionId();
        cartQuery = supabase
          .from('carts')
          .select(`
            *,
            cart_items (
              *,
              store_packages (*)
            )
          `)
          .eq('session_id', sessionId)
          .single();
      }

      const { data: existingCart, error } = await cartQuery;

      if (error && error.code === 'PGRST116') {
        // Cart doesn't exist, create it
        const newCartData = user 
          ? { user_id: user.id }
          : { session_id: getSessionId() };

        const { data: newCart, error: createError } = await supabase
          .from('carts')
          .insert(newCartData)
          .select(`
            *,
            cart_items (
              *,
              store_packages (*)
            )
          `)
          .single();

        if (createError) throw createError;
        return newCart as Cart;
      } else if (error) {
        throw error;
      }

      return existingCart as Cart;
    } catch (error) {
      console.error('Error getting/creating cart:', error);
      throw error;
    }
  }, []);

  // Calculate totals with coupon
  const calculateTotals = useCallback(async (cartId: string, appliedCoupon?: string) => {
    try {
      const { data, error } = await supabase
        .rpc('calculate_cart_totals', {
          cart_id_param: cartId,
          coupon_code_param: appliedCoupon || null
        });

      if (error) throw error;

      const newTotals: CartTotals = {
        subtotal: parseFloat(data.subtotal || 0),
        discount: parseFloat(data.discount || 0),
        tax: parseFloat(data.tax || 0),
        fees: parseFloat(data.fees || 0),
        total: parseFloat(data.total || 0),
        valid_coupon: data.valid_coupon || false,
      };

      setTotals(newTotals);
      return newTotals;
    } catch (error) {
      console.error('Error calculating totals:', error);
      return totals;
    }
  }, [totals]);

  // Load cart data
  const refreshCart = useCallback(async () => {
    try {
      setLoading(true);
      const cartData = await getOrCreateCart();
      setCart(cartData);
      setItems(cartData.cart_items || []);
      
      if (cartData.id) {
        await calculateTotals(cartData.id, couponCode || undefined);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
      toast({
        title: "Error",
        description: "Failed to load cart",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [getOrCreateCart, calculateTotals, couponCode, toast]);

  // Add item to cart
  const addItem = useCallback(async (productId: string, quantity: number = 1) => {
    try {
      if (!cart) {
        await refreshCart();
        return;
      }

      // Get product details for pricing
      const { data: product, error: productError } = await supabase
        .from('store_packages')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError) throw productError;

      const unitPrice = product.sale_price || product.price;

      // Check if item already exists in cart
      const existingItem = items.find(item => item.product_id === productId);

      if (existingItem) {
        // Update quantity
        await updateQuantity(existingItem.id, existingItem.quantity + quantity);
      } else {
        // Add new item
        const { error } = await supabase
          .from('cart_items')
          .insert({
            cart_id: cart.id,
            product_id: productId,
            quantity,
            unit_price: unitPrice,
          });

        if (error) throw error;

        toast({
          title: "Added to cart",
          description: `${product.name} has been added to your cart`,
        });

        await refreshCart();
      }
    } catch (error) {
      console.error('Error adding item to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    }
  }, [cart, items, updateQuantity, refreshCart, toast]);

  // Update item quantity
  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        await removeItem(itemId);
        return;
      }

      const { error } = await supabase
        .from('cart_items')
        .update({ 
          quantity,
          updated_at: new Date().toISOString() 
        })
        .eq('id', itemId);

      if (error) throw error;

      await refreshCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast({
        title: "Error",
        description: "Failed to update item quantity",
        variant: "destructive",
      });
    }
  }, [removeItem, refreshCart, toast]);

  // Remove item from cart
  const removeItem = useCallback(async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Item removed",
        description: "Item has been removed from your cart",
      });

      await refreshCart();
    } catch (error) {
      console.error('Error removing item:', error);
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      });
    }
  }, [refreshCart, toast]);

  // Apply coupon
  const applyCoupon = useCallback(async (code: string): Promise<boolean> => {
    try {
      if (!cart) return false;

      const newTotals = await calculateTotals(cart.id, code);
      
      if (newTotals.valid_coupon) {
        setCouponCode(code);
        localStorage.setItem('applied_coupon', code);
        toast({
          title: "Coupon applied",
          description: `Discount of $${newTotals.discount.toFixed(2)} applied`,
        });
        return true;
      } else {
        toast({
          title: "Invalid coupon",
          description: "The coupon code is invalid or cannot be applied to your cart",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
      toast({
        title: "Error",
        description: "Failed to apply coupon",
        variant: "destructive",
      });
      return false;
    }
  }, [cart, calculateTotals, toast]);

  // Remove coupon
  const removeCoupon = useCallback(() => {
    setCouponCode(null);
    localStorage.removeItem('applied_coupon');
    if (cart) {
      calculateTotals(cart.id);
    }
    toast({
      title: "Coupon removed",
      description: "Coupon has been removed from your cart",
    });
  }, [cart, calculateTotals, toast]);

  // Clear cart
  const clearCart = useCallback(async () => {
    try {
      if (!cart) return;

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cart.id);

      if (error) throw error;

      await refreshCart();
      setCouponCode(null);
      localStorage.removeItem('applied_coupon');
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast({
        title: "Error",
        description: "Failed to clear cart",
        variant: "destructive",
      });
    }
  }, [cart, refreshCart, toast]);

  // Initialize cart on mount
  useEffect(() => {
    refreshCart();
    
    // Load saved coupon
    const savedCoupon = localStorage.getItem('applied_coupon');
    if (savedCoupon) {
      setCouponCode(savedCoupon);
    }
  }, []);

  // Recalculate totals when coupon changes
  useEffect(() => {
    if (cart) {
      calculateTotals(cart.id, couponCode || undefined);
    }
  }, [cart, couponCode, calculateTotals]);

  return {
    cart,
    items,
    totals,
    loading,
    addItem,
    updateQuantity,
    removeItem,
    applyCoupon,
    removeCoupon,
    clearCart,
    refreshCart,
    couponCode,
  };
};
