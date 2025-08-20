import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Layout from "@/components/layout/Layout";
import Store from "@/pages/Store";
import Forums from "@/pages/Forums";
import ForumCategory from "@/pages/ForumCategory";
import Support from "@/pages/Support";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import Admin from "@/pages/Admin";
import Profile from "@/pages/Profile";
import Post from "@/pages/Post";
import Vote from "@/pages/Vote";
import { HelmetProvider } from "react-helmet-async";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/store" element={<Store />} />
              <Route path="/forums" element={<Forums />} />
              <Route path="/forums/category/:categoryId" element={<ForumCategory />} />
              <Route path="/forums/thread/:threadId" element={<Post />} />
              <Route path="/vote" element={<Vote />} />
              <Route path="/support" element={<Support />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/post/:id" element={<Post />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
