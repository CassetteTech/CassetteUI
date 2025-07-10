# Cassette Project - Development Guide

## 🎨 Theme System
**ALWAYS** check `src/lib/theme.ts` for all available colors before making any color changes. This file is the single source of truth for the design system.

### Dark/Light Mode
- The theme system automatically handles dark/light mode through CSS variables
- Use semantic classes like `bg-background`, `text-foreground`, `text-muted-foreground`
- **NEVER** use manual dark mode classes like `dark:bg-gray-900` or `text-white dark:text-black`
- **NEVER** use hardcoded hex colors (`#123456`) or generic grays (`text-gray-500`)

## 📱 Responsive Design
This project has **very different** mobile vs desktop layouts. Always consider both:

### Mobile-First Approach
- Many components stack vertically on mobile but are side-by-side on desktop
- Navigation patterns change significantly between breakpoints
- Always test responsive behavior when making layout changes

### Key Breakpoints
- `sm:` (640px) - Small mobile to tablet
- `md:` (768px) - Tablet  
- `lg:` (1024px) - Desktop (major layout shifts happen here)
- `xl:` (1280px) - Large desktop

## 🎵 Music Platform Integration
- Supports Spotify, Apple Music, and Deezer links
- Uses external APIs for music search and conversion
- Always handle loading states and error cases for music-related features

## 🧩 Component Architecture
- Uses shadcn/ui as the base component library
- Custom components in `src/components/ui/` (AnimatedButton, UrlBar, etc.)
- Feature-specific components in `src/components/features/`
- Consistent typography components for brand voice

## 🚨 Common Gotchas
- Search results positioning differs dramatically between mobile/desktop
- Auth pages need careful theming (no manual dark mode)
- AnimatedButton component has specific color prop patterns
- Images should use Next.js `<Image />` component, not `<img>`

## 📁 Key Files
- `src/lib/theme.ts` - Complete design system
- `src/app/globals.css` - CSS variables and dark/light mode
- `tailwind.config.js` - Theme mappings
- `src/components/ui/typography.tsx` - Text component patterns