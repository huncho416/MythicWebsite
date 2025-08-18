import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import Hero from "@/components/sections/Hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [homeMessages, setHomeMessages] = useState<any[]>([]);
  const [comments, setComments] = useState<{ [messageId: string]: any[] }>({});
  const [newComments, setNewComments] = useState<{ [messageId: string]: string }>({});
  const [showComments, setShowComments] = useState<{ [messageId: string]: boolean }>({});
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    loadHomeMessages();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHomeMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('home_messages')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHomeMessages(data || []);
    } catch (error) {
      console.error('Error loading home messages:', error);
    }
  };

  const loadComments = async (messageId: string) => {
    try {
      const { data, error } = await supabase
        .from('home_message_comments')
        .select(`
          *,
          user_profiles!home_message_comments_author_id_fkey (
            display_name,
            username,
            avatar_url
          )
        `)
        .eq('message_id', messageId)
        .eq('is_approved', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      setComments(prev => ({ ...prev, [messageId]: data || [] }));
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const createComment = async (messageId: string) => {
    if (!user || !newComments[messageId]?.trim()) return;

    try {
      const { error } = await supabase
        .from('home_message_comments')
        .insert({
          message_id: messageId,
          author_id: user.id,
          content: newComments[messageId].trim(),
          is_approved: true // Auto-approve for now, can be changed later
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Comment posted successfully",
      });

      setNewComments(prev => ({ ...prev, [messageId]: '' }));
      loadComments(messageId);
    } catch (error) {
      console.error('Error creating comment:', error);
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive",
      });
    }
  };

  const toggleComments = (messageId: string) => {
    setShowComments(prev => ({ ...prev, [messageId]: !prev[messageId] }));
    if (!comments[messageId] && !showComments[messageId]) {
      loadComments(messageId);
    }
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

  const canonical = typeof window !== 'undefined' ? window.location.origin + '/' : 'https://mythicpvp.app/';
  return (
    <div>
      <Helmet>
        <title>MythicPvP | Minecraft Server and Store</title>
        <meta name="description" content="Play on MythicPvP, shop ranks, and join our Discord. Featured products and top donors." />
        <link rel="canonical" href={canonical} />
      </Helmet>
      <Hero />

      {/* Login banner + Store CTA */}
      <section className="container mx-auto py-6">
        <div className="grid gap-6 md:grid-cols-[3fr_1fr]">
          {!loading && !user && (
            <Card className="bg-secondary/40">
              <CardContent className="flex items-center justify-between gap-6 p-6">
                <div className="flex items-center gap-4">
                  <img
                    src="/logo.png"
                    alt="MythicPvP logo"
                    className="h-14 w-14 rounded-md"
                    loading="lazy"
                  />
                  <div>
                    <h3 className="font-brand text-xl">MythicPvP</h3>
                    <p className="text-sm text-muted-foreground">To join our community, please login or register.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button asChild variant="secondary"><Link to="/login">Login</Link></Button>
                  <Button asChild variant="neon"><Link to="/login">Register</Link></Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && user && (
            <Card className="bg-secondary/40">
              <CardContent className="flex items-center justify-between gap-6 p-6">
                <div className="flex items-center gap-4">
                  <img
                    src="/logo.png"
                    alt="MythicPvP logo"
                    className="h-14 w-14 rounded-md"
                    loading="lazy"
                  />
                  <div>
                    <h3 className="font-brand text-xl">Welcome back!</h3>
                    <p className="text-sm text-muted-foreground">You're logged in as {user.email}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button asChild variant="secondary"><Link to="/forums">Forums</Link></Button>
                  <Button asChild variant="neon"><Link to="/support">Support</Link></Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Link to="/store" className="block">
            <Card className="bg-accent/20 hover:shadow-glow transition-shadow">
              <CardContent className="p-6 h-full flex flex-col justify-center">
                <span className="uppercase tracking-widest text-sm text-muted-foreground">Store</span>
                <h3 className="font-brand text-2xl mt-1">Start Shopping!</h3>
                <span className="sr-only">Go to store</span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      {/* Content + Sidebar */}
      <section className="container mx-auto pb-16">
        <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
          {/* Left: News */}
          <div className="space-y-6">
            {homeMessages.length > 0 ? (
              homeMessages.map((message) => (
                <Card key={message.id} className="overflow-hidden">
                  {message.image_url && (
                    <img 
                      src={message.image_url} 
                      alt={message.title} 
                      className="w-full h-56 object-cover" 
                      loading="lazy" 
                    />
                  )}
                  <div className="p-6">
                    <h3 className="text-2xl font-semibold text-accent">{message.title}</h3>
                    <p className="text-muted-foreground mt-2">{message.content}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {message.published_at && formatDate(message.published_at)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {message.view_count} views
                        </span>
                        {message.allow_comments && (
                          <span className="text-sm text-muted-foreground">
                            • {message.comment_count} comments
                          </span>
                        )}
                        <Link to={`/post/${message.id}`}>
                          <Button variant="secondary">Read More</Button>
                        </Link>
                      </div>
                    </div>

                    {/* Comments Section */}
                    {message.allow_comments && (
                      <div className="mt-4">
                        <Button variant="link" onClick={() => toggleComments(message.id)} className="p-0 text-sm">
                          {showComments[message.id] ? 'Hide Comments' : 'View Comments'}
                        </Button>

                        {showComments[message.id] && (
                          <div className="mt-2 space-y-4">
                            {/* Existing Comments */}
                            {comments[message.id]?.length > 0 ? (
                              comments[message.id].map(comment => (
                                <div key={comment.id} className="flex gap-3">
                                  <Avatar>
                                    <AvatarImage src={comment.user_profiles.avatar_url} alt={comment.user_profiles.display_name} />
                                    <AvatarFallback>{comment.user_profiles.display_name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="flex justify-between">
                                      <span className="font-semibold">{comment.user_profiles.display_name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {formatDate(comment.created_at)}
                                      </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{comment.content}</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">No comments yet.</p>
                            )}

                            {/* New Comment Form */}
                            <div className="mt-4">
                              <Textarea
                                placeholder="Add a comment..."
                                value={newComments[message.id] || ''}
                                onChange={(e) => setNewComments(prev => ({ ...prev, [message.id]: e.target.value }))}
                                className="resize-none"
                              />
                              <div className="flex justify-end gap-2 mt-2">
                                <Button variant="secondary" onClick={() => createComment(message.id)}>Post Comment</Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ))
            ) : (
              <>
                <Card className="overflow-hidden">
                  <img src="/banner.png" alt="MythicPvP update banner" className="w-full h-56 object-cover" loading="lazy" />
                  <div className="p-6">
                    <h3 className="text-2xl font-semibold text-accent">What is Lorem Ipsum?</h3>
                    <p className="text-muted-foreground mt-2">The standard Lorem Ipsum passage, used since the 1500s... Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">demo • Jun 18, 2025 3:15 PM</div>
                      <Button variant="secondary">Read More</Button>
                    </div>
                  </div>
                </Card>
                <Card className="overflow-hidden">
                  <img src="/banner.png" alt="MythicPvP news banner" className="w-full h-56 object-cover" loading="lazy" />
                  <div className="p-6">
                    <h3 className="text-2xl font-semibold text-accent">What is Lorem Ipsum?</h3>
                    <p className="text-muted-foreground mt-2">The standard Lorem Ipsum passage, used since the 1500s... Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">demo • Jun 18, 2025 3:15 PM</div>
                      <Button variant="secondary">Read More</Button>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-accent/30 to-primary/30 border-0">
              <CardHeader>
                <CardTitle className="font-brand">Featured Product</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">VIP</span>
                  <span className="text-sm text-muted-foreground">9.99 USD</span>
                </div>
                <Button asChild variant="hero" className="w-full"><Link to="/store">Buy Now</Link></Button>
              </CardContent>
            </Card>

            <Card className="bg-secondary/40">
              <CardHeader>
                <CardTitle className="font-brand">Top Donors</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center justify-between"><span>#1 DragonSlayer_88</span><span>250.00 USD</span></li>
                  <li className="flex items-center justify-between"><span>#2 LeaderOS</span><span>100.00 USD</span></li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-secondary/40">
              <CardHeader>
                <CardTitle className="font-brand">Recent Purchases</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center justify-between"><span>LeaderOS</span><span>VIP+</span></li>
                  <li className="flex items-center justify-between"><span>demo</span><span>MVIP</span></li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-secondary/40">
              <CardHeader>
                <CardTitle className="font-brand">Discord</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">864 Members Online</p>
                <Button asChild variant="neon"><a href="https://discord.com/invite/mythicpvp" target="_blank" rel="noreferrer">Join</a></Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
