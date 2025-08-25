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
import { getMinecraftPlayerHead } from "@/lib/minecraft-utils";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [homeMessages, setHomeMessages] = useState<any[]>([]);
  const [comments, setComments] = useState<{ [messageId: string]: any[] }>({});
  const [newComments, setNewComments] = useState<{ [messageId: string]: string }>({});
  const [showComments, setShowComments] = useState<{ [messageId: string]: boolean }>({});
  const [topDonors, setTopDonors] = useState<any[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<any[]>([]);
  const [featuredProduct, setFeaturedProduct] = useState({
    name: "VIP",
    price: "9.99",
    image: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    loadHomeMessages();
    loadFeaturedProduct();
    loadTopDonors();
    loadRecentPurchases();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Fetch user profile to get username
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('username')
          .eq('user_id', user.id)
          .single();
        
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFeaturedProduct = async () => {
    try {
      // First get the featured package ID from settings
      const { data: packageIdSetting, error: packageIdError } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'featured_package_id')
        .maybeSingle();

      if (packageIdError) {
        console.error('Error loading featured package ID:', packageIdError);
        // Fall back to old settings-based approach
      } else if (packageIdSetting) {
        let packageId;
        try {
          const valueStr = String(packageIdSetting?.value || '');
          packageId = valueStr ? JSON.parse(valueStr) : null;
        } catch {
          packageId = String(packageIdSetting?.value || '');
        }

        if (packageId) {
          // Load the actual package data
          const { data: packageData, error: packageError } = await supabase
            .from('store_packages')
            .select('name, price, image_url')
            .eq('id', packageId)
            .single();

          if (packageError) {
            console.error('Error loading featured package:', packageError);
          } else if (packageData) {
            setFeaturedProduct({
              name: packageData.name,
              price: packageData.price.toString(),
              image: packageData.image_url || ""
            });
            return;
          }
        }
      }

      // Fallback to old settings-based approach
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['featured_product_name', 'featured_product_price', 'featured_product_image']);

      if (error) throw error;

      const settings = data?.reduce((acc, setting) => {
        try {
          acc[setting.key] = typeof setting.value === 'string' 
            ? JSON.parse(setting.value) 
            : setting.value;
        } catch {
          acc[setting.key] = setting.value;
        }
        return acc;
      }, {} as any) || {};

      setFeaturedProduct({
        name: settings.featured_product_name || "VIP",
        price: settings.featured_product_price || "9.99",
        image: settings.featured_product_image || ""
      });
    } catch (error) {
      console.error('Error loading featured product:', error);
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
      const { data: comments, error } = await supabase
        .from('home_message_comments')
        .select('*')
        .eq('message_id', messageId)
        .eq('is_approved', true)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get user profiles for comments
      if (comments && comments.length > 0) {
        const userIds = comments.map(comment => comment.author_id);
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, display_name, username, avatar_url')
          .in('user_id', userIds);

        // Combine comments with profile data
        const commentsWithProfiles = comments.map(comment => ({
          ...comment,
          user_profiles: profiles?.find(p => p.user_id === comment.author_id)
        }));

        setComments(prev => ({ ...prev, [messageId]: commentsWithProfiles }));
      } else {
        setComments(prev => ({ ...prev, [messageId]: [] }));
      }
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

  const loadTopDonors = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('user_id, final_amount')
        .eq('status', 'completed')
        .order('final_amount', { ascending: false })
        .limit(50); // Get more to account for grouping

      if (error) throw error;

      // Group by user and sum their total spending
      const userTotals = (data || []).reduce((acc: any, order: any) => {
        const userId = order.user_id;
        
        if (!acc[userId]) {
          acc[userId] = {
            userId,
            total: 0
          };
        }
        acc[userId].total += parseFloat(order.final_amount);
        return acc;
      }, {});

      // Convert to array and sort by total spending
      const topDonorsList = Object.values(userTotals)
        .sort((a: any, b: any) => b.total - a.total)
        .slice(0, 5);

      // Get usernames for top donors
      const userIds = topDonorsList.map((donor: any) => donor.userId);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, username, minecraft_username')
          .in('user_id', userIds);

        // Add usernames to the donor data
        const topDonorsWithNames = topDonorsList.map((donor: any) => {
          const profile = profiles?.find(p => p.user_id === donor.userId);
          return {
            username: profile?.username || 'Unknown User',
            minecraftUsername: profile?.minecraft_username || null,
            total: donor.total
          };
        });

        setTopDonors(topDonorsWithNames);
      } else {
        setTopDonors([]);
      }
    } catch (error) {
      console.error('Error loading top donors:', error);
    }
  };

  const loadRecentPurchases = async () => {
    try {
      // First get recent orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, created_at, user_id')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10);

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        setRecentPurchases([]);
        return;
      }

      // Get user profiles for these orders
      const userIds = orders.map(order => order.user_id);
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, username, minecraft_username')
        .in('user_id', userIds);

      // Get order items and packages for these orders
      const orderIds = orders.map(order => order.id);
      const { data: orderItems } = await supabase
        .from('order_items')
        .select(`
          order_id,
          store_packages(name)
        `)
        .in('order_id', orderIds);

      // Format the recent purchases
      const purchases = orders.map((order: any) => {
        const profile = profiles?.find(p => p.user_id === order.user_id);
        const orderItem = orderItems?.find(item => item.order_id === order.id);
        
        return {
          username: profile?.username || 'Unknown User',
          minecraftUsername: profile?.minecraft_username || null,
          package: orderItem?.store_packages?.name || 'Unknown Package',
          date: order.created_at
        };
      });

      setRecentPurchases(purchases.slice(0, 5));
    } catch (error) {
      console.error('Error loading recent purchases:', error);
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
        <meta name="description" content="Play on MythicPvP and shop ranks. Featured products and top donors." />
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
                    src="/logo.jpg"
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
                    src="/logo.jpg"
                    alt="MythicPvP logo"
                    className="h-14 w-14 rounded-md"
                    loading="lazy"
                  />
                  <div>
                    <h3 className="font-brand text-xl">Welcome back!</h3>
                    <p className="text-sm text-muted-foreground">You're logged in as {userProfile?.username || user.email}</p>
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
                                <div key={comment.id} className="border rounded-lg p-4 bg-card">
                                  <div className="flex gap-3">
                                    <Avatar>
                                      <AvatarImage src={comment.user_profiles?.avatar_url} />
                                      <AvatarFallback>
                                        {comment.user_profiles?.display_name?.charAt(0) || 
                                         comment.user_profiles?.username?.charAt(0) || 'U'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold">
                                            {comment.user_profiles?.display_name || 
                                             comment.user_profiles?.username || 'User'}
                                          </span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                          {formatDate(comment.created_at)}
                                        </span>
                                      </div>
                                      
                                      <div className="prose prose-sm max-w-none dark:prose-invert">
                                        <p>{comment.content}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">No comments yet.</p>
                            )}

                            {/* New Comment Form */}
                            {user && (
                              <div className="mt-4 p-4 border rounded-lg bg-card">
                                <Textarea
                                  placeholder="Add a comment..."
                                  value={newComments[message.id] || ''}
                                  onChange={(e) => setNewComments(prev => ({ ...prev, [message.id]: e.target.value }))}
                                  className="resize-none min-h-[80px]"
                                />
                                <div className="flex justify-end gap-2 mt-3">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setNewComments(prev => ({ ...prev, [message.id]: '' }))}
                                  >
                                    Cancel
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    onClick={() => createComment(message.id)}
                                    disabled={!newComments[message.id]?.trim()}
                                  >
                                    Post Comment
                                  </Button>
                                </div>
                              </div>
                            )}
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
                  <img src="/banner.jpg" alt="MythicPvP update banner" className="w-full h-56 object-cover" loading="lazy" />
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
                  <img src="/banner.jpg" alt="MythicPvP news banner" className="w-full h-56 object-cover" loading="lazy" />
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
                {featuredProduct.image && (
                  <div className="w-full h-32 rounded-md overflow-hidden">
                    <img 
                      src={featuredProduct.image} 
                      alt={featuredProduct.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{featuredProduct.name}</span>
                  <span className="text-sm text-muted-foreground">{featuredProduct.price} USD</span>
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
                  {topDonors.length > 0 ? (
                    topDonors.map((donor: any, index: number) => (
                      <li key={index} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage 
                            src={getMinecraftPlayerHead(donor.minecraftUsername || donor.username, 32)} 
                            alt={`${donor.username}'s Minecraft head`}
                          />
                          <AvatarFallback className="text-xs">
                            #{index + 1}
                          </AvatarFallback>
                        </Avatar>
                        <span>#{index + 1} {donor.username}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-muted-foreground">No donors yet</li>
                  )}
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-secondary/40">
              <CardHeader>
                <CardTitle className="font-brand">Recent Purchases</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  {recentPurchases.length > 0 ? (
                    recentPurchases.map((purchase: any, index: number) => (
                      <li key={index} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage 
                            src={getMinecraftPlayerHead(purchase.minecraftUsername || purchase.username, 32)} 
                            alt={`${purchase.username}'s Minecraft head`}
                          />
                          <AvatarFallback className="text-xs">
                            {purchase.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate">{purchase.username}</div>
                          <div className="text-muted-foreground text-xs truncate">{purchase.package}</div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-muted-foreground">No recent purchases</li>
                  )}
                </ul>
              </CardContent>
            </Card>

            <iframe 
              src="https://discord.com/widget?id=1400580872800964819&theme=dark" 
              width="350" 
              height="500" 
              frameBorder="0" 
              sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
              title="Discord Server Widget"
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
