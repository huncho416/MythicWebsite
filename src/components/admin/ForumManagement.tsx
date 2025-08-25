import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  MessageSquare, 
  Plus, 
  Lock, 
  Unlock, 
  Pin, 
  PinOff, 
  Eye, 
  Edit2, 
  Trash2,
  Flag,
  Users
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

export default function ForumManagement() {
  const [categories, setCategories] = useState<Tables<'forum_categories'>[]>([]);
  const [threads, setThreads] = useState<any[]>([]);
  const [replies, setReplies] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("categories");
  
  // Forms state
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showEditCategoryDialog, setShowEditCategoryDialog] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    slug: "",
    icon: "",
    color: "#6366f1",
    category_type: "general" as const,
    min_role_to_view: "none",
    min_role_to_post: "none"
  });

  // Tag management state
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showEditTagDialog, setShowEditTagDialog] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tagForm, setTagForm] = useState({
    name: "",
    description: "",
    color: "#6366f1",
    icon: ""
  });

  const { toast } = useToast();

  useEffect(() => {
    loadForumData();
  }, []);

  const loadForumData = async () => {
    try {
      setLoading(true);
      
      // Load categories
      const categoriesRes = await supabase
        .from('forum_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      // Load tags
      const tagsRes = await supabase
        .from('forum_thread_tags')
        .select('*')
        .order('is_system', { ascending: false });

      // Load threads with separate lookups
      const threadsRes = await supabase
        .from('forum_threads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // Load posts with separate lookups
      const postsRes = await supabase
        .from('forum_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (categoriesRes.data) {
        setCategories(categoriesRes.data);
      }
      if (tagsRes.data) {
        setTags(tagsRes.data);
      }

      // Process threads with separate lookups
      if (threadsRes.data) {
        const threadsWithDetails = await Promise.all(
          threadsRes.data.map(async (thread) => {
            // Get category
            const categoryRes = await supabase
              .from('forum_categories')
              .select('id, name')
              .eq('id', thread.category_id)
              .maybeSingle();

            // Get author profile
            const authorRes = await supabase
              .from('user_profiles')
              .select('id, username, display_name')
              .eq('user_id', thread.author_id)
              .maybeSingle();

            return {
              ...thread,
              forum_categories: categoryRes.data,
              author_profile: authorRes.data
            };
          })
        );
        setThreads(threadsWithDetails);
      }

      // Process posts with separate lookups
      if (postsRes.data) {
        const postsWithDetails = await Promise.all(
          postsRes.data.map(async (post) => {
            // Get thread
            const threadRes = await supabase
              .from('forum_threads')
              .select('id, title')
              .eq('id', post.thread_id)
              .maybeSingle();

            // Get author profile
            const authorRes = await supabase
              .from('user_profiles')
              .select('id, username, display_name')
              .eq('user_id', post.author_id)
              .maybeSingle();

            return {
              ...post,
              forum_threads: threadRes.data,
              author_profile: authorRes.data
            };
          })
        );
        setReplies(postsWithDetails);
      }
      
    } catch (error) {
      console.error('Error loading forum data:', error);
      toast({
        title: "Error", 
        description: "Failed to load forum data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async () => {
    try {
      const insertData = {
        name: categoryForm.name,
        description: categoryForm.description,
        slug: categoryForm.slug,
        icon: categoryForm.icon,
        color: categoryForm.color,
        category_type: categoryForm.category_type as any,
        sort_order: categories.length,
        min_role_to_view: categoryForm.min_role_to_view === "none" ? null : categoryForm.min_role_to_view as any,
        min_role_to_post: categoryForm.min_role_to_post === "none" ? null : categoryForm.min_role_to_post as any
      };

      const { error } = await supabase
        .from('forum_categories')
        .insert(insertData);

      if (error) throw error;

      toast({ title: "Success", description: "Forum category created successfully" });
      closeCategoryDialog();
      loadForumData();
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      });
    }
  };

  const openEditCategory = (category: Tables<'forum_categories'>) => {
    try {
      // Ensure we have valid data before proceeding
      if (!category || !category.id) {
        toast({
          title: "Error",
          description: "Invalid category data",
          variant: "destructive",
        });
        return;
      }
      
      // Ensure all values are properly handled (null -> "none")
      const formData = {
        name: category.name || "",
        description: category.description || "",
        slug: category.slug || "",
        icon: category.icon || "",
        color: category.color || "#6366f1",
        category_type: (category.category_type || "general") as any,
        min_role_to_view: (category.min_role_to_view || "none") as string,
        min_role_to_post: (category.min_role_to_post || "none") as string
      };
      
      // Set form data first
      setCategoryForm(formData);
      
      // Then set the editing ID
      setEditingCategoryId(category.id);
      
      // Open the dialog
      setShowEditCategoryDialog(true);
      
    } catch (error) {
      console.error('Error in openEditCategory:', error);
      toast({
        title: "Error",
        description: "Failed to open edit dialog",
        variant: "destructive",
      });
    }
  };

  const updateCategory = async () => {
    if (!editingCategoryId) {
      toast({
        title: "Error",
        description: "No category selected for update",
        variant: "destructive",
      });
      return;
    }

    // Validate form data
    if (!categoryForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    if (!categoryForm.slug.trim()) {
      toast({
        title: "Validation Error",
        description: "Category slug is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const updateData = {
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim(),
        slug: categoryForm.slug.trim(),
        icon: categoryForm.icon.trim(),
        color: categoryForm.color,
        category_type: categoryForm.category_type,
        min_role_to_view: categoryForm.min_role_to_view === "none" ? null : categoryForm.min_role_to_view as any,
        min_role_to_post: categoryForm.min_role_to_post === "none" ? null : categoryForm.min_role_to_post as any
      };

      const { error } = await supabase
        .from('forum_categories')
        .update(updateData)
        .eq('id', editingCategoryId);

      if (error) {
        throw error;
      }

      toast({ 
        title: "Success", 
        description: "Forum category updated successfully" 
      });
      
      // Reset form and close dialog
      setShowEditCategoryDialog(false);
      setEditingCategoryId(null);
      setCategoryForm({
        name: "",
        description: "",
        slug: "",
        icon: "",
        color: "#6366f1",
        category_type: "general",
        min_role_to_view: "none",
        min_role_to_post: "none"
      });
      
      // Reload data to show changes
      loadForumData();
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update category",
        variant: "destructive",
      });
    }
  };

  const deleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Are you sure you want to delete the "${categoryName}" category? This will also delete all threads and replies in this category. This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('forum_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      toast({ title: "Success", description: "Forum category deleted successfully" });
      loadForumData();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const toggleCategoryLock = async (categoryId: string, isLocked: boolean) => {
    try {
      const { error } = await supabase
        .from('forum_categories')
        .update({ is_locked: !isLocked })
        .eq('id', categoryId);

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: `Category ${!isLocked ? 'locked' : 'unlocked'} successfully` 
      });
      loadForumData();
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    }
  };

  const toggleThreadPin = async (threadId: string, isPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('forum_threads')
        .update({ is_pinned: !isPinned })
        .eq('id', threadId);

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: `Thread ${!isPinned ? 'pinned' : 'unpinned'} successfully` 
      });
      loadForumData();
    } catch (error) {
      console.error('Error updating thread:', error);
      toast({
        title: "Error",
        description: "Failed to update thread",
        variant: "destructive",
      });
    }
  };

  const toggleThreadLock = async (threadId: string, isLocked: boolean) => {
    try {
      const { error } = await supabase
        .from('forum_threads')
        .update({ is_locked: !isLocked })
        .eq('id', threadId);

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: `Thread ${!isLocked ? 'locked' : 'unlocked'} successfully` 
      });
      loadForumData();
    } catch (error) {
      console.error('Error updating thread:', error);
      toast({
        title: "Error",
        description: "Failed to update thread",
        variant: "destructive",
      });
    }
  };

  const deleteThread = async (threadId: string) => {
    try {
      const { error } = await supabase
        .from('forum_threads')
        .delete()
        .eq('id', threadId);

      if (error) throw error;

      toast({ title: "Success", description: "Thread deleted successfully" });
      loadForumData();
    } catch (error) {
      console.error('Error deleting thread:', error);
      toast({
        title: "Error",
        description: "Failed to delete thread",
        variant: "destructive",
      });
    }
  };

  const deleteReply = async (replyId: string) => {
    try {
      const { error } = await supabase
        .from('forum_replies')
        .delete()
        .eq('id', replyId);

      if (error) throw error;

      toast({ title: "Success", description: "Reply deleted successfully" });
      loadForumData();
    } catch (error) {
      console.error('Error deleting reply:', error);
      toast({
        title: "Error",
        description: "Failed to delete reply",
        variant: "destructive",
      });
    }
  };

  const getCategoryTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      announcements: "bg-red-500",
      general: "bg-blue-500",
      support: "bg-yellow-500",
      suggestions: "bg-green-500",
      off_topic: "bg-purple-500"
    };
    return colors[type] || "bg-gray-500";
  };

  // Tag management functions
  const createTag = async () => {
    try {
      const { error } = await supabase
        .from('forum_thread_tags')
        .insert({
          name: tagForm.name,
          description: tagForm.description,
          color: tagForm.color,
          icon: tagForm.icon,
          is_system: false
        });

      if (error) throw error;

      toast({ title: "Success", description: "Tag created successfully" });
      closeTagDialog();
      loadForumData();
    } catch (error) {
      console.error('Error creating tag:', error);
      toast({
        title: "Error",
        description: "Failed to create tag",
        variant: "destructive",
      });
    }
  };

  const updateTag = async () => {
    if (!editingTagId) return;

    try {
      const { error } = await supabase
        .from('forum_thread_tags')
        .update({
          name: tagForm.name,
          description: tagForm.description,
          color: tagForm.color,
          icon: tagForm.icon
        })
        .eq('id', editingTagId);

      if (error) throw error;

      toast({ title: "Success", description: "Tag updated successfully" });
      closeEditTagDialog();
      loadForumData();
    } catch (error) {
      console.error('Error updating tag:', error);
      toast({
        title: "Error",
        description: "Failed to update tag",
        variant: "destructive",
      });
    }
  };

  const deleteTag = async (tagId: string, tagName: string) => {
    if (!confirm(`Are you sure you want to delete the tag "${tagName}"? This will remove it from all threads.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('forum_thread_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      toast({ title: "Success", description: "Tag deleted successfully" });
      loadForumData();
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast({
        title: "Error",
        description: "Failed to delete tag",
        variant: "destructive",
      });
    }
  };

  const openEditTag = (tag: any) => {
    setTagForm({
      name: tag.name || "",
      description: tag.description || "",
      color: tag.color || "#6366f1",
      icon: tag.icon || ""
    });
    setEditingTagId(tag.id);
    setShowEditTagDialog(true);
  };

  const closeTagDialog = () => {
    setShowTagDialog(false);
    setTagForm({
      name: "",
      description: "",
      color: "#6366f1",
      icon: ""
    });
  };

  const closeEditTagDialog = () => {
    setShowEditTagDialog(false);
    setEditingTagId(null);
    setTagForm({
      name: "",
      description: "",
      color: "#6366f1",
      icon: ""
    });
  };

  const closeCategoryDialog = () => {
    setShowCategoryDialog(false);
    setEditingCategoryId(null);
    setCategoryForm({
      name: "",
      description: "",
      slug: "",
      icon: "",
      color: "#6366f1",
      category_type: "general",
      min_role_to_view: "none",
      min_role_to_post: "none"
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">Loading forum data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Forum Management
          </CardTitle>
          <CardDescription>
            Manage forum categories, threads, and moderation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="threads">Threads</TabsTrigger>
              <TabsTrigger value="replies">Recent Replies</TabsTrigger>
              <TabsTrigger value="tags">Tags</TabsTrigger>
            </TabsList>

            <TabsContent value="categories" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Forum Categories</h3>
                <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Forum Category</DialogTitle>
                      <DialogDescription>
                        Add a new forum category to organize discussions
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="categoryName">Name</Label>
                          <Input
                            id="categoryName"
                            value={categoryForm.name}
                            onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="categorySlug">Slug</Label>
                          <Input
                            id="categorySlug"
                            value={categoryForm.slug}
                            onChange={(e) => setCategoryForm({...categoryForm, slug: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="categoryIcon">Icon (emoji)</Label>
                          <Input
                            id="categoryIcon"
                            value={categoryForm.icon}
                            onChange={(e) => setCategoryForm({...categoryForm, icon: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="categoryColor">Color</Label>
                          <Input
                            id="categoryColor"
                            type="color"
                            value={categoryForm.color}
                            onChange={(e) => setCategoryForm({...categoryForm, color: e.target.value})}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="categoryType">Category Type</Label>
                        <Select value={categoryForm.category_type} onValueChange={(value: any) => setCategoryForm({...categoryForm, category_type: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="announcements">Announcements</SelectItem>
                            <SelectItem value="support">Support</SelectItem>
                            <SelectItem value="suggestions">Suggestions</SelectItem>
                            <SelectItem value="off_topic">Off Topic</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="minRoleView">Min Role to View</Label>
                          <Select value={categoryForm.min_role_to_view} onValueChange={(value) => setCategoryForm({...categoryForm, min_role_to_view: value})}>
                            <SelectTrigger>
                              <SelectValue placeholder="No restriction" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No restriction</SelectItem>
                              <SelectItem value="helper">Helper+</SelectItem>
                              <SelectItem value="moderator">Moderator+</SelectItem>
                              <SelectItem value="admin">Admin+</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="minRolePost">Min Role to Post</Label>
                          <Select value={categoryForm.min_role_to_post} onValueChange={(value) => setCategoryForm({...categoryForm, min_role_to_post: value})}>
                            <SelectTrigger>
                              <SelectValue placeholder="No restriction" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No restriction</SelectItem>
                              <SelectItem value="helper">Helper+</SelectItem>
                              <SelectItem value="moderator">Moderator+</SelectItem>
                              <SelectItem value="admin">Admin+</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="categoryDesc">Description</Label>
                        <Textarea
                          id="categoryDesc"
                          value={categoryForm.description}
                          onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={closeCategoryDialog}>
                        Cancel
                      </Button>
                      <Button onClick={createCategory}>
                        Create Category
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <span style={{ color: category.color }}>{category.icon}</span>
                            <div>
                              <div className="font-medium">{category.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {category.description}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getCategoryTypeColor(category.category_type)}>
                            {category.category_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">
                              View: {category.min_role_to_view || "Everyone"}
                            </div>
                            <div className="text-sm">
                              Post: {category.min_role_to_post || "Everyone"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={category.is_locked ? "destructive" : "default"}>
                            {category.is_locked ? "Locked" : "Open"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleCategoryLock(category.id, category.is_locked)}
                            >
                              {category.is_locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditCategory(category)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteCategory(category.id, category.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="threads" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Forum Threads</h3>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thread</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Replies</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {threads.map((thread) => (
                      <TableRow key={thread.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium flex items-center gap-2">
                              {thread.is_pinned && <Pin className="h-4 w-4 text-yellow-500" />}
                              {thread.title}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(thread.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {thread.forum_categories?.name || "Unknown"}
                        </TableCell>
                        <TableCell>
                          {thread.author_profile?.display_name || 
                           thread.author_profile?.username || 
                           "Unknown User"}
                        </TableCell>
                        <TableCell>{thread.reply_count}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {thread.is_pinned && (
                              <Badge variant="secondary">Pinned</Badge>
                            )}
                            {thread.is_locked && (
                              <Badge variant="destructive">Locked</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleThreadPin(thread.id, thread.is_pinned)}
                            >
                              {thread.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleThreadLock(thread.id, thread.is_locked)}
                            >
                              {thread.is_locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteThread(thread.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="replies" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Recent Replies</h3>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reply</TableHead>
                      <TableHead>Thread</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {replies.map((reply) => (
                      <TableRow key={reply.id}>
                        <TableCell>
                          <div className="max-w-md">
                            <p className="text-sm line-clamp-2">{reply.content}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {reply.forum_threads?.title || "Unknown Thread"}
                        </TableCell>
                        <TableCell>
                          {reply.author_profile?.display_name || 
                           reply.author_profile?.username || 
                           "Unknown User"}
                        </TableCell>
                        <TableCell>
                          {new Date(reply.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteReply(reply.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="tags" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Thread Tags</h3>
                <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Tag
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Thread Tag</DialogTitle>
                      <DialogDescription>
                        Add a new tag for forum threads
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="tagName">Name</Label>
                          <Input
                            id="tagName"
                            value={tagForm.name}
                            onChange={(e) => setTagForm({...tagForm, name: e.target.value})}
                            placeholder="e.g., urgent, solved"
                          />
                        </div>
                        <div>
                          <Label htmlFor="tagIcon">Icon (emoji)</Label>
                          <Input
                            id="tagIcon"
                            value={tagForm.icon}
                            onChange={(e) => setTagForm({...tagForm, icon: e.target.value})}
                            placeholder="e.g., 🔥, ✅"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="tagColor">Color</Label>
                        <Input
                          id="tagColor"
                          type="color"
                          value={tagForm.color}
                          onChange={(e) => setTagForm({...tagForm, color: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="tagDescription">Description</Label>
                        <Textarea
                          id="tagDescription"
                          value={tagForm.description}
                          onChange={(e) => setTagForm({...tagForm, description: e.target.value})}
                          placeholder="Describe when this tag should be used"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={closeTagDialog}>
                        Cancel
                      </Button>
                      <Button onClick={createTag}>
                        Create Tag
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tag</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tags.map((tag) => (
                      <TableRow key={tag.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <span style={{ color: tag.color }}>{tag.icon}</span>
                            <div>
                              <div className="font-medium">{tag.name}</div>
                              <Badge 
                                variant={tag.is_system ? "secondary" : "outline"}
                                style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color }}
                              >
                                {tag.name}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {tag.description || "No description"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={tag.is_system ? "default" : "secondary"}>
                            {tag.is_system ? "System" : "Custom"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditTag(tag)}
                              disabled={tag.is_system}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteTag(tag.id, tag.name)}
                              disabled={tag.is_system}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Category Dialog */}
      <Dialog open={showEditCategoryDialog} onOpenChange={setShowEditCategoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Forum Category</DialogTitle>
            <DialogDescription>
              Update the forum category settings and permissions
            </DialogDescription>
          </DialogHeader>
          
          {editingCategoryId ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editCategoryName">Name</Label>
                  <Input
                    id="editCategoryName"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="editCategorySlug">Slug</Label>
                  <Input
                    id="editCategorySlug"
                    value={categoryForm.slug}
                    onChange={(e) => setCategoryForm({...categoryForm, slug: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editCategoryIcon">Icon (emoji)</Label>
                  <Input
                    id="editCategoryIcon"
                    value={categoryForm.icon}
                    onChange={(e) => setCategoryForm({...categoryForm, icon: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="editCategoryColor">Color</Label>
                  <Input
                    id="editCategoryColor"
                    type="color"
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm({...categoryForm, color: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="editCategoryType">Category Type</Label>
                <Select 
                  value={categoryForm.category_type} 
                  onValueChange={(value) => setCategoryForm({...categoryForm, category_type: value as any})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="announcements">Announcements</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="suggestions">Suggestions</SelectItem>
                    <SelectItem value="off_topic">Off Topic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editMinRoleView">Min Role to View</Label>
                  <Select value={categoryForm.min_role_to_view} onValueChange={(value) => setCategoryForm({...categoryForm, min_role_to_view: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="No restriction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No restriction</SelectItem>
                      <SelectItem value="helper">Helper+</SelectItem>
                      <SelectItem value="moderator">Moderator+</SelectItem>
                      <SelectItem value="admin">Admin+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="editMinRolePost">Min Role to Post</Label>
                  <Select value={categoryForm.min_role_to_post} onValueChange={(value) => setCategoryForm({...categoryForm, min_role_to_post: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="No restriction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No restriction</SelectItem>
                      <SelectItem value="helper">Helper+</SelectItem>
                      <SelectItem value="moderator">Moderator+</SelectItem>
                      <SelectItem value="admin">Admin+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="editCategoryDesc">Description</Label>
                <Textarea
                  id="editCategoryDesc"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                />
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p>Loading category data...</p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditCategoryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={updateCategory} disabled={!editingCategoryId}>
              Update Category
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Tag Dialog */}
      <Dialog open={showEditTagDialog} onOpenChange={setShowEditTagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
            <DialogDescription>
              Update tag properties and appearance
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editTagName">Name</Label>
                <Input
                  id="editTagName"
                  value={tagForm.name}
                  onChange={(e) => setTagForm({...tagForm, name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="editTagIcon">Icon (emoji)</Label>
                <Input
                  id="editTagIcon"
                  value={tagForm.icon}
                  onChange={(e) => setTagForm({...tagForm, icon: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="editTagColor">Color</Label>
              <Input
                id="editTagColor"
                type="color"
                value={tagForm.color}
                onChange={(e) => setTagForm({...tagForm, color: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="editTagDescription">Description</Label>
              <Textarea
                id="editTagDescription"
                value={tagForm.description}
                onChange={(e) => setTagForm({...tagForm, description: e.target.value})}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeEditTagDialog}>
              Cancel
            </Button>
            <Button onClick={updateTag}>
              Update Tag
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
