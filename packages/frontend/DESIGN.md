# TruthTalent Landing Page - Design Overview

## Visual Identity

### 🎨 Design Philosophy
**"Transparent Futures"** - A bold, futuristic aesthetic that combines glassmorphism with dynamic motion to represent transparency and innovation in hiring.

### Key Visual Elements

#### 1. **Logo & Branding**
- Typography: ORBITRON (ultra-bold, futuristic)
- Name: "TRUTHTALENT" with animated glowing accent
- Style: Uppercase, tracking-tighter, massive scale (8xl on desktop)

#### 2. **Color System**

**Dark Mode (Default):**
```
Background: Mesh gradient (black base)
  - Cyan radial overlay (20% opacity, top-left)
  - Purple radial overlay (15% opacity, bottom-right)
  - Blue radial overlay (10% opacity, mid-left)
  
Employee Accent: #FF6B6B (Warm coral red)
Recruiter Accent: #00D9FF (Electric cyan)
Glass: rgba(15,15,20,0.7) + 20px blur
```

**Light Mode:**
```
Background: Paper texture (#FAFAFA base)
  - Red radial overlay (10% opacity)
  - Orange radial overlay (10% opacity)
  - Subtle grid pattern overlay
  
Same accent colors
Glass: rgba(255,255,255,0.75) + 20px blur
```

#### 3. **Glassmorphism Card**
- Max-width: 672px (2xl)
- Padding: 40px
- Border-radius: 24px (3xl)
- Border: 1px solid white/18% (dark) or black/8% (light)
- Shadow: 2xl for depth
- Backdrop blur: 20px

#### 4. **Role Toggle Mechanism**

```
[EMPLOYEE] ⟺ [RECRUITER]
```

- Two large pill buttons
- Active state: Full color background + shadow glow
- Inactive state: Semi-transparent + reduced opacity text
- Center icon: ⟺ (bidirectional arrow)
- Below: Dynamic description text (fades on change)

#### 5. **Content Transitions**
- AnimatePresence mode: "wait"
- Fade + slide animation (20px)
- Duration: 400ms
- All content changes when role toggles

#### 6. **Background Orbs**
- Two large blurred circles (384px)
- Continuous float animation (20-25s)
- Colors match role accent
- 20% opacity
- Creates depth and atmosphere

#### 7. **Feature Grid**
- 2x2 grid layout
- Each card: Semi-transparent with border
- Rounded corners (xl)
- Hover states: Subtle scale
- Typography: Outfit font, medium weight

#### 8. **CTA Button**
- Full-width, highly prominent
- Accent color background (changes with role)
- Font: Orbitron bold
- Hover: Scale + vertical lift + shadow glow
- Arrow indicator: →

#### 9. **Theme Toggle Button**
- Fixed position: top-right
- Round pill shape
- Icons: ☀️ (light) / 🌙 (dark)
- Font: Orbitron semibold
- Glass effect matching theme

#### 10. **Footer Badge**
- Centered below main card
- Glass pill shape
- Text: "Powered by AI • Verified Skills • Transparent Hiring"
- Delayed entrance (1s)

### Animation Choreography

**Page Load Sequence:**
1. Logo scales in (0s, 600ms duration)
2. Theme toggle fades down (200ms delay)
3. Glass card slides up (300ms delay)
4. Feature cards stagger in (100ms intervals)
5. Footer badge fades in (1s delay)

**Background:**
- Grain texture overlay (always present, 5% opacity)
- Floating orbs (infinite loop, ease-in-out)

**Interactions:**
- All buttons: Hover scale (1.05)
- CTA: Hover scale (1.02) + lift (y: -2px)
- Role toggle: Smooth color transitions (300ms)
- Theme change: 700ms fade between backgrounds

### Typography Hierarchy

```
H1 (Logo): 96px (8xl) | Orbitron Black | tracking-tighter
H2 (Title): 48px (5xl) | Orbitron Bold | with glow effect (dark mode)
Subtitle: 18px (lg) | Outfit Regular | 80% opacity
Buttons: 18-20px (lg-xl) | Orbitron Bold | tracking-wide
Body: 14px (sm) | Outfit Medium | 70-90% opacity
Badge: 14px (sm) | Outfit Regular | 80% opacity
```

### Responsive Breakpoints

- Mobile (< 768px): Logo 6xl, Title 4xl, Single column features
- Desktop (>= 768px): Logo 8xl, Title 5xl, Grid layout

### Accessibility

- Dark mode default (reduced eye strain)
- High contrast ratios (WCAG AAA)
- Semantic HTML structure
- Keyboard navigable
- Screen reader friendly labels
- Prefers-reduced-motion support (via Framer Motion)

### Distinctive Features (Anti-Generic)

✅ **Custom font pairing** (Orbitron + Outfit)
✅ **Dual theme with distinct aesthetics** (not just color inversion)
✅ **Dynamic role-based content** (not static)
✅ **Floating animated orbs** (depth & movement)
✅ **Grain texture overlay** (analog feel)
✅ **Mesh gradients** (not flat colors)
✅ **Staggered animations** (choreographed entrance)
✅ **Glow effects on text** (cyberpunk influence)
✅ **Bidirectional toggle** (unique interaction)
✅ **Paper texture in light mode** (tactile quality)

## Implementation Notes

- All animations hardware-accelerated (transform, opacity)
- CSS variables for theme consistency
- Framer Motion for complex orchestration
- Tailwind utilities for rapid styling
- Client-side rendering for dynamic state
- Production-optimized build (tree-shaking, code splitting)

---

**Design Inspiration:** Cyberpunk interfaces, Apple's frosted glass, Paper.js texture, Stripe's gradient meshes
**Target Emotion:** Trust through transparency, Innovation, Confidence, Professionalism
**Memorable Element:** The glowing animated orbs + role toggle mechanism
