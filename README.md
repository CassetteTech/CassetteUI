# Cassette Frontend - Next.js Application

*Modern music sharing platform with cross-platform integration*

## 🎵 Overview

The Cassette Frontend is a comprehensive Next.js 15 application that serves as the primary user interface for the Cassette music platform. Built with server-side rendering capabilities and optimized for performance, it provides seamless music sharing and discovery across multiple streaming platforms.

## ✨ Key Features

### Core Functionality
- **Cross-Platform Music Conversion**: Convert links between Spotify, Apple Music, and Deezer
- **Social Music Sharing**: Share tracks, albums, artists, and playlists with friends
- **Personalized Profiles**: Create custom music profiles with `/@username` URLs
- **Music Discovery**: Trending charts, search, and recommendations
- **Audio Preview**: In-app music playback with streaming platform integration
- **Real-time Updates**: Live activity feeds and social interactions

### User Experience
- **Responsive Design**: Mobile-first approach with desktop optimization
- **Progressive Enhancement**: Works without JavaScript
- **Dark/Light Mode**: Automatic theme switching with user preference
- **Accessibility**: WCAG compliant with Atkinson Hyperlegible font
- **SEO Optimized**: Server-side rendering for search engines

## 🏗️ Architecture

### Core Technology Stack
- **Framework**: Next.js 15.3.5 with App Router
- **Runtime**: React 19.0.0 with Server Components
- **Language**: TypeScript 5 with full type safety
- **Build Tool**: Turbopack for development, optimized production builds

### Styling & Design System
- **CSS Framework**: Tailwind CSS 3.4.17 with utility-first approach
- **UI Components**: shadcn/ui built on Radix UI primitives
- **Design System**: Custom Cassette branding with CSS custom properties
- **Typography**: Multi-font system (Inter, Roboto Flex, Atkinson Hyperlegible, Teko)
- **Animations**: Framer Motion 12.23.0 for smooth interactions

### State & Data Management
- **Client State**: Zustand 5.0.6 (lightweight, TypeScript-first)
- **Server State**: TanStack Query 5.81.5 with intelligent caching
- **Form State**: React Hook Form 7.59.0 with Zod 3.25.74 validation
- **Real-time**: Supabase subscriptions for live updates

### Backend & Authentication
- **Database**: Supabase 2.50.3 (PostgreSQL with real-time capabilities)
- **Authentication**: Supabase Auth + NextAuth 4.24.11
- **OAuth Providers**: Google, Apple Music, Spotify integration
- **API Integration**: Cassette Lambda microservices for music platform APIs

## 🚀 Quick Start

### Prerequisites
- **Node.js**: Version 18+ (recommended: latest LTS)
- **npm**: Version 8+ (comes with Node.js)
- **Git**: For version control

### Installation & Setup

1. **Clone Repository**
```bash
git clone <repository-url>
cd cassette-nextjs
```

2. **Install Dependencies**
```bash
npm install
```

3. **Environment Configuration**
```bash
cp .env.local.example .env.local
```

4. **Configure Environment Variables**
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Music API Configuration
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
APPLE_MUSIC_DEVELOPER_TOKEN=your_apple_music_token
APPLE_MUSIC_KEY_ID=your_apple_music_key_id
APPLE_MUSIC_TEAM_ID=your_apple_music_team_id
APPLE_MUSIC_PRIVATE_KEY=your_apple_music_private_key

# Backend API Configuration
NEXT_PUBLIC_API_URL=https://563jznpk5k.execute-api.us-east-1.amazonaws.com/Dev
NEXT_PUBLIC_API_URL_LOCAL=http://localhost:5173

# Feature Flags
ENABLE_LAMBDA_WARMUP=false

