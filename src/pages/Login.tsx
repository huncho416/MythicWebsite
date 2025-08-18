import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const canonical = typeof window !== 'undefined' ? window.location.origin + '/login' : '';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data.user) {
        toast({
          title: "Welcome back!",
          description: "You have been logged in successfully.",
        });
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // First check if username is already taken
      const { data: existingUser, error: checkError } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', username)
        .single();

      if (existingUser) {
        throw new Error('Username is already taken. Please choose a different username.');
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            username: username,
            preferred_username: username
          }
        }
      });
      
      if (error) throw error;

      // Immediately create the profile with the correct username
      if (data.user) {
        // Create profile directly without waiting for trigger
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert([{
            user_id: data.user.id,
            username: username,
            join_date: new Date().toISOString()
          }]);

        if (profileError) {
          console.error('Error creating profile:', profileError);
          // If the profile already exists from trigger, update it
          await supabase
            .from('user_profiles')
            .update({ username: username })
            .eq('user_id', data.user.id);
        }
      }
      
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address first.",
        variant: "destructive",
      });
      return;
    }

    setResetLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      toast({
        title: "Reset email sent!",
        description: "Check your email for a password reset link.",
      });
    } catch (error: any) {
      toast({
        title: "Reset failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-12">
      <Helmet>
        <title>Login | MythicPvP Account</title>
        <meta name="description" content="Login to your MythicPvP account or create a new account to manage purchases and settings." />
        <link rel="canonical" href={canonical} />
      </Helmet>
      <h1 className="font-brand text-4xl mb-8">Account Access</h1>
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="font-brand">Welcome to MythicPvP</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4 mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input 
                    id="login-email" 
                    type="email" 
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <Input 
                    id="login-password" 
                    type="password" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button className="w-full" variant="hero" type="submit" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>
                <div className="text-center">
                  <Button 
                    type="button" 
                    variant="link" 
                    onClick={handleForgotPassword}
                    disabled={resetLoading}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    {resetLoading ? "Sending..." : "Forgot your password?"}
                  </Button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="register" className="space-y-4 mt-6">
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label htmlFor="register-username">Username *</Label>
                  <Input 
                    id="register-username" 
                    type="text" 
                    placeholder="myusername"
                    value={username}
                    onChange={(e) => {
                      const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                      setUsername(value);
                    }}
                    required
                    minLength={3}
                    maxLength={20}
                    pattern="[a-z0-9_]+"
                    title="Username can only contain lowercase letters, numbers, and underscores"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    3-20 characters, lowercase letters, numbers, and underscores only
                  </p>
                </div>
                <div>
                  <Label htmlFor="register-email">Email *</Label>
                  <Input 
                    id="register-email" 
                    type="email" 
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your email will be private and used only for account verification
                  </p>
                </div>
                <div>
                  <Label htmlFor="register-password">Password *</Label>
                  <Input 
                    id="register-password" 
                    type="password" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button className="w-full" variant="hero" type="submit" disabled={loading}>
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
