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
      loadForumCategories();
    } catch (error) {
      console.error('Error checking auth:', error);
      navigate('/login');
    }
  };

  const loadForumCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('forum_categories')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading forum categories:', error);
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
        <div className="space-y-4">
          {categories.map((category) => (
            <Card 
              key={category.id} 
              className="bg-secondary/40 hover:bg-secondary/60 transition-colors cursor-pointer"
              onClick={() => navigate(`/forums/category/${category.id}`)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span style={{ color: category.color }} className="text-2xl">
                    {category.icon}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span>{category.name}</span>
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
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    <span>View Threads</span>
                  </div>
                </CardTitle>
                {category.description && (
                  <CardDescription>
                    {category.description}
                  </CardDescription>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
