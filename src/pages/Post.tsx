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

// Role color mapping based on the roles definition
const getRoleColor = (role: string) => {
  const roleColors: Record<string, string> = {
    'owner': '#ff0000',
    'system_admin': '#ff6600',
    'senior_admin': '#ffaa00',
    'admin': '#ffdd00',
    'senior_moderator': '#00aa00',
    'moderator': '#00dd00',
    'helper': '#0066ff',
    'developer': '#9900ff',
    'vip': '#ffff00',
    'member': '#6b7280'
  };
  return roleColors[role] || '#6b7280';
};

export default function Post() {
  const { id, threadId } = useParams<{ id?: string; threadId?: string }>();
  const location = useLocation();
  const [post, setPost] = useState<Tables<'home_messages'> | Tables<'forum_threads'> | null>(null);
  const [postAuthor, setPostAuthor] = useState<any>(null);
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
        
        // Load thread author information with roles
        const { data: authorData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', data.author_id)
          .single();
        
        // Get author roles
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.author_id);
        
        setPostAuthor({
          ...authorData,
          roles: rolesData?.map(r => r.role) || []
        });
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
        .select('*')
        .eq('thread_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Get user profiles and roles for each comment author
      const commentsWithProfiles = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', comment.author_id)
            .single();
          
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', comment.author_id);
          
          return {
            ...comment,
            user_profiles: profileData ? {
              ...profileData,
              roles: rolesData?.map(r => r.role) || []
            } : null
          };
        })
      );
      
      setComments(commentsWithProfiles);
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
      month: 'short',
      day: 'numeric'
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
          <CardContent className="p-0">
            {isThread && postAuthor ? (
              // Thread layout with user info on left and content on right
              <div className="flex">
                {/* User Info Sidebar */}
                <div className="w-64 bg-secondary/20 p-6 border-r">
                  <div className="text-center">
                    <Avatar className="h-20 w-20 mx-auto mb-4">
                      <AvatarImage src={postAuthor.avatar_url} />
                      <AvatarFallback className="text-lg">
                        {postAuthor.display_name?.charAt(0) || 
                         postAuthor.username?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <h3 className="font-semibold text-lg mb-2">
                      {postAuthor.display_name || postAuthor.username || 'Unknown User'}
                    </h3>
                    
                    {postAuthor.roles && postAuthor.roles.length > 0 && (
                      <div className="space-y-1 mb-4">
                        {postAuthor.roles.map((role: string) => (
                          <Badge 
                            key={role} 
                            className="text-xs border-none text-white font-semibold shadow-sm"
                            style={{ 
                              backgroundColor: getRoleColor(role),
                              color: role === 'vip' ? '#000' : '#fff'
                            }}
                          >
                            {role.replace('_', ' ').toUpperCase()}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <div className="text-sm text-muted-foreground space-y-2">
                      {postAuthor.minecraft_username && (
                        <div>
                          <strong>Minecraft:</strong> {postAuthor.minecraft_username}
                        </div>
                      )}
                      {postAuthor.location && (
                        <div>
                          <strong>Location:</strong> {postAuthor.location}
                        </div>
                      )}
                      <div>
                        <strong>Joined:</strong> {formatDate(postAuthor.join_date || postAuthor.created_at)}
                      </div>
                      {postAuthor.last_seen && (
                        <div>
                          <strong>Last seen:</strong> {formatDate(postAuthor.last_seen)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Thread Content */}
                <div className="flex-1 p-6">
                  <CardHeader className="px-0 pt-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Badge variant="outline">Forum Thread</Badge>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(threadPost.created_at)}
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {post.view_count} views
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        {threadPost.reply_count} replies
                      </div>
                    </div>

                    <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
                  </CardHeader>

                  <div 
                    className="prose prose-gray dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />
                </div>
              </div>
            ) : (
              // Home message layout
              <>
                <CardHeader className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline">News</Badge>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(homePost.published_at || homePost.created_at)}
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {post.view_count} views
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      {homePost.comment_count || 0} comments
                    </div>
                  </div>

                  <h1 className="text-3xl font-bold">{post.title}</h1>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>By {post.author_id}</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {homePost.image_url && (
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
              </>
            )}
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
                  comments.map((comment, index) => (
                    <Card key={comment.id} className="overflow-hidden">
                      {isThread ? (
                        // XenForo-style thread reply layout
                        <div className="flex">
                          {/* User Info Sidebar */}
                          <div className="w-48 bg-secondary/20 p-4 border-r flex-shrink-0">
                            <div className="text-center">
                              <Avatar className="h-16 w-16 mx-auto mb-3">
                                <AvatarImage src={comment.user_profiles?.avatar_url} />
                                <AvatarFallback className="text-lg">
                                  {comment.user_profiles?.display_name?.charAt(0) || 
                                   comment.user_profiles?.username?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              
                              <h4 className="font-semibold text-sm mb-2 text-primary">
                                {comment.user_profiles?.display_name || 
                                 comment.user_profiles?.username || 'User'}
                              </h4>
                              
                              {comment.user_profiles?.roles && comment.user_profiles.roles.length > 0 && (
                                <div className="mb-3 space-y-1">
                                  {comment.user_profiles.roles.map((role: string) => (
                                    <Badge 
                                      key={role} 
                                      className="text-xs block w-full border-none text-white font-semibold shadow-sm" 
                                      style={{ 
                                        backgroundColor: getRoleColor(role),
                                        color: role === 'vip' ? '#000' : '#fff'
                                      }}
                                    >
                                      {role.replace('_', ' ').toUpperCase()}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              
                              <div className="text-xs text-muted-foreground space-y-1 border-t pt-2">
                                {comment.user_profiles?.minecraft_username && (
                                  <div className="truncate">
                                    <span className="font-medium">MC:</span> {comment.user_profiles.minecraft_username}
                                  </div>
                                )}
                                <div>
                                  <span className="font-medium">Joined:</span> {comment.user_profiles?.join_date ? 
                                    new Date(comment.user_profiles.join_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 
                                    'Unknown'}
                                </div>
                                {comment.user_profiles?.last_seen && (
                                  <div>
                                    <span className="font-medium">Last seen:</span> {new Date(comment.user_profiles.last_seen).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Post Content */}
                          <div className="flex-1 p-4">
                            <div className="flex justify-between items-center mb-3 pb-2 border-b">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">#{index + 1}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(comment.created_at)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Post actions would go here */}
                                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                                  Quote
                                </Button>
                                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                                  Like
                                </Button>
                              </div>
                            </div>
                            
                            <div 
                              className="prose prose-sm max-w-none dark:prose-invert"
                              dangerouslySetInnerHTML={{ __html: comment.content }}
                            />
                            
                            {comment.is_edited && (
                              <div className="text-xs text-muted-foreground mt-3 pt-2 border-t">
                                Last edited: {formatDate(comment.edited_at || comment.updated_at)}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        // Home message comment layout
                        <div className="flex gap-3">
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
                      )}
                    </Card>
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