# App Configuration
NEXT_PUBLIC_APP_DOMAIN=https://cassetteinc.org
```

5. **Start Development Server**

`npm run dev` or `npx next dev`

6. **Open Application**
Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

### App Router Architecture (Next.js 15)
```
src/
├── app/                           # Next.js App Router pages
│   ├── (auth)/                   # Authentication route group
│   │   ├── auth/signin/          # Sign-in page
│   │   ├── auth/signup/          # Sign-up page
│   │   ├── auth/callback/        # OAuth callbacks
│   │   └── login/                # Alternative login
│   ├── (profile)/                # Profile route group
│   │   └── profile/
│   │       ├── [username]/       # Dynamic user profiles
│   │       └── edit/             # Profile editing
│   ├── (content)/                # Content route group
│   │   ├── artist/[id]/          # Artist pages
│   │   ├── track/[id]/           # Track pages
│   │   ├── collections/          # User collections
│   │   └── add-music/            # Music addition
│   ├── (marketing)/              # Marketing pages
│   │   ├── about/
│   │   ├── privacy/
│   │   └── terms/
│   ├── api/                      # API routes
│   │   ├── auth/spotify/         # Spotify OAuth
│   │   ├── music/                # Music endpoints
│   │   └── user/                 # User management
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   ├── error.tsx                 # Error boundary
│   └── globals.css               # Global styles
├── components/                    # React components
│   ├── features/                 # Feature-specific components
│   │   ├── profile/              # Profile management
│   │   ├── music/                # Music playback & connections
│   │   ├── conversion/           # Music platform conversion
│   │   ├── entity/               # Music entity display
│   │   └── collection/           # Collection management
│   ├── layout/                   # Layout components
│   │   ├── navbar.tsx            # Navigation
│   │   ├── footer.tsx            # Footer
│   │   └── app-sidebar.tsx       # Sidebar navigation
│   ├── ui/                       # shadcn/ui components
│   │   ├── button.tsx            # Button variants
│   │   ├── form.tsx              # Form system
│   │   ├── avatar.tsx            # User avatars
│   │   └── [...]                 # Additional UI primitives
│   ├── auth/                     # Authentication components
│   └── onboarding/               # User onboarding flow
├── hooks/                        # Custom React hooks
│   ├── use-auth.ts               # Authentication hooks
│   ├── use-music.ts              # Music data hooks
│   ├── use-debounce.ts           # Debouncing utility
│   └── use-mobile.ts             # Mobile detection
├── stores/                       # Zustand state management
│   ├── auth-store.ts             # Authentication state
│   └── music-store.ts            # Music playback state
├── services/                     # API integrations
│   ├── api.ts                    # Main API client
│   ├── auth.ts                   # Authentication service
│   ├── music.ts                  # Music platform APIs
│   ├── profile.ts                # Profile management
│   └── music-apis/               # Platform-specific APIs
│       ├── spotify.ts            # Spotify integration
│       ├── apple-music.ts        # Apple Music integration
│       └── music-search.ts       # Unified search
├── types/                        # TypeScript definitions
│   ├── index.ts                  # Core types
│   └── music-api.ts              # Music API types
├── lib/                          # Utilities & configuration
│   ├── supabase.ts               # Supabase client
│   ├── utils.ts                  # General utilities
│   └── theme.ts                  # Theme configuration
└── providers/                    # React context providers
    ├── auth-provider.tsx         # Authentication context
    ├── theme-provider.tsx        # Theme switching
    └── providers.tsx             # Combined providers
```

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev                # Start development server (standard)
npm run dev --turbopack    # Start with Turbopack (faster)

# Production
npm run build             # Create production build
npm run start             # Start production server

# Code Quality
npm run lint              # Run ESLint
npm run lint -- --fix    # Fix ESLint issues automatically
npx tsc --noEmit         # TypeScript type checking
```

### Development Features

#### Turbopack Development
- **Faster Builds**: Up to 5x faster than Webpack
- **Hot Reload**: Instant updates on file changes
- **Better Error Messages**: Enhanced debugging experience
- **Experimental**: Stable for development use

#### Hot Reload & Fast Refresh
- **Component State**: Preserved during updates when possible
- **Error Recovery**: Automatic recovery from runtime errors  
- **CSS Updates**: Instant styling changes
- **TypeScript**: Full type checking during development

### Component Development

#### Adding shadcn/ui Components
```bash
# Add individual components
npx shadcn@latest add button
npx shadcn@latest add form
npx shadcn@latest add avatar

# Add multiple components
npx shadcn@latest add button form avatar card
```

