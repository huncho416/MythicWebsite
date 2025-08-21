# MythicPvP Website

A complete, modern Minecraft server website with full admin panel built with React, TypeScript, Tailwind CSS, and Supabase.

![MythicPvP Banner](public/banner.jpg)

## 🎮 Features

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
- **Build Tool**: Vite
- **Package Manager**: npm

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
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Build for production**
   ```bash
   npm run build
   ```

## 📁 Project Structure

```
src/
├── components/
│   ├── admin/              # Admin panel components
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
├── pages/                  # Route pages
│   ├── Index.tsx           # Homepage
│   ├── Admin.tsx           # Admin panel
│   ├── Forums.tsx          # Forum listing
│   ├── Store.tsx           # Store page
│   └── ...
├── integrations/
│   └── supabase/           # Database integration
├── hooks/                  # Custom React hooks
└── lib/                    # Utility functions
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

## 🚀 Deployment

### Recommended Platforms
- **Vercel** (automatic deployments from GitHub)
- **Netlify** (easy static site hosting)
- **Railway** (full-stack deployment)
- **Digital Ocean** (VPS hosting)

### Environment Setup
1. Connect your GitHub repository
2. Set environment variables
3. Configure build commands
4. Deploy automatically on push

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎯 Roadmap

- [ ] Payment integration (Stripe/PayPal)
- [ ] Real-time chat system
- [ ] Advanced analytics dashboard
- [ ] Mobile app development
- [ ] Plugin marketplace
- [ ] API documentation
- [ ] Multi-language support

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

**Made with ❤️ for the Minecraft community**

Server IP: `play.mythicpvp.net`  
Discord: `discord.gg/mythicpvp`
