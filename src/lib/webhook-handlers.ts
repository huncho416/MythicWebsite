import { supabase } from '@/integrations/supabase/client';
import { OrderService } from './order-service';

export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  provider: 'stripe' | 'paypal';
}

export interface PaymentWebhookHandler {
  handleWebhook(event: WebhookEvent): Promise<void>;
}

export class StripeWebhookHandler implements PaymentWebhookHandler {
  async handleWebhook(event: WebhookEvent): Promise<void> {
    try {
      // Log the webhook event
      await this.logPaymentEvent(event);

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event);
          break;
        case 'charge.dispute.created':
          await this.handleChargeback(event);
          break;
        default:
          console.log(`Unhandled Stripe event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Error handling Stripe webhook:', error);
      throw error;
    }
  }

  private async handlePaymentSuccess(event: WebhookEvent): Promise<void> {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata?.order_id;

    if (!orderId) {
      console.warn('No order_id found in payment intent metadata');
      return;
    }

    // Update order status
    await OrderService.updateOrderStatus(orderId, 'completed', {
      payment_intent_id: paymentIntent.id,
      gateway_transaction_id: paymentIntent.charges?.data?.[0]?.id,
      gateway_fee: paymentIntent.charges?.data?.[0]?.balance_transaction?.fee || null
    });

    // Update order with payment details
    await supabase
      .from('orders')
      .update({
        payment_intent_id: paymentIntent.id,
        gateway_transaction_id: paymentIntent.charges?.data?.[0]?.id,
        gateway_fee: paymentIntent.charges?.data?.[0]?.balance_transaction?.fee || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    // Create command execution logs for the order
    await OrderService.createCommandLogs(orderId);

    console.log(`Payment completed for order ${orderId}`);
  }

  private async handlePaymentFailed(event: WebhookEvent): Promise<void> {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata?.order_id;

    if (!orderId) {
      console.warn('No order_id found in payment intent metadata');
      return;
    }

    // Update order status
    await OrderService.updateOrderStatus(orderId, 'failed', {
      payment_intent_id: paymentIntent.id,
      failure_reason: paymentIntent.last_payment_error?.message
    });

    console.log(`Payment failed for order ${orderId}`);
  }

  private async handleChargeback(event: WebhookEvent): Promise<void> {
    const dispute = event.data.object;
    const chargeId = dispute.charge;

    // Find order by gateway transaction ID
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id')
      .eq('gateway_transaction_id', chargeId);

    if (error || !orders || orders.length === 0) {
      console.warn(`No order found for charge ${chargeId}`);
      return;
    }

    // Update order status to indicate chargeback
    await OrderService.updateOrderStatus(orders[0].id, 'failed', {
      dispute_id: dispute.id,
      dispute_reason: dispute.reason,
      dispute_status: dispute.status
    });

    console.log(`Chargeback created for order ${orders[0].id}`);
  }

  private async logPaymentEvent(event: WebhookEvent): Promise<void> {
    await supabase
      .from('payment_logs')
      .insert({
        provider: 'stripe',
        event_type: event.type,
        event_id: event.id,
        gateway_data: event.data,
        status: 'received',
        processed_at: new Date().toISOString()
      });
  }
}

export class PayPalWebhookHandler implements PaymentWebhookHandler {
  async handleWebhook(event: WebhookEvent): Promise<void> {
    try {
      // Log the webhook event
      await this.logPaymentEvent(event);

      switch (event.type) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          await this.handlePaymentCompleted(event);
          break;
        case 'PAYMENT.CAPTURE.DENIED':
          await this.handlePaymentDenied(event);
          break;
        case 'CUSTOMER.DISPUTE.CREATED':
          await this.handleDispute(event);
          break;
        default:
          console.log(`Unhandled PayPal event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Error handling PayPal webhook:', error);
      throw error;
    }
  }

  private async handlePaymentCompleted(event: WebhookEvent): Promise<void> {
    const capture = event.data.resource;
    const orderId = capture.custom_id; // Assuming we store order ID in custom_id

    if (!orderId) {
      console.warn('No order_id found in PayPal capture custom_id');
      return;
    }

    // Update order status
    await OrderService.updateOrderStatus(orderId, 'completed', {
      paypal_capture_id: capture.id,
      gateway_transaction_id: capture.id
    });

    // Update order with payment details
    await supabase
      .from('orders')
      .update({
        gateway_transaction_id: capture.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    // Create command execution logs for the order
    await OrderService.createCommandLogs(orderId);

    console.log(`PayPal payment completed for order ${orderId}`);
  }

  private async handlePaymentDenied(event: WebhookEvent): Promise<void> {
    const capture = event.data.resource;
    const orderId = capture.custom_id;

    if (!orderId) {
      console.warn('No order_id found in PayPal capture custom_id');
      return;
    }

    // Update order status
    await OrderService.updateOrderStatus(orderId, 'failed', {
      paypal_capture_id: capture.id,
      failure_reason: capture.status_details?.reason
    });

    console.log(`PayPal payment denied for order ${orderId}`);
  }

  private async handleDispute(event: WebhookEvent): Promise<void> {
    const dispute = event.data.resource;
    const transactionId = dispute.disputed_transactions?.[0]?.seller_transaction_id;

    if (!transactionId) {
      console.warn('No transaction ID found in PayPal dispute');
      return;
    }

    // Find order by gateway transaction ID
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id')
      .eq('gateway_transaction_id', transactionId);

    if (error || !orders || orders.length === 0) {
      console.warn(`No order found for PayPal transaction ${transactionId}`);
      return;
    }

    // Update order status to indicate dispute
    await OrderService.updateOrderStatus(orders[0].id, 'failed', {
      dispute_id: dispute.dispute_id,
      dispute_reason: dispute.reason,
      dispute_status: dispute.status
    });

    console.log(`PayPal dispute created for order ${orders[0].id}`);
  }

  private async logPaymentEvent(event: WebhookEvent): Promise<void> {
    await supabase
      .from('payment_logs')
      .insert({
        provider: 'paypal',
        event_type: event.type,
        event_id: event.id,
        gateway_data: event.data,
        status: 'received',
        processed_at: new Date().toISOString()
      });
  }
}

/**
 * Factory function to get the appropriate webhook handler
 */
export function getWebhookHandler(provider: 'stripe' | 'paypal'): PaymentWebhookHandler {
  switch (provider) {
    case 'stripe':
      return new StripeWebhookHandler();
    case 'paypal':
      return new PayPalWebhookHandler();
    default:
      throw new Error(`Unsupported payment provider: ${provider}`);
  }
}

/**
 * Process a webhook event
 */
export async function processWebhook(provider: 'stripe' | 'paypal', eventData: any): Promise<void> {
  const handler = getWebhookHandler(provider);
  
  const event: WebhookEvent = {
    id: eventData.id,
    type: eventData.type,
    data: eventData,
    provider
  };

  await handler.handleWebhook(event);
}
