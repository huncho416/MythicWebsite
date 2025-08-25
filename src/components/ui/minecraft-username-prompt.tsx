import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MinecraftUsernamePromptProps {
  open: boolean;
  onUsernameSet: (username: string) => void;
}

export function MinecraftUsernamePrompt({ open, onUsernameSet }: MinecraftUsernamePromptProps) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const validateMinecraftUsername = (username: string): boolean => {
    // Minecraft username validation:
    // - 3-16 characters
    // - Only letters, numbers, and underscores
    // - Cannot start or end with underscore
    const regex = /^[a-zA-Z0-9_]{3,16}$/;
    const startsOrEndsWithUnderscore = username.startsWith('_') || username.endsWith('_');
    
    return regex.test(username) && !startsOrEndsWithUnderscore;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast({
        title: "Error",
        description: "Please enter your Minecraft username",
        variant: "destructive",
      });
      return;
    }

    if (!validateMinecraftUsername(username.trim())) {
      toast({
        title: "Invalid Username",
        description: "Minecraft username must be 3-16 characters, contain only letters, numbers, and underscores, and cannot start or end with an underscore.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          minecraft_username: username.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Minecraft username saved successfully!",
      });

      onUsernameSet(username.trim());
    } catch (error) {
      console.error('Error saving Minecraft username:', error);
      toast({
        title: "Error",
        description: "Failed to save Minecraft username. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={() => {}}>
        <DialogHeader>
          <DialogTitle className="text-purple-700">Minecraft Username Required</DialogTitle>
          <DialogDescription className="text-gray-600">
            We need your Minecraft username to process store purchases and execute commands on the server.
            This ensures your items are delivered to the correct player.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="minecraft-username" className="text-sm font-medium">
              Minecraft Username
            </Label>
            <Input
              id="minecraft-username"
              type="text"
              placeholder="e.g., Steve, Alex, YourUsername"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="border-purple-300 focus:border-purple-500 focus:ring-purple-500"
              disabled={loading}
              maxLength={16}
            />
            <p className="text-xs text-gray-500">
              3-16 characters, letters, numbers, and underscores only
            </p>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6"
            >
              {loading ? 'Saving...' : 'Continue to Store'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
