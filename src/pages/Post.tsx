import { useParams, Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Calendar, Eye, MessageSquare, User } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

export default function Post() {
  const { id, threadId } = useParams<{ id?: string; threadId?: string }>();
  const location = useLocation();
  const [post, setPost] = useState<Tables<'home_messages'> | Tables<'forum_threads'> | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [user, setUser] = useState<any>(null);

  const isThread = location.pathname.includes('/forums/thread/');
  const postId = threadId || id;

  useEffect(() => {
    if (postId) {
      loadPost();
      loadUser();
      incrementViewCount();
    }
  }, [postId, isThread]);

  const loadUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
  };

  const loadPost = async () => {
    try {
      setLoading(true);
      
      if (isThread) {
        // Load forum thread
        const { data, error } = await supabase
          .from('forum_threads')
          .select('*')
          .eq('id', postId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            setNotFound(true);
          } else {
            throw error;
          }
          return;
        }
        setPost(data);
        loadThreadComments();
      } else {
        // Load home message
        const { data, error } = await supabase
          .from('home_messages')
          .select('*')
          .eq('id', postId)
          .eq('is_published', true)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            setNotFound(true);
          } else {
            throw error;
          }
          return;
        }
        setPost(data);
        loadHomeComments();
      }
    } catch (error) {
      console.error('Error loading post:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const loadHomeComments = async () => {
    if (!postId) return;
    
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('home_message_comments')
        .select(`
          *,
          user_profiles (
            display_name,
            username,
            avatar_url
          )
        `)
        .eq('message_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const loadThreadComments = async () => {
    if (!postId) return;
    
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('forum_posts')
        .select(`
          *,
          user_profiles (
            display_name,
            username,
            avatar_url
          )
        `)
        .eq('thread_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error loading thread posts:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const createComment = async () => {
    if (!user || !postId || !newComment.trim()) return;

    try {
      if (isThread) {
        // Create forum post
        const { error } = await supabase
          .from('forum_posts')
          .insert([{
            thread_id: postId,
            author_id: user.id,
            content: newComment.trim()
          }]);

        if (error) throw error;
        
        // Update thread reply count
        const currentPost = post as Tables<'forum_threads'>;
        await supabase
          .from('forum_threads')
          .update({ 
            reply_count: currentPost.reply_count + 1,
            last_reply_at: new Date().toISOString(),
            last_reply_by: user.id
          })
          .eq('id', postId);
          
        loadThreadComments();
      } else {
        // Create home message comment
        const { error } = await supabase
          .from('home_message_comments')
          .insert([{
            message_id: postId,
            author_id: user.id,
            content: newComment.trim()
          }]);

        if (error) throw error;
        
        // Update home message comment count
        const currentPost = post as Tables<'home_messages'>;
        await supabase
          .from('home_messages')
          .update({ comment_count: (currentPost.comment_count || 0) + 1 })
          .eq('id', postId);
          
        loadHomeComments();
      }
      
      setNewComment('');
      loadPost(); // Refresh to get updated counts
    } catch (error) {
      console.error('Error creating comment:', error);
    }
  };

  const incrementViewCount = async () => {
    if (!postId) return;

    try {
      if (isThread) {
        await supabase
          .from('forum_threads')
          .update({ view_count: (post?.view_count || 0) + 1 })
          .eq('id', postId);
      } else {
        await supabase
          .from('home_messages')
          .update({ view_count: (post?.view_count || 0) + 1 })
          .eq('id', postId);
      }
    } catch (error) {
      console.error('Error updating view count:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Post Not Found</h1>
          <p className="text-muted-foreground mb-6">The post you're looking for doesn't exist or has been removed.</p>
          <Link to="/">
            <Button>Return Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const homePost = post as Tables<'home_messages'>;
  const threadPost = post as Tables<'forum_threads'>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to={isThread ? "/forums" : "/"}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {isThread ? "Forums" : "Home"}
          </Button>
        </Link>
      </div>

      <article className="max-w-4xl mx-auto">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{isThread ? 'Forum Thread' : 'News'}</Badge>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(isThread ? threadPost.created_at : (homePost.published_at || homePost.created_at))}
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {post.view_count} views
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                {isThread ? threadPost.reply_count : (homePost.comment_count || 0)} {isThread ? 'replies' : 'comments'}
              </div>
            </div>

            <h1 className="text-3xl font-bold">{post.title}</h1>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>By {post.author_id}</span>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {!isThread && homePost.image_url && (
              <img 
                src={homePost.image_url}
                alt={post.title}
                className="w-full rounded-lg"
                loading="lazy"
              />
            )}

            <div 
              className="prose prose-gray dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>{isThread ? 'Replies' : 'Comments'}</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingComments ? (
              <p className="text-muted-foreground text-center py-8">Loading {isThread ? 'replies' : 'comments'}...</p>
            ) : (
              <div className="space-y-6">
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar>
                        <AvatarImage src={comment.user_profiles?.avatar_url} />
                        <AvatarFallback>
                          {comment.user_profiles?.display_name?.charAt(0) || 
                           comment.user_profiles?.username?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <span className="font-semibold">
                            {comment.user_profiles?.display_name || 
                             comment.user_profiles?.username || 'User'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(comment.created_at)}
                          </span>
                        </div>
                        <div 
                          className="text-sm mt-1"
                          dangerouslySetInnerHTML={{ __html: comment.content }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No {isThread ? 'replies' : 'comments'} yet.
                  </p>
                )}

                {user && (!isThread || !threadPost.is_locked) && (
                  <div className="mt-6 pt-6 border-t">
                    <Textarea
                      placeholder={`Add a ${isThread ? 'reply' : 'comment'}...`}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="resize-none"
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <Button 
                        variant="secondary" 
                        onClick={createComment}
                        disabled={!newComment.trim()}
                      >
                        Post {isThread ? 'Reply' : 'Comment'}
                      </Button>
                    </div>
                  </div>
                )}

                {!user && (
                  <div className="mt-6 pt-6 border-t text-center">
                    <p className="text-muted-foreground">
                      <Link to="/login" className="text-primary hover:underline">
                        Log in
                      </Link> to {isThread ? 'reply to this thread' : 'leave a comment'}.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </article>
    </div>
  );
}
