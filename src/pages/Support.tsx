import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";

export default function Support() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    priority: "medium",
    message: ""
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const canonical = typeof window !== 'undefined' ? window.location.origin + '/support' : '';

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setUser(user);
    } catch (error) {
      console.error('Error checking auth:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      setSubmitting(true);
      
      const ticketNumber = `TICKET-${Date.now()}`;
      
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          ticket_number: ticketNumber,
          subject: ticketForm.subject,
          description: ticketForm.message,
          priority: ticketForm.priority as any,
          status: 'open'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your support ticket has been submitted. We'll get back to you soon!",
      });

      setTicketForm({ subject: "", priority: "medium", message: "" });
    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast({
        title: "Error",
        description: "Failed to submit ticket. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12">
        <Helmet>
          <title>Support | MythicPvP Help Center</title>
          <meta name="description" content="Get help with purchases or account issues. Contact MythicPvP support here." />
          <link rel="canonical" href={canonical} />
        </Helmet>
        <h1 className="font-brand text-4xl mb-8">Help & Support</h1>
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12">
      <Helmet>
        <title>Support | MythicPvP Help Center</title>
        <meta name="description" content="Get help with purchases or account issues. Contact MythicPvP support here." />
        <link rel="canonical" href={canonical} />
      </Helmet>
      <h1 className="font-brand text-4xl mb-8">Help & Support</h1>
      <Card className="max-w-2xl bg-secondary/40">
        <CardHeader>
          <CardTitle className="font-brand">Submit a Ticket</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitTicket} className="space-y-4">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Brief description of your issue"
                value={ticketForm.subject}
                onChange={(e) => setTicketForm({...ticketForm, subject: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={ticketForm.priority} 
                onValueChange={(value) => setTicketForm({...ticketForm, priority: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea 
                id="message" 
                placeholder="How can we help?"
                value={ticketForm.message}
                onChange={(e) => setTicketForm({...ticketForm, message: e.target.value})}
                required
                rows={6}
              />
            </div>
            <Button type="submit" variant="hero" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Ticket'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
