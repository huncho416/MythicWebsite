import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { MessageSquare, Lock, Plus, ArrowLeft, Pin, Eye, Calendar, User, Settings, AlertTriangle } from "lucide-react";
import { User as AuthUser } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

interface ForumThread extends Tables<'forum_threads'> {
  author: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export default function ForumCategory() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [category, setCategory] = useState<Tables<'forum_categories'> | null>(null);
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedThread, setSelectedThread] = useState<ForumThread | null>(null);
  const [threadForm, setThreadForm] = useState({
    title: "",
    content: ""
  });
  
  const { toast } = useToast();
  const canonical = typeof window !== 'undefined' ? window.location.origin + `/forums/category/${categoryId}` : '';

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (categoryId) {
      loadCategory();
      loadThreads();
    }
  }, [categoryId]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setUser(user);
      
      // Check if user has admin roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const hasAdminAccess = roles?.some(r => 
        ['admin', 'senior_admin', 'system_admin', 'owner', 'moderator', 'senior_moderator'].includes(r.role)
      );
      setIsAdmin(!!hasAdminAccess);
    } catch (error) {
      console.error('Error checking auth:', error);
      navigate('/login');
    }
  };

  const loadCategory = async () => {
    if (!categoryId) return;

    try {
      const { data, error } = await supabase
        .from('forum_categories')
        .select('*')
        .eq('id', categoryId)
        .single();

      if (error) throw error;
      setCategory(data);
    } catch (error) {
      console.error('Error loading category:', error);
      navigate('/forums');
    }
  };

  const loadThreads = async () => {
    if (!categoryId) return;

    try {
      const { data, error } = await supabase
        .from('forum_threads')
        .select('*')
        .eq('category_id', categoryId)
        .order('is_pinned', { ascending: false });

      if (error) throw error;
      
      // Get author information for each thread
      const threadsWithAuthors = await Promise.all(
        (data || []).map(async (thread) => {
          const { data: authorData } = await supabase
            .from('user_profiles')
            .select('display_name, username, avatar_url')
            .eq('user_id', thread.author_id)
            .single();

          return {
            ...thread,
            author: authorData ? {
              id: thread.author_id,
              display_name: authorData.display_name,
              username: authorData.username,
              avatar_url: authorData.avatar_url
            } : null
          };
        })
      );

      setThreads(threadsWithAuthors);
    } catch (error) {
      console.error('Error loading threads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !categoryId) return;

    try {
      const { error } = await supabase
        .from('forum_threads')
        .insert([{
          title: threadForm.title,
          content: threadForm.content,
          category_id: categoryId,
          author_id: user.id
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Thread created successfully"
      });

      setDialogOpen(false);
      setThreadForm({ title: "", content: "" });
      loadThreads();
    } catch (error) {
      console.error('Error creating thread:', error);
      toast({
        title: "Error",
        description: "Failed to create thread",
        variant: "destructive"
      });
    }
  };

  const handleEditThread = (thread: ForumThread, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedThread(thread);
    setEditDialogOpen(true);
  };

  const updateThreadTags = async (threadId: string, updates: Partial<Tables<'forum_threads'>>) => {
    try {
      const { error } = await supabase
        .from('forum_threads')
        .update(updates)
        .eq('id', threadId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Thread updated successfully"
      });

      loadThreads();
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating thread:', error);
      toast({
        title: "Error",
        description: "Failed to update thread",
        variant: "destructive"
      });
    }
  };

  const toggleThreadPin = (threadId: string, isPinned: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    updateThreadTags(threadId, { is_pinned: !isPinned });
  };

  const toggleThreadLock = (threadId: string, isLocked: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    updateThreadTags(threadId, { is_locked: !isLocked });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    
    return formatDate(dateString);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12">
        <div className="flex items-center justify-center">
          <div className="text-lg">Loading forum category...</div>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="container mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle>Category Not Found</CardTitle>
            <CardDescription>The forum category you're looking for doesn't exist.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/forums')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Forums
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12">
      <Helmet>
        <title>{category.name} | MythicPvP Forums</title>
        <meta name="description" content={category.description || `Discuss topics in ${category.name}`} />
        <link rel="canonical" href={canonical} />
      </Helmet>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/forums')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Forums
          </Button>
          <div>
            <h1 className="font-brand text-4xl flex items-center gap-3">
              <span style={{ color: category.color }} className="text-3xl">
                {category.icon}
              </span>
              {category.name}
            </h1>
            {category.description && (
              <p className="text-muted-foreground mt-2">{category.description}</p>
            )}
          </div>
        </div>

        {!category.is_locked && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Thread
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Thread</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateThread} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Thread Title</Label>
                  <Input
                    id="title"
                    value={threadForm.title}
                    onChange={(e) => setThreadForm(prev => ({ ...prev, title: e.target.value }))}
                    required
                    placeholder="Enter a descriptive title for your thread"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={threadForm.content}
                    onChange={(e) => setThreadForm(prev => ({ ...prev, content: e.target.value }))}
                    required
                    rows={8}
                    placeholder="Write your message here..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Thread</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-4">
        {threads.length === 0 ? (
          <Card className="bg-secondary/20 border-dashed">
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No threads yet</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to start a discussion in this category!
              </p>
              {!category.is_locked && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Thread
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {threads.map((thread) => (
              <Card 
                key={thread.id} 
                className="bg-secondary/40 hover:bg-secondary/60 transition-colors"
              >
                <div 
                  className="cursor-pointer p-4"
                  onClick={() => navigate(`/forums/thread/${thread.id}`)}
                >
                  <div className="flex items-start gap-4">
                    {/* Thread Status Icons */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-1 mt-1">
                      {thread.is_pinned && (
                        <Pin className="h-4 w-4 text-yellow-500" />
                      )}
                      {thread.is_locked ? (
                        <Lock className="h-4 w-4 text-red-500" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    
                    {/* Thread Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold hover:text-accent transition-colors mb-1">
                            {thread.title}
                          </h3>
                          
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {thread.content}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              {thread.author?.avatar_url ? (
                                <Avatar className="h-4 w-4">
                                  <AvatarImage src={thread.author.avatar_url} />
                                  <AvatarFallback>
                                    {(thread.author.display_name || thread.author.username || 'U')[0]}
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <User className="h-3 w-3" />
                              )}
                              <span className="hover:text-primary hover:underline cursor-pointer">
                                {thread.author?.display_name || thread.author?.username || 'Unknown'}
                              </span>
                            </div>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(thread.created_at)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Thread Stats */}
                        <div className="flex-shrink-0 text-center min-w-[80px] ml-4">
                          <div className="text-lg font-semibold text-primary">
                            {thread.reply_count}
                          </div>
                          <div className="text-xs text-muted-foreground">replies</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {thread.view_count} views
                          </div>
                        </div>
                        
                        {/* Last Activity */}
                        <div className="flex-shrink-0 text-right min-w-[150px] ml-4">
                          {thread.last_reply_at ? (
                            <div className="text-sm">
                              <div className="text-xs text-muted-foreground">
                                {formatTimeAgo(thread.last_reply_at)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Last reply
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              No replies yet
                            </div>
                          )}
                        </div>
                        
                        {/* Admin Controls */}
                        {isAdmin && (
                          <div className="flex items-center gap-1 ml-4">
                            <Button
                              size="sm"
                              variant={thread.is_pinned ? "default" : "outline"}
                              onClick={(e) => toggleThreadPin(thread.id, thread.is_pinned, e)}
                              className="h-8 px-2"
                            >
                              <Pin className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant={thread.is_locked ? "destructive" : "outline"}
                              onClick={(e) => toggleThreadLock(thread.id, thread.is_locked, e)}
                              className="h-8 px-2"
                            >
                              <Lock className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => handleEditThread(thread, e)}
                              className="h-8 px-2"
                            >
                              <Settings className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Thread Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Thread Settings</DialogTitle>
          </DialogHeader>
          {selectedThread && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">{selectedThread.title}</h3>
                <p className="text-sm text-muted-foreground">{selectedThread.content}</p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="pinned"
                    checked={selectedThread.is_pinned}
                    onCheckedChange={(checked) => updateThreadTags(selectedThread.id, { is_pinned: checked as boolean })}
                  />
                  <Label htmlFor="pinned" className="flex items-center gap-2">
                    <Pin className="h-4 w-4" />
                    Sticky/Pinned
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="locked"
                    checked={selectedThread.is_locked}
                    onCheckedChange={(checked) => updateThreadTags(selectedThread.id, { is_locked: checked as boolean })}
                  />
                  <Label htmlFor="locked" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Locked
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="important"
                    checked={(selectedThread as any).is_important}
                    onCheckedChange={(checked) => updateThreadTags(selectedThread.id, { is_important: checked as boolean } as any)}
                  />
                  <Label htmlFor="important" className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Important
                  </Label>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
