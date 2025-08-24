# MythicPvP Website

A complete, modern Minecraft server website with full admin panel built with React, TypeScript, Tailwind CSS, and Supabase. **Now featuring enterprise-level security and performance optimizations!**

![MythicPvP Banner](public/banner.jpg)

## ⚡ **NEW: Performance & Security Updates**

🚀 **79% Bundle Size Reduction** - From 776kB to 161kB main bundle  
🛡️ **Enterprise Security** - Comprehensive XSS protection, CSP headers, input validation  
⚡ **Code Splitting** - Admin panel loads on-demand for faster initial page loads  
📊 **Performance Monitoring** - Real-time Web Vitals tracking and analytics  
🖼️ **Image Optimization** - Automatic compression and lazy loading  
🎮 **Minecraft Background System** - Easy-to-update homepage backgrounds with fallback support

### Public Website
- **Modern Homepage** with hero section, server stats, and news
- **Store System** for ranks, keys, and cosmetics
- **Forum System** with categories, threads, and replies
- **Support Ticket System** for player assistance
- **User Profiles** with avatar uploads and customization
- **Discord Integration** with live widget and server stats
- **Authentication System** with login/register functionality
- **Responsive Design** works on all devices

### Admin Panel
- **User Management** - View, edit, and manage all users
- **Role Management** - Assign and manage user permissions
- **Forum Management** - Create/edit categories, moderate posts
- **Store Management** - Manage packages, categories, discounts
- **Support Management** - Handle tickets and responses
- **Home Message Management** - Control homepage announcements
- **Moderation Tools** - Ban, mute, and moderate users
- **Settings Management** - Configure server settings

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **State Management**: React hooks + Context
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Animations**: CSS transitions + transforms
- **Build Tool**: Vite with advanced optimization
- **Package Manager**: npm
- **Security**: CSP headers, input validation, XSS protection
- **Performance**: Code splitting, image optimization, Web Vitals monitoring
- **Monitoring**: Real-time performance analytics

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/huncho416/MythicWebsite.git
   cd MythicWebsite
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Copy your project URL and anon key
   - Run the migrations in the `supabase/migrations/` folder

