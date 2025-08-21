import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Package, 
  CreditCard, 
  Search, 
  Filter, 
  Eye, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Command,
  User,
  Calendar,
  DollarSign
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Order = Tables<'orders'>;
type OrderItem = Tables<'order_items'>;
type PaymentLog = Tables<'payment_logs'>;
type CommandLog = Tables<'command_execution_logs'>;
type StorePackage = Tables<'store_packages'>;

interface OrderWithDetails extends Order {
  order_items: (OrderItem & { store_packages: StorePackage })[];
  payment_logs: PaymentLog[];
  command_execution_logs: CommandLog[];
  user_profile?: {
    username: string;
    display_name: string;
  };
}

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter, dateFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      
      const { data: ordersData, error: ordersError } = await supabase
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
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch user profiles for orders
      const userIds = ordersData?.map(order => order.user_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, username, display_name')
        .in('user_id', userIds);

      if (profilesError) {
        console.warn('Failed to load user profiles:', profilesError);
      }

      const ordersWithProfiles = ordersData?.map(order => ({
        ...order,
        user_profile: profiles?.find(p => p.user_id === order.user_id)
      })) || [];

      setOrders(ordersWithProfiles);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.order_number.toLowerCase().includes(searchLower) ||
        order.billing_email?.toLowerCase().includes(searchLower) ||
        order.user_profile?.username?.toLowerCase().includes(searchLower) ||
        order.user_profile?.display_name?.toLowerCase().includes(searchLower) ||
        order.gateway_transaction_id?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        default:
          filterDate.setFullYear(1970);
      }

      filtered = filtered.filter(order => 
        new Date(order.created_at || '') >= filterDate
      );
    }

    setFilteredOrders(filtered);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus as any, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Order status updated successfully",
      });

      await loadOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const retryCommandExecution = async (commandLogId: string) => {
    try {
      const { error } = await supabase
        .from('command_execution_logs')
        .update({ 
          status: 'pending',
          attempts: 0,
          error_message: null,
          updated_at: new Date().toISOString() 
        })
        .eq('id', commandLogId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Command execution queued for retry",
      });

      await loadOrders();
    } catch (error) {
      console.error('Error retrying command:', error);
      toast({
        title: "Error",
        description: "Failed to retry command execution",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Failed</Badge>;
      case 'refunded':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Refunded</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getCommandStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading orders...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters and Search */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="search">Search Orders</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by order number, email, username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="w-full md:w-48">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-48">
              <Label htmlFor="date-filter">Date Range</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={loadOrders} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Order #</th>
                  <th className="text-left p-3 font-semibold">Customer</th>
                  <th className="text-left p-3 font-semibold">Amount</th>
                  <th className="text-left p-3 font-semibold">Status</th>
                  <th className="text-left p-3 font-semibold">Payment</th>
                  <th className="text-left p-3 font-semibold">Date</th>
                  <th className="text-left p-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-mono text-sm">{order.order_number}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium">
                            {order.user_profile?.display_name || order.user_profile?.username || 'Anonymous'}
                          </div>
                          <div className="text-sm text-gray-500">{order.billing_email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold">{formatCurrency(order.final_amount)}</div>
                      {order.total_amount !== order.final_amount && (
                        <div className="text-sm text-gray-500 line-through">
                          {formatCurrency(order.total_amount)}
                        </div>
                      )}
                    </td>
                    <td className="p-3">{getStatusBadge(order.status)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm">{order.payment_provider || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{order.payment_method || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div className="text-sm">{formatDate(order.created_at)}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderDetails(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredOrders.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No orders found matching your criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details - {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="payments">Payment Logs</TabsTrigger>
                <TabsTrigger value="commands">Commands</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Order Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Order Number:</span>
                        <span className="font-mono">{selectedOrder.order_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        {getStatusBadge(selectedOrder.status)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-semibold">{formatCurrency(selectedOrder.total_amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Final Amount:</span>
                        <span className="font-semibold">{formatCurrency(selectedOrder.final_amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span>{formatDate(selectedOrder.created_at)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Updated:</span>
                        <span>{formatDate(selectedOrder.updated_at)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Customer & Payment</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Customer:</span>
                        <span>{selectedOrder.user_profile?.display_name || selectedOrder.user_profile?.username || 'Anonymous'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span>{selectedOrder.billing_email || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payment Provider:</span>
                        <span>{selectedOrder.payment_provider || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payment Method:</span>
                        <span>{selectedOrder.payment_method || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Transaction ID:</span>
                        <span className="font-mono text-sm">{selectedOrder.gateway_transaction_id || 'N/A'}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Status Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <Select 
                        value={selectedOrder.status || 'pending'} 
                        onValueChange={(value) => updateOrderStatus(selectedOrder.id, value)}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                          <SelectItem value="refunded">Refunded</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-gray-600">Change order status</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="items" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Order Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedOrder.order_items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Package className="h-8 w-8 text-gray-400" />
                            <div>
                              <div className="font-semibold">{item.store_packages?.name || 'Unknown Package'}</div>
                              <div className="text-sm text-gray-600">
                                Quantity: {item.quantity} × {formatCurrency(item.unit_price)}
                              </div>
                            </div>
                          </div>
                          <div className="text-lg font-semibold">
                            {formatCurrency(item.total_price)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payments" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Payment Logs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedOrder.payment_logs.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No payment logs found.</div>
                      ) : (
                        selectedOrder.payment_logs.map((log) => (
                          <div key={log.id} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-semibold">{log.event_type}</div>
                              <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                                {log.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Provider:</span> {log.provider}
                              </div>
                              <div>
                                <span className="text-gray-600">Amount:</span> {log.amount ? formatCurrency(log.amount) : 'N/A'}
                              </div>
                              <div>
                                <span className="text-gray-600">Event ID:</span> {log.event_id || 'N/A'}
                              </div>
                              <div>
                                <span className="text-gray-600">Processed:</span> {formatDate(log.processed_at)}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="commands" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Command Execution Logs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedOrder.command_execution_logs.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No command logs found.</div>
                      ) : (
                        selectedOrder.command_execution_logs.map((log) => (
                          <div key={log.id} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {getCommandStatusIcon(log.status)}
                                <span className="font-semibold">{log.status}</span>
                              </div>
                              {log.status === 'failed' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => retryCommandExecution(log.id)}
                                >
                                  <RefreshCw className="h-4 w-4 mr-1" />
                                  Retry
                                </Button>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Command className="h-4 w-4 text-gray-400" />
                                <code className="bg-gray-100 px-2 py-1 rounded text-sm">{log.command}</code>
                              </div>
                              <div className="text-sm text-gray-600">
                                Username: {log.username} | Attempts: {log.attempts}/{log.max_attempts}
                              </div>
                              {log.error_message && (
                                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                  Error: {log.error_message}
                                </div>
                              )}
                              <div className="text-xs text-gray-500">
                                Created: {formatDate(log.created_at)} | 
                                Executed: {formatDate(log.executed_at)}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderManagement;
