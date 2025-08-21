// Payment configuration utilities
import { supabase } from "@/integrations/supabase/client";

export interface PaymentConfig {
  id?: string;
  provider: 'stripe' | 'paypal';
  is_enabled: boolean;
  is_test_mode: boolean;
  config: {
    publishable_key?: string;
    secret_key?: string;
    webhook_secret?: string;
    client_id?: string;
    client_secret?: string;
    environment?: string;
  };
}

export class PaymentConfigService {
  static async getConfig(provider: 'stripe' | 'paypal'): Promise<PaymentConfig | null> {
    try {
      console.log(`Loading config for provider: ${provider}`);
      
      const { data, error } = await supabase
        .from('payment_configurations')
        .select('id, provider, is_enabled, is_test_mode, config')
        .eq('provider', provider)
        .eq('is_enabled', true)
        .maybeSingle(); // Use maybeSingle instead of single to handle no results

      if (error) {
        console.error(`Error loading ${provider} config:`, error);
        return null;
      }
      
      if (!data) {
        console.log(`No enabled ${provider} config found`);
        return null;
      }
      
      // Filter sensitive config fields for non-admin users
      // Only expose safe config fields for public use
      const configData = data.config as any;
      const safeConfig = {
        publishable_key: configData?.publishable_key,
        client_id: configData?.client_id,
        environment: configData?.environment
      };
      
      return {
        ...data,
        config: safeConfig
      } as PaymentConfig;
    } catch (error) {
      console.error(`Error loading ${provider} config:`, error);
      return null;
    }
  }

  static async saveConfig(config: PaymentConfig): Promise<void> {
    const { error } = await supabase
      .from('payment_configurations')
      .upsert({
        ...config,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  static async isProviderEnabled(provider: 'stripe' | 'paypal'): Promise<boolean> {
    try {
      console.log(`Checking if ${provider} is enabled`);
      
      const { data, error } = await supabase
        .from('payment_configurations')
        .select('is_enabled')
        .eq('provider', provider)
        .eq('is_enabled', true)
        .maybeSingle();

      if (error) {
        console.error(`Error checking ${provider} status:`, error);
        return false;
      }
      
      const isEnabled = data?.is_enabled ?? false;
      console.log(`${provider} enabled status:`, isEnabled);
      return isEnabled;
    } catch (error) {
      console.error(`Error checking ${provider} status:`, error);
      return false;
    }
  }
}

// Order utilities
export interface CreateOrderData {
  user_id: string;
  items: Array<{
    package_id: string;
    quantity: number;
    price: number;
  }>;
  billing_email?: string;
  billing_address?: any;
}

export class OrderService {
  static async createOrder(data: CreateOrderData): Promise<string> {
    // Calculate totals
    const subtotal = data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal; // Simplified for now

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create order
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: data.user_id,
        total_amount: subtotal,
        final_amount: total,
        status: 'pending',
        billing_email: data.billing_email,
        billing_address: data.billing_address,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Create order items
    const orderItems = data.items.map(item => ({
      order_id: order.id,
      package_id: item.package_id,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    return order.id;
  }

  static async updateOrderStatus(orderId: string, status: string, paymentData?: any): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (paymentData) {
      updateData.payment_provider = paymentData.provider;
      updateData.payment_intent_id = paymentData.intent_id;
      updateData.gateway_transaction_id = paymentData.transaction_id;
      updateData.gateway_fee = paymentData.fee;
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (error) throw error;
  }

  static async logPayment(data: {
    order_id?: string;
    provider: string;
    event_type: string;
    event_id?: string;
    status: string;
    amount?: number;
    currency?: string;
    gateway_data?: any;
  }): Promise<void> {
    const { error } = await supabase
      .from('payment_logs')
      .insert({
        ...data,
        processed_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      });

    if (error) throw error;
  }
}

// Command execution utilities
export class CommandService {
  static async logCommand(data: {
    order_id: string;
    package_id: string;
    username: string;
    command: string;
    status: 'pending' | 'executed' | 'failed';
    error_message?: string;
  }): Promise<void> {
    const { error } = await supabase
      .from('command_execution_logs')
      .insert({
        ...data,
        attempts: 0,
        max_attempts: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  static async updateCommandStatus(
    commandId: string, 
    status: 'executed' | 'failed' | 'retrying',
    errorMessage?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'executed') {
      updateData.executed_at = new Date().toISOString();
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    // Increment attempts for retrying
    if (status === 'retrying') {
      const { data: command } = await supabase
        .from('command_execution_logs')
        .select('attempts')
        .eq('id', commandId)
        .single();

      if (command) {
        updateData.attempts = (command.attempts || 0) + 1;
      }
    }

    const { error } = await supabase
      .from('command_execution_logs')
      .update(updateData)
      .eq('id', commandId);

    if (error) throw error;
  }
}