4. **Configure environment variables**
   Create a `.env.local` file:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_APP_ENV=development
   ```
   
   **🔒 Security Note**: Environment variables are now properly secured and never committed to version control.

5. **Set up database indexes (for optimal performance)**
   Run the SQL commands in `database_indexes.sql` in your Supabase SQL editor for enhanced database performance.

6. **Start development server**
   ```bash
   npm run dev
   ```

7. **Build for production**
   ```bash
   npm run build
   ```
   
   **📊 Build Output**: Optimized chunks with 79% smaller bundle size for faster loading.

8. **Verify setup (optional)**
   ```bash
   node verify-setup.js
   ```

## 📁 Project Structure

```
src/
├── components/
│   ├── admin/              # Admin panel components (lazy loaded)
│   │   ├── SimplifiedUserManagement.tsx
│   │   ├── ForumManagement.tsx
│   │   ├── EnhancedStoreManagement.tsx
│   │   ├── OrderManagement.tsx
│   │   ├── SupportManagement.tsx
│   │   └── ...
│   ├── layout/             # Layout components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── Layout.tsx
│   ├── sections/           # Homepage sections
│   │   ├── Hero.tsx
│   │   ├── ServerStats.tsx
│   │   └── ...
│   └── ui/                 # Reusable UI components
│       ├── LazyImage.tsx   # Optimized image loading
│       └── ...
├── pages/                  # Route pages
│   ├── Index.tsx           # Homepage
│   ├── Admin.tsx           # Admin panel (lazy loaded)
│   ├── Forums.tsx          # Forum listing
│   ├── Store.tsx           # Store page
│   └── ...
├── integrations/
│   └── supabase/           # Database integration
├── hooks/                  # Custom React hooks
│   ├── use-mobile.tsx     # Mobile detection
│   ├── use-toast.ts       # Toast notifications
│   └── use-background.ts  # Background image loading
├── lib/                    # Utility functions
│   ├── utils.ts           # General utilities
│   ├── security.ts        # Security validation
│   └── performance.ts     # Performance optimization
├── config/                 # Configuration files
│   └── background.ts      # Background image settings
```

### 📋 Additional Files
```
├── .env.local                         # Environment variables (secure)
├── database_indexes.sql               # Database performance indexes
├── verify-setup.js                    # Setup verification script
├── generate-background.html           # Minecraft background generator
├── setup-background.sh                # Background setup script
```

## 🗄️ Database Schema

### Core Tables
- **users** - User authentication and basic info
- **user_profiles** - Extended user data (display names, avatars)
- **user_roles** - Permission system
- **forum_categories** - Forum organization
- **forum_threads** - Discussion topics
- **forum_replies** - Thread responses
- **store_categories** - Store organization
- **store_packages** - Purchasable items
- **support_tickets** - Help system
- **home_messages** - Homepage announcements

### Key Features
- **Row Level Security (RLS)** for data protection
- **Real-time subscriptions** for live updates
- **File storage** for avatars and images
- **Audit logs** for admin actions

## 🎨 UI/UX Features

### Design System
- **Mythic Theme** - Purple/blue gradient color scheme
- **Minecraft Aesthetic** - Gaming-focused visual design
- **Dark Mode Support** - Comfortable viewing experience
- **Glass Morphism** - Modern backdrop blur effects
- **Responsive Grid** - Mobile-first design approach

### Animations
- **Smooth Transitions** on hover and focus states
- **Loading Skeletons** for better perceived performance
- **Page Transitions** for seamless navigation
- **Interactive Elements** with visual feedback

## 🔐 Authentication & Authorization

### User Roles
- **Player** - Basic access to public features
- **Helper** - Limited moderation capabilities
- **Moderator** - Forum and chat moderation
- **Admin** - Full admin panel access
- **Owner** - Complete system control

### Permissions
- **Granular Controls** for each feature
- **Role-based Access** to admin functions
- **Protected Routes** based on permissions
- **Secure API Calls** with user context

## 💾 Admin Panel Features

### User Management
- View all registered users
- Edit user profiles and permissions
- Assign roles and manage access levels
- Ban/unban users with reason tracking

### Forum Management
- Create and edit forum categories
- Set permissions per category
- Moderate threads and replies
- Pin important discussions
- Lock/unlock categories

### Store Management
- Create product categories
- Add packages with images
- Set prices and descriptions
- Manage discounts and promotions
- Track purchase history

### Support System
- View all support tickets
- Respond to player issues
- Categorize and prioritize tickets
- Close resolved issues
- Export ticket data

## 🌐 Public Features

### Homepage
- **Hero Section** with server information
- **Live Server Stats** (players online, Discord members)
- **News Feed** with admin-managed announcements
- **Featured Products** from the store
- **Discord Integration** with live widget

### Forums
- **Category Browsing** with thread counts
- **Thread Creation** with rich text support
- **Reply System** with nested comments
- **User Profiles** linked to forum posts
- **Search Functionality** across all content

### Store
- **Product Catalog** with images and descriptions
- **Category Filtering** for easy browsing
- **Shopping Cart** functionality
- **Purchase History** for logged-in users
- **Responsive Product Grid**

### User Profiles
- **Avatar Upload** with instant preview
- **Display Name** customization
- **Purchase History** viewing
- **Forum Post History**
- **Account Settings** management

## 🔧 Customization

### Branding
- Replace logo in `public/logo.jpg`
- Update banner in `public/banner.jpg`
- Modify colors in `tailwind.config.ts`
- Update server info in components

### Server Integration
- Modify server IP in `ServerStats.tsx`
- Connect real server API for live stats
- Integrate with Minecraft server plugins

## 📱 Mobile Responsiveness

- **Mobile-First Design** approach
- **Touch-Friendly** buttons and interactions
- **Optimized Navigation** with collapsible menu
- **Responsive Images** with proper scaling
- **Fast Loading** on mobile networks

## 🚀 Production Deployment

### Quick Deployment Guide

1. **Database Setup**
   ```sql
   -- Run in Supabase SQL editor for optimal performance
   -- See database_indexes.sql for complete index setup
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_username_trgm 
   ON user_profiles USING gin(username gin_trgm_ops);
   ```

2. **Environment Configuration**
   ```bash
   # Set in your hosting platform (Vercel, Netlify, etc.)
   VITE_SUPABASE_URL=your_production_url
   VITE_SUPABASE_ANON_KEY=your_production_key
   VITE_APP_ENV=production
   ```

3. **Build & Deploy**
   ```bash
   npm run build    # Generates optimized production build
   npm run preview  # Test production build locally (optional)
   ```

4. **Performance Verification**
   ```bash
   node verify-setup.js  # Automated verification script
   ```

### Recommended Platforms
- **Vercel** (automatic optimization, edge functions)
- **Netlify** (global CDN, serverless functions)
- **Railway** (full-stack deployment with database)
- **Digital Ocean** (VPS hosting for advanced configurations)

### Performance Metrics
```
Bundle Analysis:
├── Main Bundle:     161.57 kB (was 776.47 kB) - 79% reduction
├── Admin Panel:     115.71 kB (lazy loaded)
├── Vendor Bundle:   141.87 kB (React, libraries)
├── Supabase:        124.50 kB (database client)
└── UI Components:   102.74 kB (shared components)

