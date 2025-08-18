import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  LifeBuoy, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  User,
  Send,
  Trash2
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

export default function SupportManagement() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("open");
  const [newMessage, setNewMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      loadTicketMessages(selectedTicket.id);
    }
  }, [selectedTicket]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get user profiles separately to avoid complex joins
      const ticketsWithProfiles = await Promise.all(
        (data || []).map(async (ticket) => {
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('username')
            .eq('user_id', ticket.user_id)
            .single();
            
          const { data: assignedProfile } = ticket.assigned_to ? await supabase
            .from('user_profiles')
            .select('username')
            .eq('user_id', ticket.assigned_to)
            .single() : { data: null };
            
          return {
            ...ticket,
            user_profile: userProfile,
            assigned_profile: assignedProfile
          };
        })
      );
      
      setTickets(ticketsWithProfiles);
      
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast({
        title: "Error",
        description: "Failed to load support tickets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTicketMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_ticket_messages')
        .select(`
          *,
          author_profile:user_profiles!author_id(username)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTicketMessages(data || []);
      
    } catch (error) {
      console.error('Error loading ticket messages:', error);
      toast({
        title: "Error",
        description: "Failed to load ticket messages",
        variant: "destructive",
      });
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const updateData: any = { status };
      
      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      } else if (status === 'closed') {
        updateData.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Ticket status updated to ${status}`,
      });

      loadTickets();
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({...selectedTicket, status, ...updateData});
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast({
        title: "Error",
        description: "Failed to update ticket status",
        variant: "destructive",
      });
    }
  };

  const assignTicket = async (ticketId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          assigned_to: userId,
          status: 'in_progress'
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Ticket assigned successfully",
      });

      loadTickets();
    } catch (error) {
      console.error('Error assigning ticket:', error);
      toast({
        title: "Error",
        description: "Failed to assign ticket",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    try {
      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          author_id: currentUser.data.user.id,
          message: newMessage,
          is_internal: isInternal
        });

      if (error) throw error;

      // Update ticket status to in_progress if it's open
      if (selectedTicket.status === 'open') {
        await updateTicketStatus(selectedTicket.id, 'in_progress');
      }

      toast({
        title: "Success",
        description: "Message sent successfully",
      });

      setNewMessage("");
      loadTicketMessages(selectedTicket.id);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const deleteTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
      return;
    }

    try {
      // First delete all messages associated with the ticket
      const { error: messagesError } = await supabase
        .from('support_ticket_messages')
        .delete()
        .eq('ticket_id', ticketId);

      if (messagesError) throw messagesError;

      // Then delete the ticket
      const { error: ticketError } = await supabase
        .from('support_tickets')
        .delete()
        .eq('id', ticketId);

      if (ticketError) throw ticketError;

      toast({
        title: "Success",
        description: "Ticket deleted successfully",
      });

      loadTickets();
      
      // Clear selected ticket if it was the deleted one
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(null);
        setTicketMessages([]);
      }
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast({
        title: "Error",
        description: "Failed to delete ticket",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-blue-500",
      in_progress: "bg-yellow-500",
      waiting_response: "bg-orange-500",
      resolved: "bg-green-500",
      closed: "bg-gray-500"
    };
    return colors[status] || "bg-gray-500";
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-green-500",
      medium: "bg-yellow-500",
      high: "bg-orange-500",
      urgent: "bg-red-500"
    };
    return colors[priority] || "bg-gray-500";
  };

  const filteredTickets = tickets.filter(ticket => {
    if (activeTab === 'open') return ['open', 'in_progress', 'waiting_response'].includes(ticket.status);
    if (activeTab === 'resolved') return ticket.status === 'resolved';
    if (activeTab === 'closed') return ticket.status === 'closed';
    return true;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">Loading support tickets...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LifeBuoy className="h-5 w-5" />
            Support Management
          </CardTitle>
          <CardDescription>
            Manage support tickets and customer assistance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tickets List */}
            <div className="lg:col-span-2">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="open">Open</TabsTrigger>
                  <TabsTrigger value="resolved">Resolved</TabsTrigger>
                  <TabsTrigger value="closed">Closed</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="space-y-4">
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ticket</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Assigned</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTickets.map((ticket) => (
                          <TableRow 
                            key={ticket.id}
                            className={`cursor-pointer hover:bg-muted ${selectedTicket?.id === ticket.id ? 'bg-muted' : ''}`}
                            onClick={() => setSelectedTicket(ticket)}
                          >
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium text-sm">{ticket.ticket_number}</div>
                                <div className="text-sm text-muted-foreground line-clamp-2">
                                  {ticket.subject}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {ticket.user_profile?.username || 
                               "Unknown User"}
                            </TableCell>
                            <TableCell>
                              <Badge className={getPriorityColor(ticket.priority)}>
                                {ticket.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(ticket.status)}>
                                {ticket.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {ticket.assigned_profile?.username || 
                               "Unassigned"}
                            </TableCell>
                            <TableCell>
                              {new Date(ticket.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Ticket Detail */}
            <div className="lg:col-span-1">
              {selectedTicket ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {selectedTicket.ticket_number}
                    </CardTitle>
                    <CardDescription>
                      {selectedTicket.subject}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Ticket Info */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Status:</span>
                        <Select 
                          value={selectedTicket.status} 
                          onValueChange={(value) => updateTicketStatus(selectedTicket.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="waiting_response">Waiting Response</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Priority:</span>
                        <Badge className={getPriorityColor(selectedTicket.priority)}>
                          {selectedTicket.priority}
                        </Badge>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Category:</span>
                        <span className="text-sm">{selectedTicket.category || "General"}</span>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-sm font-medium">Actions:</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteTicket(selectedTicket.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Ticket
                        </Button>
                      </div>
                    </div>

                    {/* Original Description */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Description:</h4>
                      <div className="text-sm bg-muted p-3 rounded">
                        {selectedTicket.description}
                      </div>
                    </div>

                    {/* Messages */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Messages:</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {ticketMessages.map((message) => (
                          <div 
                            key={message.id}
                            className={`p-2 rounded text-sm ${
                              message.is_internal 
                                ? 'bg-yellow-50 border border-yellow-200' 
                                : 'bg-muted'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium text-xs">
                                {message.author_profile?.username || 
                                 "Unknown"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(message.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p>{message.message}</p>
                            {message.is_internal && (
                              <div className="text-xs text-yellow-600 mt-1">Internal Note</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Reply Form */}
                    <div className="space-y-2">
                      <Label htmlFor="newMessage">Reply:</Label>
                      <Textarea
                        id="newMessage"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your response..."
                        rows={3}
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="isInternal"
                            checked={isInternal}
                            onChange={(e) => setIsInternal(e.target.checked)}
                          />
                          <Label htmlFor="isInternal" className="text-sm">
                            Internal note
                          </Label>
                        </div>
                        <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                          <Send className="h-4 w-4 mr-2" />
                          Send
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center text-muted-foreground">
                      Select a ticket to view details
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
