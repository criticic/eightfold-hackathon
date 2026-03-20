# TruthTalent Frontend

A stunning glassmorphism landing page built with Next.js, featuring role-based authentication and dual-theme support.

## Features

### Design Excellence
- **Glassmorphism UI**: Beautiful frosted glass effects with backdrop blur
- **Dual Theme Support**: 
  - Dark mode: Mesh gradient with glowing accents
  - Light mode: Paper texture with minimal glassmorphism
- **Custom Typography**: Orbitron (display) + Outfit (body) fonts
- **Smooth Animations**: Powered by Framer Motion
- **Floating Orbs**: Dynamic background animations
- **Grain Texture**: Subtle noise overlay for depth

### Functionality
- **Role Toggle**: Switch between Employee and Recruiter views
- **Theme Toggle**: Dark glassmorphism ↔ Light paper style
- **Better-Auth Integration**: Ready for authentication
- **Responsive Design**: Works on all devices
- **Production Ready**: Optimized build with Next.js 16

## Tech Stack

- **Framework**: Next.js 16.2 with App Router
- **Styling**: Tailwind CSS 4.2
- **Animations**: Framer Motion
- **Authentication**: Better-Auth
- **Runtime**: Bun
- **TypeScript**: Full type safety

## Getting Started

### Prerequisites
- Bun >= 1.3.5
- Node.js >= 18 (for better-auth)

### Installation

```bash
# Navigate to frontend directory
cd packages/frontend

# Install dependencies (already done)
bun install

# Start development server
bun dev
```

The app will be available at http://localhost:3000

### Build for Production

```bash
bun run build
bun start
```

## Project Structure

```
packages/frontend/
├── app/
│   ├── api/
│   │   └── auth/[...all]/   # Better-auth API routes
│   ├── globals.css          # Global styles & utilities
│   ├── layout.tsx           # Root layout with ThemeProvider
│   └── page.tsx             # Home page (wraps LandingPage)
├── components/
│   ├── LandingPage.tsx      # Main landing component
│   └── ThemeProvider.tsx    # Theme context provider
├── lib/
│   ├── auth.ts              # Better-auth server config
│   └── auth-client.ts       # Better-auth client hooks
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Design System

### Colors

**Dark Theme:**
- Primary: `#00D9FF` (Cyan) - Recruiter accent
- Secondary: `#FF6B6B` (Red) - Employee accent
- Background: Mesh gradient with radial overlays
- Glass: `rgba(15, 15, 20, 0.7)` with blur

**Light Theme:**
- Primary: `#00D9FF` (Cyan) - Recruiter accent
- Secondary: `#FF6B6B` (Red) - Employee accent
- Background: Paper texture with subtle grid
- Glass: `rgba(255, 255, 255, 0.75)` with blur

### Typography
- **Display**: Orbitron (headings, buttons, CTA)
- **Body**: Outfit (paragraphs, descriptions)

### Animations
- Float: 6s ease-in-out (floating orbs)
- Glow: 2s alternate (text glow effects)
- Slide-up: 0.6s (page load animations)

## Role-Based Content

### Employee View
- Title: "Land Your Dream Role"
- Features: Profile building, AI prep, skill tracking, connections
- Color: Red accent (`#FF6B6B`)
- CTA: "Apply Now"

### Recruiter View
- Title: "Find Your Next Star"
- Features: Candidate discovery, AI insights, collaboration, analytics
- Color: Cyan accent (`#00D9FF`)
- CTA: "Start Recruiting"

## Better-Auth Setup

The project includes better-auth configuration but requires database setup:

```bash
# Create .env.local with your credentials
cp .env.local.example .env.local

# Add OAuth credentials (optional)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_secret
```

## Customization

### Change Accent Colors
Edit `tailwind.config.ts`:
```typescript
colors: {
  accent: {
    dark: "#YOUR_COLOR",  // Recruiter
    light: "#YOUR_COLOR", // Employee
  }
}
```

### Adjust Glass Effects
Edit `app/globals.css`:
```css
.glass-dark {
  background: rgba(15, 15, 20, 0.7); /* Adjust opacity */
  backdrop-filter: blur(20px);       /* Adjust blur */
}
```

### Modify Animations
Edit `components/LandingPage.tsx` motion components or `tailwind.config.ts` keyframes.

## Performance

- **Bundle Size**: Optimized with Next.js tree-shaking
- **Animations**: Hardware-accelerated with Framer Motion
- **Fonts**: Loaded via Google Fonts with display=swap
- **Images**: Auto-optimized with Next.js Image component

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile: iOS Safari 14+, Chrome Android

## Contributing

This is a hackathon project. Feel free to fork and customize!

## License

MIT
