import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ExternalLink, 
  Trophy, 
  Calendar, 
  Award, 
  Target,
  Gift,
  Star,
  Clock,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type VotingSite = Database['public']['Tables']['server_voting_sites']['Row'];
type VotingReward = Database['public']['Tables']['voting_rewards']['Row'];
type UserVotingStats = Database['public']['Tables']['user_voting_stats']['Row'];
type UserVote = Database['public']['Tables']['user_server_votes']['Row'];

export default function Vote() {
  const [votingSites, setVotingSites] = useState<VotingSite[]>([]);
  const [votingRewards, setVotingRewards] = useState<VotingReward[]>([]);
  const [userStats, setUserStats] = useState<UserVotingStats | null>(null);
  const [userVotes, setUserVotes] = useState<UserVote[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      // Load voting sites
      const { data: sites, error: sitesError } = await supabase
        .from('server_voting_sites')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (sitesError) throw sitesError;
      setVotingSites(sites || []);

      // Load voting rewards
      const { data: rewards, error: rewardsError } = await supabase
        .from('voting_rewards')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (rewardsError) throw rewardsError;
      setVotingRewards(rewards || []);

      // Load user data if logged in
      if (session?.user) {
        // Load user voting stats
        const { data: stats, error: statsError } = await supabase
          .from('user_voting_stats')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (statsError && statsError.code !== 'PGRST116') throw statsError;
        setUserStats(stats);

        // Load user votes
        const { data: votes, error: votesError } = await supabase
          .from('user_server_votes')
          .select('*')
          .eq('user_id', session.user.id);

        if (votesError) throw votesError;
        setUserVotes(votes || []);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load voting data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (site: VotingSite) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to track your votes and earn rewards.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Record the vote
      const { error } = await supabase
        .from('user_server_votes')
        .upsert({
          user_id: user.id,
          voting_site_id: site.id,
          last_voted_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,voting_site_id'
        });

      if (error) throw error;

      // Open voting link in new tab
      window.open(site.voting_url, '_blank');

      // Reload data to update stats
      loadData();

      toast({
        title: "Vote recorded!",
        description: `Thanks for voting on ${site.name}! Your vote has been tracked.`,
      });

    } catch (error) {
      console.error('Error recording vote:', error);
      toast({
        title: "Error",
        description: "Failed to record your vote. Please try again.",
        variant: "destructive"
      });
    }
  };

  const canVoteToday = (siteId: string) => {
    if (!user) return true;
    
    const userVote = userVotes.find(v => v.voting_site_id === siteId);
    if (!userVote) return true;

    const lastVoted = new Date(userVote.last_voted_at);
    const today = new Date();
    return lastVoted.toDateString() !== today.toDateString();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading voting information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Vote for Our Server</h1>
          <p className="text-xl text-muted-foreground mb-6">
            Help us grow by voting on these Minecraft server lists and earn amazing rewards!
          </p>
          
          {user && userStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              <Card>
                <CardContent className="p-4 text-center">
                  <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                  <div className="text-2xl font-bold">{userStats?.total_votes || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Votes</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold">{userStats?.current_streak || 0}</div>
                  <div className="text-sm text-muted-foreground">Current Streak</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Star className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <div className="text-2xl font-bold">{userStats?.longest_streak || 0}</div>
                  <div className="text-sm text-muted-foreground">Best Streak</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Gift className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">{userStats?.total_rewards_claimed || 0}</div>
                  <div className="text-sm text-muted-foreground">Rewards Claimed</div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <Tabs defaultValue="vote" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="vote">Vote Now</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
          </TabsList>

          <TabsContent value="vote" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {votingSites.map((site) => {
                const canVote = canVoteToday(site.id);

                return (
                  <Card key={site.id} className="relative overflow-hidden">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{site.name}</CardTitle>
                        {!canVote && (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            Voted Today
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{site.description}</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                    <div className="bg-secondary/20 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Gift className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">Reward:</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{site.reward_description}</p>
                    </div>

                      <Button 
                        onClick={() => handleVote(site)}
                        disabled={user && !canVote}
                        className="w-full"
                        size="lg"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {canVote ? 'Vote Now' : 'Already Voted Today'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {!user && (
              <Card className="bg-secondary/20 border-dashed">
                <CardContent className="p-8 text-center">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Login to Track Your Votes</h3>
                  <p className="text-muted-foreground mb-4">
                    Create an account to track your voting progress, maintain streaks, and earn exclusive rewards!
                  </p>
                  <Button asChild>
                    <a href="/login">Login / Register</a>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="rewards" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {votingRewards.map((reward) => (
                <Card key={reward.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{reward.name}</CardTitle>
                      <Badge variant="outline">
                        {reward.votes_required} vote{reward.votes_required !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">{reward.description}</p>
                    
                    {reward.item_commands && reward.item_commands.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Reward Commands:</div>
                        <div className="grid gap-1">
                          {reward.item_commands.map((command, index) => (
                            <div key={index} className="text-xs bg-secondary/50 rounded px-2 py-1 font-mono">
                              {command.replace('{player}', 'YourUsername')}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {user && userStats && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress:</span>
                          <span>{Math.min(userStats.total_votes || 0, reward.votes_required)}/{reward.votes_required}</span>
                        </div>
                        <Progress 
                          value={((userStats.total_votes || 0) / reward.votes_required) * 100} 
                          className="h-2"
                        />
                        {(userStats.total_votes || 0) >= reward.votes_required && (
                          <Badge className="w-full justify-center" variant="default">
                            <Award className="h-3 w-3 mr-1" />
                            Unlocked!
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