#### Component Patterns
```typescript
// Feature component example
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuthState } from '@/hooks/use-auth';

interface ComponentProps {
  title: string;
  onAction: () => void;
}

export function FeatureComponent({ title, onAction }: ComponentProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuthState();
  
  return (
    <div className="feature-component">
      <h2 className="text-2xl font-bold">{title}</h2>
      <Button onClick={onAction} disabled={loading}>
        {loading ? 'Loading...' : 'Action'}
      </Button>
    </div>
  );
}
```

### State Management Architecture

#### Client State (Zustand)
```typescript
// Auth State
const { user, isAuthenticated, setUser, signOut } = useAuthStore();

// Music State  
const { currentTrack, isPlaying, searchResults, setCurrentTrack } = useMusicStore();
```

#### Server State (TanStack Query)
```typescript
// Data fetching with caching
const { data: profile, isLoading, error } = useProfile(username);

// Mutations with optimistic updates
const updateProfile = useUpdateProfile();
await updateProfile.mutateAsync(newData);
```

#### Form State (React Hook Form + Zod)
```typescript
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: { ... }
});

const onSubmit = form.handleSubmit(async (data) => {
  // Form submission logic
});
```

### API Integration

#### Backend Services
- **Primary API**: AWS App Runner backend
- **Lambda Microservices**: Music platform integrations
- **Supabase**: Database and real-time features
- **Music APIs**: Spotify, Apple Music, Deezer

#### Service Architecture
```typescript
// API client structure
src/services/
├── api.ts              # Main API client
├── auth.ts             # Authentication service
├── music.ts            # Music operations
├── profile.ts          # Profile management
└── music-apis/         # Platform-specific APIs
    ├── spotify.ts      # Spotify Web API
    ├── apple-music.ts  # MusicKit JS integration
    └── music-search.ts # Unified search
```

## 🔐 Authentication

### Multi-Provider Authentication System
- **Email/Password**: Supabase Auth with secure password handling
- **OAuth Providers**: Google and Apple integration via Supabase Auth
- **Session Management**: Automatic token refresh and secure storage
- **Route Protection**: Client and server-side authentication guards

### Authentication Flow
```typescript
// Sign in with email/password
const { mutate: signIn } = useSignIn();
signIn({ email, password });

// OAuth provider sign in
const { mutate: signInWithProvider } = useSignInWithProvider();
signInWithProvider('google');

// Authentication state
const { user, isAuthenticated, isLoading } = useAuthState();
```

## 🎵 Music Platform Integration

### Supported Platforms
- **Spotify**: Full Web API integration with OAuth 2.0
  - Track, album, artist, playlist data
  - User library access and playlist creation
  - Audio preview and metadata
- **Apple Music**: MusicKit JS integration with developer tokens
  - Catalog search and browsing
  - User library and playlist management
  - Cross-platform link conversion
- **Deezer**: Public API with OAuth for user features
  - Music discovery and search
  - Playlist creation and management
  - Rate-limited requests for optimal performance

### Music Features
```typescript
// Search across platforms
const { data: searchResults } = useMusicSearch(query);

// Get track details
const { data: track } = useTrack(trackId);

// Convert between platforms
const convertedLinks = await convertMusicLinks(originalUrl);
```

## 🚀 Deployment

### Vercel Deployment (Recommended)

#### 1. Repository Setup
```bash
# Push to GitHub
git add .
git commit -m "Ready for deployment"
git push origin main
```

#### 2. Vercel Configuration
1. Connect GitHub repository to Vercel
2. Configure environment variables in dashboard
3. Set build command: `npm run build`
4. Set output directory: `.next`
5. Deploy

#### 3. Environment Variables (Production)
```env
NEXT_PUBLIC_SUPABASE_URL=production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=production_anon_key
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=production_secret
NEXT_PUBLIC_API_URL=https://production-api-url.com
```

### Alternative Deployment Options

#### Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=.next
```

#### Docker Deployment
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "start"]
```

#### AWS Amplify
```bash
npm install -g @aws-amplify/cli
amplify init
amplify add hosting
amplify publish
```

### Performance Optimizations

#### Build Optimizations
- **Automatic Code Splitting**: Per-route bundles
- **Tree Shaking**: Unused code elimination
- **Image Optimization**: Next.js Image component
- **Font Optimization**: Google Fonts preloading
- **Bundle Analysis**: Size monitoring and optimization

