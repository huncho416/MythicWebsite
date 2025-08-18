import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Plus, Pencil, Trash2, MessageSquare, Eye, EyeOff, Calendar } from "lucide-react";

export default function HomeMessageManagement() {
  const [messages, setMessages] = useState<Tables<'home_messages'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Tables<'home_messages'> | null>(null);
  const [messageForm, setMessageForm] = useState({
    title: "",
    content: "",
    image_url: "",
    is_published: false,
    allow_comments: true
  });

  const { toast } = useToast();

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('home_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const messageData = {
        title: messageForm.title,
        content: messageForm.content,
        image_url: messageForm.image_url || null,
        is_published: messageForm.is_published,
        allow_comments: messageForm.allow_comments,
        published_at: messageForm.is_published ? new Date().toISOString() : null
      };

      if (editingMessage) {
        const { error } = await supabase
          .from('home_messages')
          .update(messageData)
          .eq('id', editingMessage.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Message updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('home_messages')
          .insert([{ ...messageData, author_id: (await supabase.auth.getUser()).data.user?.id }]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Message created successfully"
        });
      }

      setDialogOpen(false);
      resetForm();
      loadMessages();
    } catch (error) {
      console.error('Error saving message:', error);
      toast({
        title: "Error",
        description: "Failed to save message",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (message: Tables<'home_messages'>) => {
    setEditingMessage(message);
    setMessageForm({
      title: message.title,
      content: message.content,
      image_url: message.image_url || "",
      is_published: message.is_published,
      allow_comments: message.allow_comments
    });
    setDialogOpen(true);
  };

  const handleDelete = async (message: Tables<'home_messages'>) => {
    if (!confirm(`Are you sure you want to delete "${message.title}"?`)) return;

    try {
      const { error } = await supabase
        .from('home_messages')
        .delete()
        .eq('id', message.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Message deleted successfully"
      });
      loadMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive"
      });
    }
  };

  const togglePublished = async (message: Tables<'home_messages'>) => {
    try {
      const { error } = await supabase
        .from('home_messages')
        .update({ 
          is_published: !message.is_published,
          published_at: !message.is_published ? new Date().toISOString() : null
        })
        .eq('id', message.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Message ${!message.is_published ? 'published' : 'unpublished'} successfully`
      });
      loadMessages();
    } catch (error) {
      console.error('Error toggling published status:', error);
      toast({
        title: "Error",
        description: "Failed to update message status",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setEditingMessage(null);
    setMessageForm({
      title: "",
      content: "",
      image_url: "",
      is_published: false,
      allow_comments: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Home Page Messages
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Message
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMessage ? 'Edit Message' : 'Create New Message'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={messageForm.title}
                  onChange={(e) => setMessageForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={messageForm.content}
                  onChange={(e) => setMessageForm(prev => ({ ...prev, content: e.target.value }))}
                  required
                  rows={6}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL (optional)</Label>
                <Input
                  id="image_url"
                  value={messageForm.image_url}
                  onChange={(e) => setMessageForm(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_published"
                    checked={messageForm.is_published}
                    onCheckedChange={(checked) => setMessageForm(prev => ({ ...prev, is_published: !!checked }))}
                  />
                  <Label htmlFor="is_published">Published</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allow_comments"
                    checked={messageForm.allow_comments}
                    onCheckedChange={(checked) => setMessageForm(prev => ({ ...prev, allow_comments: !!checked }))}
                  />
                  <Label htmlFor="allow_comments">Allow Comments</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingMessage ? 'Update Message' : 'Create Message'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-muted-foreground">No messages found. Create your first message!</p>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{message.title}</h3>
                      <Badge variant={message.is_published ? "default" : "secondary"}>
                        {message.is_published ? "Published" : "Draft"}
                      </Badge>
                      {message.allow_comments && (
                        <Badge variant="outline">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Comments Enabled
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {message.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Created: {formatDate(message.created_at)}
                      </span>
                      {message.published_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Published: {formatDate(message.published_at)}
                        </span>
                      )}
                      <span>Views: {message.view_count}</span>
                      <span>Comments: {message.comment_count}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => togglePublished(message)}
                      title={message.is_published ? "Unpublish" : "Publish"}
                    >
                      {message.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(message)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(message)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {message.image_url && (
                  <div className="mt-3">
                    <img 
                      src={message.image_url} 
                      alt={message.title}
                      className="w-full h-32 object-cover rounded-md"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
