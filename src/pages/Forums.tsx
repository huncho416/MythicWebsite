import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { MessageSquare, Lock } from "lucide-react";
import { User } from "@supabase/supabase-js";

export default function Forums() {
  const [categories, setCategories] = useState<Tables<'forum_categories'>[]>([]);
  const [categoryStats, setCategoryStats] = useState<Record<string, { threadCount: number; postCount: number; lastActivity: any }>>({});
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const canonical = typeof window !== 'undefined' ? window.location.origin + '/forums' : '';

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
      await loadForumData();
    } catch (error) {
      console.error('Error checking auth:', error);
      navigate('/login');
    }
  };

  const loadForumData = async () => {
    try {
      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('forum_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Load statistics for each category
      const stats: Record<string, { threadCount: number; postCount: number; lastActivity: any }> = {};
      
      for (const category of categoriesData || []) {
        // Get thread count
        const { count: threadCount } = await supabase
          .from('forum_threads')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', category.id);

        // Get post count for this category
        const { count: postCount } = await supabase
          .from('forum_posts')
          .select('thread_id!inner(*)', { count: 'exact', head: true })
          .eq('thread_id.category_id', category.id);

        // Get latest activity (most recent thread or post)
        const { data: latestThread, error: threadError } = await supabase
          .from('forum_threads')
          .select(`
            id,
            title,
            created_at,
            updated_at,
            last_reply_at,
            last_reply_by,
            author_id
          `)
          .eq('category_id', category.id)
          .order('last_reply_at', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();

        // Get author profile if thread exists
        let threadWithAuthor: any = latestThread;
        if (latestThread && latestThread.author_id) {
          const { data: authorProfile } = await supabase
            .from('user_profiles')
            .select('display_name, username')
            .eq('user_id', latestThread.author_id)
            .single();

          threadWithAuthor = {
            ...latestThread,
            author: authorProfile
          };
        }

        stats[category.id] = {
          threadCount: threadCount || 0,
          postCount: (postCount || 0) + (threadCount || 0), // Include original thread posts
          lastActivity: threadWithAuthor
        };
      }

      setCategoryStats(stats);
    } catch (error) {
      console.error('Error loading forum data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      announcements: "bg-red-500 text-white",
      general: "bg-blue-500 text-white", 
      support: "bg-yellow-500 text-white",
      suggestions: "bg-green-500 text-white",
      off_topic: "bg-purple-500 text-white"
    };
    return colors[type] || "bg-gray-500 text-white";
  };

  return (
    <div className="container mx-auto py-12">
      <Helmet>
        <title>Forums | MythicPvP Community</title>
        <meta name="description" content="Discuss gameplay, report bugs, and share suggestions on the MythicPvP forums." />
        <link rel="canonical" href={canonical} />
      </Helmet>
      <h1 className="font-brand text-4xl mb-8">Forums</h1>
      
      {loading ? (
        <Card className="bg-secondary/40">
          <CardContent className="p-6">
            <p className="text-muted-foreground">Loading forum categories...</p>
          </CardContent>
        </Card>
      ) : categories.length === 0 ? (
        <Card className="bg-secondary/40">
          <CardContent className="p-6">
            <p className="text-muted-foreground">No forum categories available. Check back soon!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => {
            const stats = categoryStats[category.id] || { threadCount: 0, postCount: 0, lastActivity: null };
            
            return (
              <Card 
                key={category.id} 
                className="bg-secondary/40 hover:bg-secondary/60 transition-colors"
              >
                <div 
                  className="cursor-pointer"
                  onClick={() => navigate(`/forums/category/${category.id}`)}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start gap-4">
                      {/* Forum Icon */}
                      <div className="flex-shrink-0">
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl font-bold"
                          style={{ 
                            backgroundColor: category.color + '20',
                            color: category.color 
                          }}
                        >
                          {category.icon || '📝'}
                        </div>
                      </div>
                      
                      {/* Forum Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                          <Badge className={getCategoryTypeColor(category.category_type)}>
                            {category.category_type}
                          </Badge>
                          {category.is_locked && (
                            <Badge variant="destructive">
                              <Lock className="h-3 w-3 mr-1" />
                              Locked
                            </Badge>
                          )}
                        </div>
                        {category.description && (
                          <CardDescription className="text-sm text-muted-foreground mb-2">
                            {category.description}
                          </CardDescription>
                        )}
                        
                        {/* Sub-forums would go here if implemented */}
                      </div>
                      
                      {/* Statistics */}
                      <div className="flex-shrink-0 text-center min-w-[100px]">
                        <div className="text-sm font-medium">{stats.threadCount.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Threads</div>
                        <div className="text-sm font-medium mt-1">{stats.postCount.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Posts</div>
                      </div>
                      
                      {/* Last Activity */}
                      <div className="flex-shrink-0 min-w-[200px] text-right">
                        {stats.lastActivity ? (
                          <div className="text-sm">
                            <div className="font-medium text-primary hover:underline cursor-pointer">
                              {stats.lastActivity.title.length > 30 
                                ? `${stats.lastActivity.title.substring(0, 30)}...` 
                                : stats.lastActivity.title}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(stats.lastActivity.last_reply_at || stats.lastActivity.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              by {stats.lastActivity.author?.display_name || 
                                  stats.lastActivity.author?.username || 
                                  'Unknown'}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            {stats.threadCount > 0 ? 'No recent activity' : 'No posts yet'}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
