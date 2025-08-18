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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("categories");
  
  // Forms state
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    slug: "",
    icon: "",
    color: "#6366f1",
    category_type: "general" as const,
    min_role_to_view: "",
    min_role_to_post: ""
  });

  const { toast } = useToast();

  useEffect(() => {
    loadForumData();
  }, []);

  const loadForumData = async () => {
    try {
      setLoading(true);
      
      const [categoriesRes, threadsRes, postsRes] = await Promise.all([
        supabase.from('forum_categories').select('*').order('sort_order'),
        supabase.from('forum_threads').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('forum_posts').select('*').order('created_at', { ascending: false }).limit(50)
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (threadsRes.data) setThreads(threadsRes.data);
      if (postsRes.data) setReplies(postsRes.data);
      
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
        min_role_to_view: categoryForm.min_role_to_view ? categoryForm.min_role_to_view as any : null,
        min_role_to_post: categoryForm.min_role_to_post ? categoryForm.min_role_to_post as any : null
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
      const formData = {
        name: category.name,
        description: category.description || "",
        slug: category.slug,
        icon: category.icon || "",
        color: category.color || "#6366f1",
        category_type: category.category_type as any,
        min_role_to_view: category.min_role_to_view || "",
        min_role_to_post: category.min_role_to_post || ""
      };
      setCategoryForm(formData);
      setEditingCategoryId(category.id);
      setShowCategoryDialog(true);
    } catch (error) {
      console.error('Error opening edit dialog:', error);
      toast({
        title: "Error",
        description: "Failed to open edit dialog",
        variant: "destructive",
      });
    }
  };

  const updateCategory = async () => {
    if (!editingCategoryId) return;

    try {
      const updateData = {
        name: categoryForm.name,
        description: categoryForm.description,
        slug: categoryForm.slug,
        icon: categoryForm.icon,
        color: categoryForm.color,
        category_type: categoryForm.category_type as any,
        min_role_to_view: categoryForm.min_role_to_view ? categoryForm.min_role_to_view as any : null,
        min_role_to_post: categoryForm.min_role_to_post ? categoryForm.min_role_to_post as any : null
      };

      const { error } = await supabase
        .from('forum_categories')
        .update(updateData)
        .eq('id', editingCategoryId);

      if (error) throw error;

      toast({ title: "Success", description: "Forum category updated successfully" });
      closeCategoryDialog();
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
      min_role_to_view: "",
      min_role_to_post: ""
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="threads">Threads</TabsTrigger>
              <TabsTrigger value="replies">Recent Replies</TabsTrigger>
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
                      <DialogTitle>{editingCategoryId ? 'Edit Forum Category' : 'Create Forum Category'}</DialogTitle>
                      <DialogDescription>
                        {editingCategoryId ? 'Update the forum category details' : 'Add a new forum category to organize discussions'}
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
                        <Select onValueChange={(value: any) => setCategoryForm({...categoryForm, category_type: value})}>
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
                              <SelectItem value="">No restriction</SelectItem>
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
                              <SelectItem value="">No restriction</SelectItem>
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
                      <Button onClick={editingCategoryId ? updateCategory : createCategory}>
                        {editingCategoryId ? 'Update Category' : 'Create Category'}
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
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