#### Runtime Performance
- **Server Components**: Reduced client-side JavaScript
- **Streaming**: Progressive page loading
- **Caching**: Intelligent data caching with TanStack Query
- **Lazy Loading**: Component-level code splitting

## 🛠️ Troubleshooting

### Common Development Issues

#### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Clear and reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Type checking
npx tsc --noEmit
```

#### Environment Issues
```bash
# Verify environment variables
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"

# Debug environment loading
npm run dev -- --debug
```

#### Port Conflicts
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Use different port
npm run dev -- --port 3001
```

### Performance Issues
```bash
# Bundle analysis
ANALYZE=true npm run build

# Memory profiling
node --inspect npm run dev

# Performance profiling
npm run dev -- --experimental-profiling
```

## 🎯 Design System

### Brand Colors
- **Primary Red**: `#ED2748` (Brand identity)
- **Cream Background**: `#F8F0DE` (Light mode background)
- **Black Text**: `#1F2327` (Primary text color)
- **Success Green**: `#1ED760` (Spotify-inspired success)
- **Info Blue**: `#0093FF` (Information and links)

### Typography Scale
- **Display**: Teko (Headlines and display text)
- **Body**: Roboto Flex (Primary body text)
- **Accessible**: Atkinson Hyperlegible (Accessibility-focused)
- **System**: Inter (Default sans-serif)

### Responsive Breakpoints
- **Mobile**: 320px - 767px
- **Tablet**: 768px - 1023px  
- **Desktop**: 1024px - 1439px
- **Large Desktop**: 1440px+

## 🤝 Contributing

1. **Fork Repository**
```bash
git clone https://github.com/your-username/cassette-frontend.git
cd cassette-frontend
```

2. **Create Feature Branch**
```bash
git checkout -b feature/music-player-enhancement
```

3. **Development Setup**
```bash
npm install
cp .env.local.example .env.local
npm run dev --turbopack
```

4. **Code Quality**
```bash
npm run lint              # Check code quality
npm run lint -- --fix    # Fix issues
npx tsc --noEmit         # Type checking
```

5. **Commit Changes**
```bash
git add .
git commit -m "feat: add music player controls"
git push origin feature/music-player-enhancement
```

6. **Submit Pull Request**
- Create PR with clear description
- Include screenshots for UI changes
- Ensure all tests pass
- Request review from maintainers

## 🎯 Migration from Flutter

This Next.js version represents a complete rewrite with enhanced capabilities:

### Added Benefits
- **SEO Optimization**: Server-side rendering with meta tags
- **Web Performance**: Optimized for web browsers with lighthouse scores
- **Modern Architecture**: Latest React patterns with Server Components
- **Type Safety**: Full TypeScript coverage throughout application
- **Developer Experience**: Hot reload, better debugging, modern tooling

### Maintained Features
- **Cross-platform music conversion**
- **User profiles and social sharing**
- **Music discovery and search**
- **Real-time updates and notifications**
- **Responsive design for all devices**

## 🔮 Roadmap

### Near Term (Q1-Q2)
- [ ] **Progressive Web App (PWA)**: Offline support and native app experience
- [ ] **Advanced Music Player**: In-app playback with queue management
- [ ] **Social Features**: Following, comments, and activity feeds
- [ ] **Real-time Notifications**: Live updates for social interactions

### Medium Term (Q3-Q4)
- [ ] **Machine Learning**: Personalized music recommendations
- [ ] **Creator Tools**: Playlist monetization and analytics
- [ ] **Enterprise Features**: White-label solutions and API access
- [ ] **Mobile Apps**: React Native iOS and Android applications

### Long Term (2025+)
- [ ] **AI Integration**: Smart music curation and discovery
- [ ] **Web3 Features**: NFT integration and decentralized features
- [ ] **Global Expansion**: Multi-language support and localization
- [ ] **Platform Partnerships**: Direct integration with streaming services

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Comprehensive docs in `/docs` folder
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Feature requests and questions via GitHub Discussions
- **Community**: Join our Discord for real-time support

---

**Built with ❤️ by the Cassette team**