Expected Performance:
├── First Contentful Paint: 40-50% improvement
├── Largest Contentful Paint: 50-60% improvement
└── Time to Interactive: 45-55% improvement
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎯 Roadmap

### ✅ Recently Completed
- [x] **Enterprise Security Implementation** - CSP headers, input validation, XSS protection
- [x] **Performance Optimization** - 79% bundle size reduction, code splitting
- [x] **Image Optimization** - Compression and lazy loading utilities  
- [x] **Performance Monitoring** - Web Vitals tracking and analytics
- [x] **Database Optimization** - Performance indexes and query optimization
- [x] **Production Deployment Guide** - Complete setup and verification tools

### 🚧 In Progress / Planned
- [ ] Payment integration (Stripe/PayPal)
- [ ] Real-time chat system
- [ ] Advanced analytics dashboard
- [ ] Mobile app development
- [ ] Plugin marketplace
- [ ] API documentation
- [ ] Multi-language support
- [ ] Advanced caching strategies
- [ ] Automated testing suite

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Join our Discord server
- Email: support@mythicpvp.net

## 🙏 Acknowledgments

- **shadcn/ui** for beautiful UI components
- **Supabase** for backend infrastructure
- **Tailwind CSS** for styling system
- **Lucide** for icon library
- **React Router** for routing
- **Vite** for build tooling

---

## 🎮 Minecraft Background Customization

The homepage features a dynamic Minecraft-themed background system that's easy to customize:

### Quick Setup
1. **Add your Minecraft screenshot**: Save as `public/minecraft-background.jpg`
2. **Use the generator**: Open `generate-background.html` for a quick placeholder
3. **Configure settings**: Edit `src/config/background.ts` for advanced options

### Features
- **🖼️ Easy Image Replacement** - Single file update changes the entire homepage
- **📱 Responsive Design** - Automatically adapts to all screen sizes
- **🔄 Fallback System** - Graceful degradation if images fail to load
- **⚡ Performance Optimized** - Lazy loading and compression support
- **🎨 Overlay Control** - Adjustable gradients for text readability

### Image Requirements
- **Resolution**: 1920x1080+ (2560x1440 recommended)
- **Format**: JPG, PNG, or WebP
- **Size**: Under 500KB for optimal loading
- **Content**: High-contrast Minecraft landscapes work best

### Configuration
```typescript
// src/config/background.ts
export const BACKGROUND_CONFIG = {
  IMAGE_URL: '/minecraft-background.jpg', // Change this!
  ALTERNATIVE_IMAGES: [
    '/minecraft-landscape-1.jpg',
    '/minecraft-cityscape.jpg'
  ]
```

**Made with ❤️ for the Minecraft community**

Server IP: `play.mythicpvp.net`  
Discord: `discord.gg/mythicpvp`
};