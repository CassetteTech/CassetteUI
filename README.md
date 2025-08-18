# Cassette - Next.js Version

A modern music social platform built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui. Share your favorite music across all platforms and connect with friends.

## 🚀 Features

- **Music Link Conversion**: Convert music links between Spotify, Apple Music, and Deezer
- **Social Sharing**: Share your favorite tracks, albums, and playlists
- **User Profiles**: Create personalized music profiles
- **Music Discovery**: Discover trending music and new releases
- **Cross-Platform**: Responsive design for all devices
- **Authentication**: Secure authentication with email/password and OAuth providers

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **API State**: TanStack Query (React Query)
- **Backend**: Supabase
- **Authentication**: Supabase Auth
- **Forms**: React Hook Form with Zod validation

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd cassette-nextjs
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Fill in your environment variables in `.env.local`:

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

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── auth/              # Authentication pages
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── features/          # Feature-specific components
│   ├── layout/            # Layout components
│   └── ui/                # Reusable UI components (shadcn/ui)
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions and configurations
├── providers/             # React context providers
├── services/              # API and external service integrations
├── stores/                # Zustand state stores
└── types/                 # TypeScript type definitions
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Adding New Components

Use shadcn/ui to add new components:

```bash
npx shadcn@latest add [component-name]
```

### API Integration

The app integrates with the existing Cassette backend API. All API calls are handled through the `apiService` in `src/services/api.ts`.

### State Management

- **Auth State**: Managed with Zustand in `src/stores/auth-store.ts`
- **Music State**: Managed with Zustand in `src/stores/music-store.ts`
- **Server State**: Managed with TanStack Query hooks in `src/hooks/`

## 🔐 Authentication

The app supports multiple authentication methods:

- Email/Password authentication via Supabase
- OAuth providers (Google, Apple) via Supabase Auth
- Automatic session management and token refresh

## 🎵 Music Integration

Supports music platform integration with:

- **Spotify**: Track, album, artist, and playlist support
- **Apple Music**: Full catalog integration
- **Deezer**: Music discovery and sharing

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set up environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The app can be deployed to any platform that supports Node.js:

- **Netlify**: Use `@netlify/plugin-nextjs`
- **Railway**: Direct Next.js support
- **DigitalOcean App Platform**: Node.js app deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## 🎯 Migration from Flutter

This Next.js version maintains feature parity with the original Flutter app while adding:

- **Better SEO**: Server-side rendering and meta tags
- **Web-first Design**: Optimized for web browsers
- **Modern React Patterns**: Hooks, suspense, and concurrent features
- **TypeScript**: Full type safety throughout the application
- **Improved Performance**: Code splitting and optimizations

## 🔮 Future Enhancements

- [ ] Progressive Web App (PWA) support
- [ ] Real-time notifications
- [ ] Advanced music recommendations
- [ ] Social features (following, comments)
- [ ] Music player integration
- [ ] Mobile app using React Native
