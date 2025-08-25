import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Layout from "@/components/layout/Layout";
import Store from "@/pages/Store";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import PaymentMethod from "@/pages/PaymentMethod";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentProcessing from "@/pages/PaymentProcessing";
import Forums from "@/pages/Forums";
import ForumCategory from "@/pages/ForumCategory";
import Support from "@/pages/Support";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import Profile from "@/pages/Profile";
import Post from "@/pages/Post";
import { HelmetProvider } from "react-helmet-async";

// Lazy load heavy components for better performance
const Admin = lazy(() => import("./pages/Admin"));
const Vote = lazy(() => import("./pages/Vote"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    },
  },
});

// Loading component for suspended routes
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Index />} />
                <Route path="/store" element={<Store />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/payment" element={<PaymentMethod />} />
                <Route path="/payment/success" element={<PaymentSuccess />} />
                <Route path="/checkout/pay/:provider" element={<PaymentProcessing />} />
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
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
