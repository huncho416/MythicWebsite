import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Order = Tables<'orders'>;
type OrderItem = Tables<'order_items'>;
type StorePackage = Tables<'store_packages'>;

export interface CreateOrderInput {
  user_id: string;
  items: {
    package_id: string;
    quantity: number;
  }[];
  billing_email?: string;
  billing_address?: any;
  discount_code?: string;
  gift_card_code?: string;
  payment_provider: 'stripe' | 'paypal';
  payment_method?: string;
}

export interface OrderSummary {
  subtotal: number;
  discount_amount: number;
  gift_card_amount: number;
  total_amount: number;
  final_amount: number;
}

export class OrderService {
  /**
   * Calculate order totals including discounts and gift cards
   */
  static async calculateOrderTotals(items: CreateOrderInput['items'], discountCode?: string, giftCardCode?: string): Promise<OrderSummary> {
    // Fetch package details
    const packageIds = items.map(item => item.package_id);
    const { data: packages, error } = await supabase
      .from('store_packages')
      .select('id, price, sale_price')
      .in('id', packageIds);

    if (error) throw error;

    // Calculate subtotal
    let subtotal = 0;
    for (const item of items) {
      const pkg = packages?.find(p => p.id === item.package_id);
      if (pkg) {
        const price = pkg.sale_price || pkg.price;
        subtotal += price * item.quantity;
      }
    }

    let discount_amount = 0;
    let gift_card_amount = 0;

    // Apply discount code if provided
    if (discountCode) {
      const { data: discount } = await supabase
        .from('discounts')
        .select('*')
        .eq('code', discountCode)
        .eq('is_active', true)
        .single();

      if (discount && this.isDiscountValid(discount)) {
        if (discount.discount_type === 'percentage') {
          discount_amount = (subtotal * discount.discount_value) / 100;
        } else {
          discount_amount = Math.min(discount.discount_value, subtotal);
        }

        // Apply maximum discount limit if set
        // Note: Currently no max_discount_amount field in schema
        // You may want to add this field to the discounts table if needed
      }
    }

    // Apply gift card if provided
    if (giftCardCode) {
      // TODO: Implement gift card logic when gift cards are added
      // For now, gift card amount remains 0
    }

    const total_amount = subtotal;
    const final_amount = Math.max(0, subtotal - discount_amount - gift_card_amount);

    return {
      subtotal,
      discount_amount,
      gift_card_amount,
      total_amount,
      final_amount
    };
  }

  /**
   * Create a new order with items
   */
  static async createOrder(input: CreateOrderInput): Promise<Order> {
    const orderTotals = await this.calculateOrderTotals(
      input.items,
      input.discount_code,
      input.gift_card_code
    );

    // Generate order number
    const orderNumber = this.generateOrderNumber();

    // Create order
    const orderData = {
      user_id: input.user_id,
      order_number: orderNumber,
      total_amount: orderTotals.total_amount,
      final_amount: orderTotals.final_amount,
      discount_amount: orderTotals.discount_amount || null,
      discount_code: input.discount_code || null,
      gift_card_amount: orderTotals.gift_card_amount || null,
      gift_card_code: input.gift_card_code || null,
      billing_email: input.billing_email || null,
      billing_address: input.billing_address || null,
      payment_provider: input.payment_provider,
      payment_method: input.payment_method || null,
      status: 'pending' as const
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const { data: packages, error: packagesError } = await supabase
      .from('store_packages')
      .select('id, price, sale_price')
      .in('id', input.items.map(item => item.package_id));

    if (packagesError) throw packagesError;

    const orderItems = input.items.map(item => {
      const pkg = packages?.find(p => p.id === item.package_id);
      if (!pkg) throw new Error(`Package not found: ${item.package_id}`);

      const unit_price = pkg.sale_price || pkg.price;
      return {
        order_id: order.id,
        package_id: item.package_id,
        quantity: item.quantity,
        unit_price,
        total_price: unit_price * item.quantity
      };
    });

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    return order;
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(orderId: string, status: string, metadata?: any): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (metadata) {
      updateData.metadata = metadata;
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (error) throw error;
  }

  /**
   * Create command execution logs for an order
   */
  static async createCommandLogs(orderId: string): Promise<void> {
    // Get order with items and packages
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          store_packages(*)
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    // Get user profile for username
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('user_id', order.user_id)
      .single();

    if (profileError) {
      console.warn('Failed to get user profile for command execution:', profileError);
      return;
    }

    const username = profile.username;
    if (!username) {
      console.warn('No username found for user, cannot execute commands');
      return;
    }

    // Create command logs for each order item
    const commandLogs = order.order_items.flatMap((item: any) => {
      const commands = [];
      const pkg = item.store_packages;
      
      if (pkg.command_template) {
        // Create one command log per quantity
        for (let i = 0; i < item.quantity; i++) {
          // Replace placeholders in command template
          const command = pkg.command_template
            .replace(/{username}/g, username)
            .replace(/{package_name}/g, pkg.name)
            .replace(/{quantity}/g, item.quantity.toString())
            .replace(/{order_id}/g, orderId);

          commands.push({
            order_id: orderId,
            package_id: pkg.id,
            username,
            command,
            status: 'pending',
            max_attempts: 3,
            attempts: 0
          });
        }
      }
      
      return commands;
    });

    if (commandLogs.length > 0) {
      const { error: commandError } = await supabase
        .from('command_execution_logs')
        .insert(commandLogs);

      if (commandError) {
        console.error('Failed to create command logs:', commandError);
      }
    }
  }

  /**
   * Generate a unique order number
   */
  private static generateOrderNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD-${timestamp.slice(-6)}-${random}`;
  }

  /**
   * Check if a discount is currently valid
   */
  private static isDiscountValid(discount: any): boolean {
    const now = new Date();
    
    // Check if discount is active
    if (!discount.is_active) return false;

    // Check start date
    if (discount.starts_at && new Date(discount.starts_at) > now) return false;

    // Check end date
    if (discount.expires_at && new Date(discount.expires_at) < now) return false;

    // Check usage limits
    if (discount.max_uses && discount.uses_count >= discount.max_uses) return false;

    return true;
  }

  /**
   * Get order details with all related data
   */
  static async getOrderDetails(orderId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          store_packages(*)
        ),
        payment_logs(*),
        command_execution_logs(*)
      `)
      .eq('id', orderId)
      .single();

    if (error) throw error;
    return data;
  }
}
