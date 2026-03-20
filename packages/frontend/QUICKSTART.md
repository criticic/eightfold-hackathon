# 🚀 Quick Start Guide

## View the Landing Page

```bash
cd packages/frontend
bun dev
```

Then open http://localhost:3000 in your browser.

## What You'll See

### Dark Mode (Default)
- Black background with cyan/purple gradient mesh
- Floating animated orbs
- Frosted glass card in center
- TRUTHTALENT logo at top
- Theme toggle button (top-right)

### Try These Interactions

1. **Toggle User Role**: Click EMPLOYEE ↔ RECRUITER
   - Watch content transition smoothly
   - Notice accent color changes (red → cyan)
   - See different features and CTA text

2. **Switch Theme**: Click the theme button (top-right)
   - Dark → Light: Paper texture appears
   - Light → Dark: Mesh gradient returns
   - All animations remain smooth

3. **Hover Effects**:
   - Hover over buttons → Scale up
   - Hover over CTA → Lift effect + glow
   - Hover over theme toggle → Background change

## Tech Stack Overview

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS 4 |
| Animation | Framer Motion |
| Auth | Better-Auth |
| Runtime | Bun |
| Language | TypeScript |

## File Structure (Key Files)

```
packages/frontend/
├── app/
│   ├── page.tsx              ← Entry point
│   ├── layout.tsx            ← Theme wrapper
│   └── globals.css           ← Custom styles
├── components/
│   ├── LandingPage.tsx       ← Main UI component ⭐
│   └── ThemeProvider.tsx     ← Theme state
└── lib/
    └── auth-client.ts        ← Auth hooks
```

## Customization Quick Tips

### Change Accent Colors
Edit `tailwind.config.ts` line 16-19:
```typescript
accent: {
  dark: "#00D9FF",  // Recruiter color
  light: "#FF6B6B", // Employee color
}
```

### Adjust Glass Blur
Edit `app/globals.css` line 24:
```css
backdrop-filter: blur(20px); /* Increase/decrease */
```

### Modify Animations
Edit `components/LandingPage.tsx`:
- Search for `animate={` to find motion props
- Adjust `duration`, `delay`, `ease` values

## Environment Variables

Create `.env.local`:
```bash
# Optional: OAuth providers
GITHUB_CLIENT_ID=your_id
GITHUB_CLIENT_SECRET=your_secret
GOOGLE_CLIENT_ID=your_id
GOOGLE_CLIENT_SECRET=your_secret

# API URL
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Build for Production

```bash
bun run build
bun start
```

## Troubleshooting

**Port 3000 already in use?**
```bash
bun dev -- -p 3001  # Use different port
```

**Animations not smooth?**
- Check GPU acceleration in browser settings
- Reduce motion if needed (will respect prefers-reduced-motion)

**Database error in console?**
- This is expected (better-auth not yet configured)
- Doesn't affect landing page functionality

## Next Steps

1. ✅ Landing page is complete
2. 🔄 Integrate with backend API
3. 🔄 Set up database for auth
4. 🔄 Create dashboard pages
5. 🔄 Add protected routes

---

**Questions?** Check README.md for detailed docs
**Design Details?** See DESIGN.md for full spec
