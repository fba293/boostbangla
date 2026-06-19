🎨 BoostBangla Design System v3.0 — Unified System Document

Single Source of Truth | Framework-Free | AI-Optimized | Enterprise-Grade
SECTION 1: SYSTEM ARCHITECTURE & REGISTRY
1.1 Global Project Overview

BoostBangla Premium Design System is a production-ready, zero-dependency UI framework built with vanilla HTML5, modern ES6+ JavaScript, and pure CSS3. Delivers Figma-quality interfaces with buttery-smooth 60fps animations.
Core Principles

    Calm Confidence — Every interaction feels intentional and premium

    Subtraction Over Addition — Every pixel earns its place

    Depth Through Layering — 1px inner borders + soft outer shadows + backdrop blur

    Motion as Feedback — Spring-based, 60fps response for every interaction

    Zero Paint Flashes — GPU-accelerated transitions (transform + opacity only)

Technology Stack
Layer	Technology	Version
Markup	HTML5	Living Standard
Styling	CSS3 (Custom Properties, Grid, Flexbox)	—
Logic	Vanilla JavaScript	ES2022+
Icons	Font Awesome 6 (optional CDN)	6.4+
Fonts	Google Fonts (Inter, Noto Sans Bengali)	—
Dependencies	ZERO	—
1.2 Folder Architecture Guidelines
text

boostbangla/
│
├── 📁 docs/                                    # Documentation
│   └── SYSTEM.md                               # THIS FILE — Complete documentation
│
├── 📁 public/                                  # Public web root
│   │
│   ├── 📁 assets/
│   │   │
│   │   ├── 📁 css/                             # Unified CSS (ONE file per purpose)
│   │   │   ├── global.css                      # MASTER: Tokens + reset + base + utilities
│   │   │   ├── components.css                  # Component styles (cards, buttons, badges)
│   │   │   ├── layout.css                      # Grids, containers, dashboard layout
│   │   │   ├── animations.css                  # Keyframes + transition presets
│   │   │   ├── dark-mode.css                   # Dark mode overrides
│   │   │   ├── mobile.css                      # Mobile-specific (bottom dock, touch)
│   │   │   └── admin.css                       # Admin panel specific styles
│   │   │
│   │   ├── 📁 js/                              # Unified JavaScript (ONE file per module)
│   │   │   │
│   │   │   ├── 📁 core/                        # Core system (always load first)
│   │   │   │   ├── theme.js                    # Dark mode + theme engine
│   │   │   │   ├── config.js                   # Firebase + API config
│   │   │   │   ├── auth.js                     # Authentication
│   │   │   │   ├── utils.js                    # Helpers (formatCurrency, dates)
│   │   │   │   ├── toast.js                    # Toast notifications
│   │   │   │   ├── modal.js                    # Modal + drawer manager
│   │   │   │   ├── shortcuts.js                # Keyboard shortcuts
│   │   │   │   ├── offline.js                  # Offline support + sync
│   │   │   │   └── validation.js               # Form validation
│   │   │   │
│   │   │   ├── 📁 ui/                          # UI Components (loaded on demand)
│   │   │   │   ├── sidebar.js                  # Dashboard sidebar
│   │   │   │   ├── header.js                   # Universal header
│   │   │   │   ├── notifications.js            # Notification dropdown
│   │   │   │   ├── skeleton.js                 # Skeleton loaders
│   │   │   │   └── virtual-scroller.js         # Performance scrolling
│   │   │   │
│   │   │   ├── 📁 api/                         # API integrations
│   │   │   │   ├── amarboost.js                # Triple API integration
│   │   │   │   ├── exchange-rate.js            # USD → BDT rate
│   │   │   │   └── search-worker.js            # Web worker for fuzzy search
│   │   │   │
│   │   │   ├── 📁 modules/                     # Page-specific (lazy loaded)
│   │   │   │   ├── dashboard.js
│   │   │   │   ├── orders.js
│   │   │   │   ├── new-order.js
│   │   │   │   ├── services.js
│   │   │   │   ├── add-funds.js
│   │   │   │   ├── transactions.js
│   │   │   │   ├── tickets.js
│   │   │   │   ├── account.js
│   │   │   │   ├── api-keys.js
│   │   │   │   ├── security.js
│   │   │   │   ├── affiliates.js
│   │   │   │   ├── refunds.js
│   │   │   │   ├── mass-order.js
│   │   │   │   ├── child-panel.js
│   │   │   │   ├── giveaway.js
│   │   │   │   └── updates.js
│   │   │   │
│   │   │   └── 📁 lib/                         # Third-party or standalone
│   │   │       ├── tour.js
│   │   │       ├── confetti.js
│   │   │       └── analytics.js
│   │   │
│   │   ├── 📁 data/                            # JSON configuration
│   │   │   ├── tokens.json
│   │   │   ├── site.config.json
│   │   │   └── components.json
│   │   │
│   │   ├── 📁 images/                          # Optimized images
│   │   │   ├── 📁 avatars/
│   │   │   ├── 📁 brand/
│   │   │   ├── 📁 icons/
│   │   │   ├── 📁 payments/
│   │   │   ├── 📁 qr/
│   │   │   └── 📁 testimonials/
│   │   │
│   │   └── 📁 fonts/                           # Self-hosted fonts (optional)
│   │
│   ├── 📁 pages/                               # HTML pages by route
│   │   ├── 📁 public/                          # Public pages (no auth)
│   │   ├── 📁 dashboard/                       # User dashboard (auth required)
│   │   └── 📁 admin/                           # Admin panel (admin auth)
│   │
│   ├── 📁 components/                          # Reusable HTML partials
│   │   ├── header.html
│   │   ├── sidebar.html
│   │   ├── footer.html
│   │   ├── notifications-dropdown.html
│   │   ├── user-menu.html
│   │   └── empty-state.html
│   │
│   └── 📁 php/                                 # Backend API endpoints
│       ├── config.php
│       ├── api-proxy.php
│       ├── exchange-rate.php
│       └── sync-orders.php
│
├── 📁 build/                                   # Build tools (dev only)
├── 📁 docker/                                  # Docker configuration
├── SYSTEM.md                                   # THIS FILE
└── .gitignore

1.3 Quick Start Guide
Step 1: Basic HTML Structure
html

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="theme-color" content="#FF6B00">
    <title>BoostBangla</title>
    
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Noto+Sans+Bengali:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Font Awesome (Optional) -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Core CSS -->
    <link rel="stylesheet" href="/assets/css/global.css">
    <link rel="stylesheet" href="/assets/css/components.css">
    <link rel="stylesheet" href="/assets/css/layout.css">
    <link rel="stylesheet" href="/assets/css/animations.css">
    <link rel="stylesheet" href="/assets/css/dark-mode.css">
    <link rel="stylesheet" href="/assets/css/mobile.css">
</head>
<body>
    <div class="app-container">
        <header class="nav-bar" data-component="header"></header>
        <main class="main-content">
            <!-- Your content here -->
        </main>
        <nav class="bottom-dock" data-component="bottom-nav"></nav>
    </div>
    
    <!-- Core JavaScript -->
    <script src="/assets/js/core/config.js"></script>
    <script src="/assets/js/core/theme.js"></script>
    <script src="/assets/js/core/utils.js"></script>
    <script src="/assets/js/core/toast.js"></script>
    <script src="/assets/js/core/auth.js"></script>
    <script src="/assets/js/core/validation.js"></script>
    <script src="/assets/js/core/shortcuts.js"></script>
    <script src="/assets/js/core/offline.js"></script>
    
    <!-- UI Components -->
    <script src="/assets/js/ui/header.js" defer></script>
    <script src="/assets/js/ui/sidebar.js" defer></script>
    <script src="/assets/js/ui/notifications.js" defer></script>
</body>
</html>

Step 2: Loading Order (Critical)
html

<!-- CSS Order - DO NOT CHANGE -->
1. global.css     (Tokens + reset + base + utilities)
2. components.css (Component styles)
3. layout.css     (Grids + containers)
4. animations.css (Keyframes + transitions)
5. dark-mode.css  (Dark mode overrides)
6. mobile.css     (Mobile-specific)

<!-- JS Order - DO NOT CHANGE -->
1. config.js      (App configuration)
2. theme.js       (Dark mode + theme engine)
3. utils.js       (Helper functions)
4. toast.js       (Notification system)
5. auth.js        (Authentication)
6. validation.js  (Form validation)
7. shortcuts.js   (Keyboard shortcuts)
8. offline.js     (Offline support)

Step 3: Deployment Prerequisites
Requirement	Specification
Web Server	Apache 2.4+, Nginx 1.18+, or any static server
PHP (optional)	7.4+ (for API proxy only)
HTTPS	Required for production (Service Workers)
Browser Support	Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
SECTION 2: AI AGENT MANIFESTO & SYSTEM PROMPTS
2.1 Role Definition

You are a Principal UI/UX Architect with 20+ years of experience. You build systems like Apple's HIG, Linear's precision, Stripe's clarity, and Figma's polish. Every line of code you generate is production-ready, flawless, and indistinguishable from world-class design engineering.
2.2 Strict Compliance Rules (Zero Exceptions)
Rule 1: Zero Dependencies
yaml

FORBIDDEN:
  - React, Vue, Angular, Svelte (any framework)
  - jQuery, Lodash, moment.js (any library)
  - Tailwind, Bootstrap, Material UI (any CSS framework)
  - Any external package manager (npm, yarn)

ALLOWED:
  - Vanilla HTML5
  - Modern ES6+ JavaScript
  - Pure CSS3
  - Font Awesome CDN (optional)
  - Google Fonts CDN

Rule 2: Semantic HTML5
html

✅ CORRECT:
<header><nav><main><section><article><aside><footer>
<button> for actions, <a href> for navigation
<label for="input-id"> properly associated

❌ INCORRECT:
<div class="header"><div class="nav">
<div onclick="handleClick()">
<div class="button" role="button">

Rule 3: CSS Architecture
yaml

REQUIRED:
  - Use CSS Custom Properties (var(--token)) for ALL design values
  - Use clamp() for fluid typography
  - Use CSS Grid + Flexbox exclusively (NO floats)
  - Use rem/em units (NOT px for typography)
  - Use transform + opacity for animations (GPU accelerated)
  - BEM naming convention for classes

FORBIDDEN:
  - Hardcoded colors, spacing, or fonts
  - !important (except utility overrides)
  - Inline styles (except dynamic JS values)
  - CSS @import (use <link> instead)

Rule 4: JavaScript Standards
javascript

✅ REQUIRED:
  - ES6+ syntax (const, let, arrow functions, template literals)
  - async/await for promises
  - Event delegation for dynamic elements
  - Intersection Observer for lazy loading
  - matchMedia for responsive JS
  - class syntax for components
  - try/catch error handling

❌ FORBIDDEN:
  - var keyword
  - document.write()
  - eval()
  - innerHTML with unsanitized user data
  - setInterval for animations (use requestAnimationFrame)

Rule 5: Design Token Enforcement

ALWAYS use these CSS variables — NEVER hardcode values:
css

/* Colors */
var(--primary-500), var(--primary-600)
var(--success), var(--warning), var(--error), var(--info)
var(--slate-50) through var(--slate-950)
var(--bg-primary), var(--bg-secondary), var(--bg-tertiary)
var(--text-primary), var(--text-secondary), var(--text-tertiary)
var(--border-primary), var(--border-secondary)

/* Spacing (8px grid) */
var(--space-0) through var(--space-48)

/* Typography */
var(--text-xs) through var(--text-5xl)
var(--leading-tight), var(--leading-normal), var(--leading-relaxed)

/* Border Radius */
var(--radius-sm) through var(--radius-3xl), var(--radius-full)

/* Shadows */
var(--shadow-xs) through var(--shadow-2xl)
var(--shadow-glass), var(--shadow-glow)

/* Animation */
var(--duration-instant) through var(--duration-slower)
var(--ease-spring), var(--ease-emphasized), var(--ease-out-expo)

Rule 6: Responsive Requirements
css

/* Mobile-first approach - base styles = mobile */
.element {
    /* Mobile styles (default) */
}

@media (min-width: 640px) {
    .element { /* Tablet styles */ }
}

@media (min-width: 1024px) {
    .element { /* Desktop styles */ }
}

/* Touch targets minimum 44x44px on mobile */
button, a, .clickable {
    min-height: 44px;
    min-width: 44px;
}

/* Prevent zoom on iOS inputs */
input, select, textarea {
    font-size: 16px !important;
}

Rule 7: Accessibility (WCAG 2.1 AA)
yaml

REQUIRED:
  - Color contrast ratio: minimum 4.5:1 for normal text
  - Focus indicators: visible :focus-visible rings (2px accent)
  - ARIA labels for icon-only buttons
  - prefers-reduced-motion media query support
  - Semantic HTML5 elements
  - sr-only utility class for screen readers

TESTING:
  - Keyboard navigable (Tab, Shift+Tab, Enter, Space, Escape)
  - Screen reader compatible (VoiceOver/NVDA)
  - Zoom to 200% without breakage

Rule 8: Animation Physics
css

/* GOOD — GPU accelerated (60fps) */
.element {
    transition: transform var(--duration-base) var(--ease-spring);
}
.element:hover {
    transform: translateY(-4px);
}

/* BAD — causes layout reflow */
.element {
    transition: top var(--duration-base) var(--ease-spring);
}
.element:hover {
    top: -4px;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}

Rule 9: Performance Budget
yaml

TARGETS:
  - First Contentful Paint: < 1.5s
  - Time to Interactive: < 3s
  - Cumulative Layout Shift: < 0.1
  - First Input Delay: < 100ms
  - Total bundle size (gzipped): < 50KB CSS, < 30KB JS

STRATEGIES:
  - Lazy load below-the-fold images (loading="lazy")
  - Defer non-critical JavaScript (defer attribute)
  - Inline critical CSS
  - Use WebP format for images
  - Use will-change sparingly

Rule 10: Code Output Format
yaml

EVERY FILE MUST:
  - Be complete and self-contained
  - Have no placeholders or TODOs
  - Include comprehensive comments
  - Use 2-space indentation
  - Have no console.log in production
  - Gracefully degrade for older browsers

2.3 Component Patterns for AI Generation
Button Component
html

<button class="btn btn-primary">
    <i class="fas fa-rocket"></i>
    <span>Get Started</span>
</button>

<button class="btn btn-secondary">Cancel</button>
<button class="btn btn-outline">Learn More</button>
<button class="btn btn-danger">Delete</button>
<button class="btn btn-ghost">Skip</button>

<!-- Sizes -->
<button class="btn btn-primary btn-sm">Small</button>
<button class="btn btn-primary btn-lg">Large</button>
<button class="btn btn-primary btn-block">Full Width</button>

Glass Card Component
html

<div class="glass-card">
    <div class="card-header">
        <h3>Card Title</h3>
        <p class="text-secondary">Card description</p>
    </div>
    <div class="card-body">
        <p>Card content goes here...</p>
    </div>
    <div class="card-footer">
        <button class="btn btn-primary">Action</button>
    </div>
</div>

Form Input Component
html

<div class="form-group">
    <label class="form-label">
        Email Address
        <span class="text-error">*</span>
    </label>
    <input type="email" class="form-input" 
           data-validate="email" 
           placeholder="you@example.com">
    <div class="form-error"></div>
    <p class="form-helper">We'll never share your email.</p>
</div>

Status Badge Component
html

<span class="status-badge status-pending">
    <i class="fas fa-clock"></i> Pending
</span>
<span class="status-badge status-processing">
    <i class="fas fa-spinner fa-spin"></i> Processing
</span>
<span class="status-badge status-completed">
    <i class="fas fa-check-circle"></i> Completed
</span>
<span class="status-badge status-cancelled">
    <i class="fas fa-times-circle"></i> Cancelled
</span>

Modal Component
html

<dialog id="exampleModal" class="modal">
    <div class="modal-header">
        <h3>Modal Title</h3>
        <button class="modal-close" data-modal-close="exampleModal">&times;</button>
    </div>
    <div class="modal-body">
        <p>Modal content here...</p>
    </div>
    <div class="modal-footer">
        <button class="btn btn-secondary" data-modal-close="exampleModal">Cancel</button>
        <button class="btn btn-primary" data-modal-confirm="exampleModal">Confirm</button>
    </div>
</dialog>

<button data-modal-open="exampleModal" class="btn btn-primary">
    Open Modal
</button>

Toast Notification
javascript

// Show toast programmatically
window.showToast('Operation completed successfully!', 'success');
window.showToast('Something went wrong', 'error');
window.showToast('Please check your input', 'warning');
window.showToast('New update available', 'info');

// With custom duration and title
window.showToast('Message here', 'success', 5000, 'Custom Title');

SECTION 3: DESIGN ENGINE & INTERACTION VISIONS
3.1 Design Philosophy — "Figma Studio" Aesthetics

"Calm Confidence" — every interaction feels intentional, every transition buttery smooth, every pixel optically perfect.
Visual Pillars
Pillar	Description
Micro-Fidelity	1px inner borders, precise optical alignment, sophisticated neutral ramps
Frosted Glass	Strategic backdrop-filter blur for depth layering (backdrop-filter: blur(10px))
Spring Physics	Custom easing curves that feel alive (cubic-bezier 0.2, 0.8, 0.2, 1)
Zero Paint Flashes	GPU-accelerated transitions (transform + opacity only)
Elastic Layouts	Unbreakable CSS Grid + clamp() systems
3.2 Color Palette — Premium Slate + Warm Orange
Neutral Ramp (Slate-based)
Token	Light Mode	Dark Mode	Usage
--slate-50	#f8fafc	#020617	Lightest background
--slate-100	#f1f5f9	#0f172a	Secondary surface
--slate-200	#e2e8f0	#1e293b	Tertiary surface
--slate-300	#cbd5e1	#334155	Elevated surface
--slate-400	#94a3b8	#475569	Subtle borders
--slate-500	#64748b	#64748b	Medium borders
--slate-600	#475569	#94a3b8	Secondary text
--slate-700	#334155	#cbd5e1	Primary text (dark)
--slate-800	#1e293b	#e2e8f0	Primary text
--slate-900	#0f172a	#f1f5f9	Darkest text
--slate-950	#020617	#f8fafc	Pure black/white
Primary Accent — BoostBangla Orange
Token	Value	Usage
--primary-500	#FF6B00	Primary brand color
--primary-600	#CC5500	Hover state
--primary-700	#c2410c	Active state
--primary-gradient	linear-gradient(135deg, #FF6B00, #CC5500)	Gradient effects
Semantic Colors
Token	Value	Usage
--success	#10b981	Success states, completed orders
--warning	#f59e0b	Warning states, pending orders
--error	#ef4444	Error states, cancelled orders
--info	#3b82f6	Info states, processing orders
3.3 Fluid Typography — Clamp Scale
css

/* Desktop → Mobile fluid scaling (Major Third 1.25 ratio) */
--text-xs:   clamp(0.75rem, 0.714rem + 0.179vw, 0.875rem);   /* 12-14px */
--text-sm:   clamp(0.875rem, 0.839rem + 0.179vw, 1rem);      /* 14-16px */
--text-base: clamp(1rem, 0.964rem + 0.179vw, 1.125rem);      /* 16-18px */
--text-lg:   clamp(1.125rem, 1.054rem + 0.357vw, 1.25rem);   /* 18-20px */
--text-xl:   clamp(1.25rem, 1.143rem + 0.536vw, 1.5rem);     /* 20-24px */
--text-2xl:  clamp(1.5rem, 1.321rem + 0.893vw, 1.875rem);    /* 24-30px */
--text-3xl:  clamp(1.875rem, 1.607rem + 1.339vw, 2.25rem);   /* 30-36px */
--text-4xl:  clamp(2.25rem, 1.875rem + 1.875vw, 3rem);       /* 36-48px */
--text-5xl:  clamp(3rem, 2.5rem + 2.5vw, 4rem);              /* 48-64px */

Font Families
css

--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-bangla: 'Noto Sans Bengali', var(--font-sans);
--font-mono: 'SF Mono', 'JetBrains Mono', 'Courier New', monospace;

Font Weights
css

--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-extrabold: 800;
--font-black: 900;

3.4 Spacing Scale — 8px Grid
css

/* 8px base grid with generous proportions */
--space-0:  0;
--space-1:  0.25rem;   /* 4px */
--space-2:  0.5rem;    /* 8px */
--space-3:  0.75rem;   /* 12px */
--space-4:  1rem;      /* 16px */
--space-5:  1.25rem;   /* 20px */
--space-6:  1.5rem;    /* 24px */
--space-8:  2rem;      /* 32px */
--space-10: 2.5rem;    /* 40px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */
--space-20: 5rem;      /* 80px */
--space-24: 6rem;      /* 96px */
--space-32: 8rem;      /* 128px */
--space-40: 10rem;     /* 160px */
--space-48: 12rem;     /* 192px */

3.5 Border Radius — Bold & Expressive
css

--radius-none: 0;
--radius-sm:   0.25rem;   /* 4px */
--radius-md:   0.375rem;  /* 6px */
--radius-lg:   0.5rem;    /* 8px */
--radius-xl:   0.75rem;   /* 12px */
--radius-2xl:  1rem;      /* 16px */
--radius-3xl:  1.5rem;    /* 24px */
--radius-full: 9999px;

3.6 Shadow System — Layered Depth
css

/* Elevation layers */
--shadow-xs:   0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-sm:   0 1px 3px 0 rgb(0 0 0 / 0.1);
--shadow-md:   0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg:   0 10px 15px -3px rgb(0 0 0 / 0.1);
--shadow-xl:   0 20px 25px -5px rgb(0 0 0 / 0.1);
--shadow-2xl:  0 25px 50px -12px rgb(0 0 0 / 0.25);

/* Glass morphism */
--shadow-glass: 0 8px 32px 0 rgba(31, 38, 135, 0.15);

/* Accent glow (for interactive elements) */
--shadow-glow: 0 0 15px 0 rgba(255, 107, 0, 0.3);

3.7 Motion Physics — Spring-Like Easing
Easing Curves
css

/* Premium easing curves — iOS/Android quality */
--ease-spring:     cubic-bezier(0.2, 0.8, 0.2, 1);
--ease-emphasized: cubic-bezier(0.4, 0, 0.2, 1);
--ease-decelerate: cubic-bezier(0, 0, 0.2, 1);
--ease-accelerate: cubic-bezier(0.4, 0, 1, 1);
--ease-bounce:     cubic-bezier(0.68, -0.55, 0.265, 1.55);
--ease-out-expo:   cubic-bezier(0.16, 1, 0.3, 1);

Duration Scale
css

--duration-instant: 50ms;
--duration-fast:    150ms;
--duration-base:    200ms;
--duration-slow:    300ms;
--duration-slower:  400ms;
--duration-slowest: 500ms;

Transition Presets
css

--transition-micro:    all var(--duration-fast) var(--ease-smooth);
--transition-standard: all var(--duration-base) var(--ease-spring);
--transition-page:     opacity var(--duration-slow) var(--ease-out-expo), 
                       transform var(--duration-slow) var(--ease-out-expo);
--transition-elastic:  transform var(--duration-fast) var(--ease-bounce);

3.8 Layout Grid System
Container
css

.container {
    width: 100%;
    max-width: 1280px;
    margin-inline: auto;
    padding-inline: var(--space-4);
}

@media (min-width: 640px)  { .container { padding-inline: var(--space-6); } }
@media (min-width: 1024px) { .container { padding-inline: var(--space-8); } }

Elastic Grid (Auto-fit)
css

.grid-responsive {
    display: grid;
    gap: var(--space-4);
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
}

Stats Grid (4 → 2 → 1 columns)
css

.stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
}

@media (max-width: 1024px) { .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; } }
@media (max-width: 640px)  { .stats-grid { grid-template-columns: 1fr; gap: 12px; } }

Dashboard Layout
css

.dashboard-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    transition: grid-template-columns var(--duration-base) var(--ease-spring);
}

@media (max-width: 768px) {
    .dashboard-layout { grid-template-columns: 1fr; }
}

body.sidebar-collapsed .dashboard-layout {
    grid-template-columns: 80px 1fr;
}

3.9 Glass Morphism Components
Glass Card
css

.glass-card {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(12px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-glass);
    transition: var(--transition-standard);
}

.glass-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-xl);
    border-color: var(--primary-500);
}

body.dark-mode .glass-card {
    background: rgba(30, 41, 59, 0.8);
    border-color: rgba(255, 255, 255, 0.05);
}

Glass Modal
css

.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    visibility: hidden;
    transition: var(--transition-base);
    z-index: var(--z-modal-backdrop);
}

.modal-overlay.active {
    opacity: 1;
    visibility: visible;
}

.modal-content {
    background: var(--bg-primary);
    border-radius: var(--radius-3xl);
    max-width: 90vw;
    max-height: 85vh;
    overflow: auto;
    transform: scale(0.95);
    transition: transform var(--duration-base) var(--ease-spring);
}

.modal-overlay.active .modal-content {
    transform: scale(1);
}

3.10 Interactive States
Hover States
css

/* Lift effect */
.hover-lift {
    transition: transform var(--duration-fast) var(--ease-spring);
}
.hover-lift:hover {
    transform: translateY(-2px);
}

/* Glow effect */
.hover-glow {
    transition: box-shadow var(--duration-fast) var(--ease-out-expo);
}
.hover-glow:hover {
    box-shadow: var(--shadow-glow);
}

/* Scale effect */
.hover-scale {
    transition: transform var(--duration-fast) var(--ease-spring);
}
.hover-scale:hover {
    transform: scale(1.02);
}

Active/Click States
css

.active-spring:active {
    transform: scale(0.98);
    transition: transform var(--duration-instant) var(--ease-bounce);
}

Focus States (Accessibility)
css

:focus-visible {
    outline: 2px solid var(--primary-500);
    outline-offset: 2px;
    border-radius: var(--radius-md);
}

3.11 Mobile App-Like Behaviors
Bottom Navigation Dock
css

.bottom-dock {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-top: 1px solid var(--border-primary);
    display: none;
    justify-content: space-around;
    padding: var(--space-2) var(--space-4);
    padding-bottom: env(safe-area-inset-bottom);
    z-index: var(--z-sticky);
}

@media (max-width: 768px) {
    .bottom-dock { display: flex; }
}

.dock-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    transition: var(--transition-micro);
    min-height: 44px;
    min-width: 44px;
}

.dock-item.active { color: var(--primary-500); }
.dock-item:hover { transform: translateY(-2px); }

Touch-Friendly Tap Targets
css

/* Minimum 44x44px for all interactive elements */
button, a, .clickable {
    min-height: 44px;
    min-width: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

Elastic Pull-to-Refresh
css

.pull-to-refresh {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: var(--bg-secondary);
    transform: translateY(-100%);
    transition: transform var(--duration-fast) var(--ease-spring);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-toast);
}

.pull-to-refresh.active {
    transform: translateY(0);
}

3.12 Responsive Breakpoints
css

/* Mobile-First Breakpoints */
--breakpoint-xs: 375px;   /* Small phones */
--breakpoint-sm: 640px;   /* Large phones */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Desktops */
--breakpoint-xl: 1280px;  /* Large desktops */
--breakpoint-2xl: 1536px; /* 4K monitors */

/* Media Query Helpers */
@media (max-width: 640px)  { /* Mobile */ }
@media (min-width: 641px) and (max-width: 1024px) { /* Tablet */ }
@media (min-width: 1025px) { /* Desktop */ }

SECTION 4: MASTER SCHEMA & BLUEPRINTS
4.1 Design Tokens Registry (tokens.json)
json

{
  "$schema": "https://design-tokens.org/schema/v1",
  "version": "3.0.0",
  "name": "BoostBangla Design System",
  "description": "Premium design tokens with alpha channels, adaptive typography, and spring-based motion",
  
  "color": {
    "slate": {
      "50": "#f8fafc",
      "100": "#f1f5f9",
      "200": "#e2e8f0",
      "300": "#cbd5e1",
      "400": "#94a3b8",
      "500": "#64748b",
      "600": "#475569",
      "700": "#334155",
      "800": "#1e293b",
      "900": "#0f172a",
      "950": "#020617"
    },
    "primary": {
      "50": "#fff7ed",
      "100": "#ffedd5",
      "200": "#fed7aa",
      "300": "#fdba74",
      "400": "#fb923c",
      "500": "#FF6B00",
      "600": "#CC5500",
      "700": "#c2410c",
      "800": "#9a3412",
      "900": "#7c2d12"
    },
    "semantic": {
      "success": "#10b981",
      "warning": "#f59e0b",
      "error": "#ef4444",
      "info": "#3b82f6"
    },
    "alpha": {
      "primary-10": "rgba(255, 107, 0, 0.1)",
      "primary-20": "rgba(255, 107, 0, 0.2)",
      "slate-10": "rgba(100, 116, 139, 0.1)",
      "slate-20": "rgba(100, 116, 139, 0.2)",
      "white-10": "rgba(255, 255, 255, 0.1)",
      "white-20": "rgba(255, 255, 255, 0.2)",
      "black-10": "rgba(0, 0, 0, 0.1)",
      "black-50": "rgba(0, 0, 0, 0.5)"
    }
  },
  
  "typography": {
    "fontFamily": {
      "sans": "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      "bangla": "'Noto Sans Bengali', 'Inter', sans-serif",
      "mono": "'JetBrains Mono', 'Courier New', monospace"
    },
    "fontSize": {
      "xs": "clamp(0.75rem, 0.714rem + 0.179vw, 0.875rem)",
      "sm": "clamp(0.875rem, 0.839rem + 0.179vw, 1rem)",
      "base": "clamp(1rem, 0.964rem + 0.179vw, 1.125rem)",
      "lg": "clamp(1.125rem, 1.054rem + 0.357vw, 1.25rem)",
      "xl": "clamp(1.25rem, 1.143rem + 0.536vw, 1.5rem)",
      "2xl": "clamp(1.5rem, 1.321rem + 0.893vw, 1.875rem)",
      "3xl": "clamp(1.875rem, 1.607rem + 1.339vw, 2.25rem)",
      "4xl": "clamp(2.25rem, 1.875rem + 1.875vw, 3rem)",
      "5xl": "clamp(3rem, 2.5rem + 2.5vw, 4rem)"
    },
    "fontWeight": {
      "light": 300,
      "normal": 400,
      "medium": 500,
      "semibold": 600,
      "bold": 700,
      "extrabold": 800,
      "black": 900
    },
    "lineHeight": {
      "tight": 1.2,
      "normal": 1.5,
      "relaxed": 1.75
    },
    "letterSpacing": {
      "tight": "-0.02em",
      "normal": "0",
      "wide": "0.02em"
    }
  },
  
  "spacing": {
    "0": "0",
    "1": "0.25rem",
    "2": "0.5rem",
    "3": "0.75rem",
    "4": "1rem",
    "5": "1.25rem",
    "6": "1.5rem",
    "8": "2rem",
    "10": "2.5rem",
    "12": "3rem",
    "16": "4rem",
    "20": "5rem",
    "24": "6rem",
    "32": "8rem",
    "40": "10rem",
    "48": "12rem"
  },
  
  "borderRadius": {
    "none": "0",
    "sm": "0.25rem",
    "md": "0.375rem",
    "lg": "0.5rem",
    "xl": "0.75rem",
    "2xl": "1rem",
    "3xl": "1.5rem",
    "full": "9999px"
  },
  
  "shadow": {
    "xs": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "sm": "0 1px 3px 0 rgb(0 0 0 / 0.1)",
    "md": "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    "lg": "0 10px 15px -3px rgb(0 0 0 / 0.1)",
    "xl": "0 20px 25px -5px rgb(0 0 0 / 0.1)",
    "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
    "glass": "0 8px 32px 0 rgba(31, 38, 135, 0.15)",
    "glow": "0 0 15px 0 rgba(255, 107, 0, 0.3)"
  },
  
  "animation": {
    "duration": {
      "instant": "50ms",
      "fast": "150ms",
      "base": "200ms",
      "slow": "300ms",
      "slower": "400ms",
      "slowest": "500ms"
    },
    "easing": {
      "spring": "cubic-bezier(0.2, 0.8, 0.2, 1)",
      "emphasized": "cubic-bezier(0.4, 0, 0.2, 1)",
      "decelerate": "cubic-bezier(0, 0, 0.2, 1)",
      "accelerate": "cubic-bezier(0.4, 0, 1, 1)",
      "bounce": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)"
    }
  },
  
  "breakpoints": {
    "xs": "375px",
    "sm": "640px",
    "md": "768px",
    "lg": "1024px",
    "xl": "1280px",
    "2xl": "1536px"
  },
  
  "zIndex": {
    "hide": -1,
    "base": 0,
    "dropdown": 1000,
    "sticky": 1020,
    "fixed": 1030,
    "modalBackdrop": 1040,
    "modal": 1050,
    "popover": 1060,
    "tooltip": 1070,
    "toast": 1080
  }
}

4.2 Component Schema (components.json)
json

{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "version": "3.0.0",
  "name": "BoostBangla Component Library",
  "description": "Premium UI primitives with Figma-style precision",
  
  "components": {
    "button": {
      "selector": ".btn",
      "variants": ["primary", "secondary", "outline", "ghost", "danger"],
      "sizes": ["sm", "md", "lg"],
      "states": ["default", "hover", "active", "focus", "disabled", "loading"],
      "html": "<button class=\"btn btn-{variant} btn-{size}\">{icon}{label}</button>",
      "css": {
        "base": "display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2); padding: var(--space-3) var(--space-6); border-radius: var(--radius-full); font-weight: var(--font-medium); transition: var(--transition-standard); cursor: pointer; min-height: 44px;",
        "primary": "background: var(--primary-500); color: white;",
        "primary:hover": "background: var(--primary-600); transform: translateY(-2px); box-shadow: var(--shadow-md);",
        "primary:active": "transform: scale(0.97); transition: transform 50ms var(--ease-bounce);"
      }
    },
    
    "glass-card": {
      "selector": ".glass-card",
      "variants": ["default", "interactive", "featured"],
      "html": "<div class=\"glass-card\"><div class=\"card-header\">{header}</div><div class=\"card-body\">{body}</div><div class=\"card-footer\">{footer}</div></div>",
      "css": {
        "base": "background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(12px) saturate(180%); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: var(--radius-2xl); transition: var(--transition-standard);",
        "hover": "transform: translateY(-4px); box-shadow: var(--shadow-xl); border-color: var(--primary-500);",
        "dark": "background: rgba(30, 41, 59, 0.8); border-color: rgba(255, 255, 255, 0.05);"
      }
    },
    
    "status-badge": {
      "selector": ".status-badge",
      "variants": ["pending", "processing", "completed", "cancelled", "refunded"],
      "html": "<span class=\"status-badge status-{variant}\">{icon}{label}</span>",
      "css": {
        "base": "display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: var(--radius-full); font-size: 13px; font-weight: var(--font-bold); line-height: 1;",
        "pending": "background: #fef3c7; color: #d97706;",
        "processing": "background: #dbeafe; color: #2563eb;",
        "completed": "background: #d1fae5; color: #059669;",
        "cancelled": "background: #fee2e2; color: #dc2626;",
        "dark-pending": "background: #451a03; color: #fbbf24;",
        "dark-processing": "background: #1e3a5f; color: #60a5fa;",
        "dark-completed": "background: #064e3b; color: #34d399;",
        "dark-cancelled": "background: #7f1d1d; color: #f87171;"
      }
    },
    
    "form-input": {
      "selector": ".form-group",
      "types": ["text", "email", "password", "number", "tel", "textarea", "select"],
      "states": ["default", "error", "success", "disabled"],
      "html": "<div class=\"form-group\"><label class=\"form-label\">{label}</label><input type=\"{type}\" class=\"form-input\" data-validate=\"{validate}\" placeholder=\"{placeholder}\"><div class=\"form-error\"></div><p class=\"form-helper\">{helper}</p></div>",
      "css": {
        "group": "display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-4);",
        "label": "font-size: var(--text-sm); font-weight: var(--font-medium); color: var(--text-secondary);",
        "input": "width: 100%; padding: var(--space-3) var(--space-4); border: 2px solid var(--border-primary); border-radius: var(--radius-lg); font-size: var(--text-base); transition: var(--transition-standard); background: var(--bg-primary);",
        "input:focus": "outline: none; border-color: var(--primary-500); box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.1);",
        "input-error": "border-color: var(--error);",
        "input-success": "border-color: var(--success);"
      }
    },
    
    "modal": {
      "selector": ".modal",
      "variants": ["center", "bottom-sheet", "sidebar"],
      "html": "<dialog id=\"{id}\" class=\"modal\"><div class=\"modal-header\">{title}<button class=\"modal-close\" data-modal-close=\"{id}\">&times;</button></div><div class=\"modal-body\">{content}</div><div class=\"modal-footer\">{actions}</div></dialog>",
      "css": {
        "base": "border: none; border-radius: var(--radius-3xl); padding: 0; max-width: 90vw; width: 500px; background: var(--bg-primary); animation: modal-enter var(--duration-base) var(--ease-emphasized);",
        "backdrop": "background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px);",
        "header": "display: flex; align-items: center; justify-content: space-between; padding: var(--space-4) var(--space-6); border-bottom: 1px solid var(--border-primary);",
        "body": "padding: var(--space-6);",
        "footer": "display: flex; align-items: center; justify-content: flex-end; gap: var(--space-3); padding: var(--space-4) var(--space-6); border-top: 1px solid var(--border-primary);"
      },
      "animation": {
        "enter": "@keyframes modal-enter { from { opacity: 0; transform: scale(0.95) translateY(-20px); } to { opacity: 1; transform: scale(1) translateY(0); } }"
      }
    },
    
    "drawer": {
      "selector": ".drawer",
      "variants": ["left", "right", "bottom"],
      "html": "<div id=\"{id}\" class=\"drawer-overlay\" data-drawer><div class=\"drawer drawer-{variant}\"><div class=\"drawer-header\">{title}<button class=\"drawer-close\" data-drawer-close=\"{id}\">&times;</button></div><div class=\"drawer-body\">{content}</div></div></div>",
      "css": {
        "overlay": "position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px); opacity: 0; visibility: hidden; transition: var(--transition-base); z-index: var(--z-modal-backdrop);",
        "overlay-active": "opacity: 1; visibility: visible;",
        "left": "position: fixed; top: 0; left: 0; bottom: 0; width: 320px; background: var(--bg-primary); transform: translateX(-100%); transition: transform var(--duration-base) var(--ease-spring);",
        "right": "position: fixed; top: 0; right: 0; bottom: 0; width: 320px; background: var(--bg-primary); transform: translateX(100%); transition: transform var(--duration-base) var(--ease-spring);",
        "bottom": "position: fixed; bottom: 0; left: 0; right: 0; height: auto; background: var(--bg-primary); transform: translateY(100%); transition: transform var(--duration-base) var(--ease-spring);",
        "active-left": "transform: translateX(0);",
        "active-right": "transform: translateX(0);",
        "active-bottom": "transform: translateY(0);"
      }
    },
    
    "toast": {
      "selector": ".toast",
      "variants": ["success", "error", "warning", "info"],
      "positions": ["bottom-right", "bottom-left", "top-right", "top-left"],
      "javascript": "window.showToast(message, type, duration, title);",
      "css": {
        "container": "position: fixed; bottom: var(--space-6); right: var(--space-6); z-index: var(--z-toast); display: flex; flex-direction: column; gap: var(--space-3);",
        "base": "background: var(--slate-800); color: white; padding: var(--space-3) var(--space-4); border-radius: var(--radius-lg); display: flex; align-items: center; gap: var(--space-3); min-width: 280px; max-width: 400px; animation: toast-enter var(--duration-base) var(--ease-spring); box-shadow: var(--shadow-lg);",
        "success": "background: var(--success);",
        "error": "background: var(--error);",
        "warning": "background: var(--warning);",
        "info": "background: var(--info);"
      },
      "animation": {
        "enter": "@keyframes toast-enter { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }"
      }
    },
    
    "skeleton": {
      "selector": ".skeleton",
      "variants": ["text", "avatar", "card", "button"],
      "html": "<div class=\"skeleton skeleton-{variant}\"></div>",
      "css": {
        "base": "background: linear-gradient(90deg, var(--border-primary) 25%, var(--bg-tertiary) 50%, var(--border-primary) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: var(--radius-lg);",
        "text": "height: 1em; width: 100%;",
        "avatar": "width: 48px; height: 48px; border-radius: var(--radius-full);",
        "card": "height: 200px; width: 100%;",
        "button": "height: 44px; width: 120px; border-radius: var(--radius-full);"
      },
      "animation": {
        "shimmer": "@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }"
      }
    },
    
    "navigation-bar": {
      "selector": ".nav-bar",
      "variants": ["sticky", "glass", "transparent"],
      "html": "<header class=\"nav-bar nav-bar-{variant}\"><div class=\"container nav-bar-inner\"><a href=\"/\" class=\"nav-logo\">{logo}</a><nav class=\"nav-links\">{links}</nav><div class=\"nav-actions\">{actions}</div><button class=\"mobile-menu-toggle\" data-mobile-menu aria-label=\"Menu\"><i class=\"fas fa-bars\"></i></button></div></header>",
      "css": {
        "base": "position: sticky; top: 0; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border-primary); z-index: var(--z-sticky);",
        "inner": "display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); min-height: 70px;",
        "links": "display: flex; gap: var(--space-6); align-items: center;",
        "link": "color: var(--text-secondary); transition: var(--transition-micro);",
        "link:hover": "color: var(--primary-500);",
        "mobile-toggle": "display: none; min-height: 44px; min-width: 44px;",
        "dark": "background: rgba(15, 23, 42, 0.95);"
      },
      "responsive": "@media (max-width: 768px) { .nav-links { display: none; } .mobile-toggle { display: flex; } }"
    },
    
    "bottom-dock": {
      "selector": ".bottom-dock",
      "items": 5,
      "html": "<nav class=\"bottom-dock\">{items}</nav>",
      "css": {
        "base": "position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px); border-top: 1px solid var(--border-primary); display: none; justify-content: space-around; padding: var(--space-2) var(--space-4); padding-bottom: env(safe-area-inset-bottom); z-index: var(--z-sticky);",
        "item": "display: flex; flex-direction: column; align-items: center; gap: var(--space-1); font-size: var(--text-xs); color: var(--text-tertiary); transition: var(--transition-micro); min-height: 44px; min-width: 44px;",
        "item-active": "color: var(--primary-500);",
        "item-hover": "transform: translateY(-2px);",
        "dark": "background: rgba(15, 23, 42, 0.95);"
      },
      "responsive": "@media (max-width: 768px) { .bottom-dock { display: flex; } }"
    }
  },
  
  "compositions": {
    "dashboard-layout": {
      "components": ["navigation-bar", "sidebar", "bottom-dock"],
      "grid": {
        "template": "280px 1fr",
        "areas": ["sidebar main"]
      },
      "css": ".dashboard-layout { display: grid; grid-template-columns: 280px 1fr; min-height: 100vh; }",
      "responsive": "@media (max-width: 768px) { .dashboard-layout { grid-template-columns: 1fr; } .sidebar { transform: translateX(-100%); position: fixed; z-index: 100; } .sidebar.open { transform: translateX(0); } }"
    },
    
    "auth-layout": {
      "components": ["glass-card", "form-input", "button"],
      "grid": {
        "template": "1fr",
        "maxWidth": "480px",
        "margin": "auto"
      },
      "css": ".auth-layout { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: var(--space-4); }"
    }
  }
}

4.3 Site Configuration (site.config.json)
json

{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "version": "3.0.0",
  "site": {
    "name": "BoostBangla",
    "tagline": "Premium SMM Panel",
    "description": "Enterprise-grade social media marketing platform",
    "url": "https://boostbangla.com",
    "locale": "en_BD",
    "timezone": "Asia/Dhaka",
    "currency": "BDT",
    "currencySymbol": "৳"
  },
  
  "branding": {
    "logo": {
      "light": "/assets/images/logo-light.svg",
      "dark": "/assets/images/logo-dark.svg",
      "favicon": "/favicon.ico"
    },
    "colors": {
      "primary": "#FF6B00",
      "secondary": "#02101A"
    }
  },
  
  "seo": {
    "defaultTitle": "BoostBangla - Premium SMM Panel",
    "defaultDescription": "Enterprise-grade social media marketing services. YouTube, Facebook, Instagram, TikTok followers and views.",
    "defaultKeywords": ["SMM panel", "social media marketing", "YouTube views", "Instagram followers"],
    "openGraph": {
      "type": "website",
      "image": "/assets/images/og-image.jpg",
      "siteName": "BoostBangla"
    },
    "twitter": {
      "card": "summary_large_image",
      "site": "@boostbangla"
    }
  },
  
  "routes": {
    "public": [
      { "path": "/", "title": "Home", "file": "index.html", "auth": false },
      { "path": "/about", "title": "About", "file": "about.html", "auth": false },
      { "path": "/services", "title": "Services", "file": "services.html", "auth": false },
      { "path": "/pricing", "title": "Pricing", "file": "pricing.html", "auth": false },
      { "path": "/contact", "title": "Contact", "file": "contact.html", "auth": false },
      { "path": "/login", "title": "Login", "file": "login.html", "auth": "guest" },
      { "path": "/signup", "title": "Sign Up", "file": "signup.html", "auth": "guest" },
      { "path": "/forgot-password", "title": "Forgot Password", "file": "forgot-password.html", "auth": "guest" }
    ],
    "protected": [
      { "path": "/dashboard", "title": "Dashboard", "file": "dashboard/index.html", "auth": "user" },
      { "path": "/dashboard/orders", "title": "Orders", "file": "dashboard/orders.html", "auth": "user" },
      { "path": "/dashboard/new-order", "title": "New Order", "file": "dashboard/new-order.html", "auth": "user" },
      { "path": "/dashboard/services", "title": "Services", "file": "dashboard/services.html", "auth": "user" },
      { "path": "/dashboard/add-funds", "title": "Add Funds", "file": "dashboard/add-funds.html", "auth": "user" },
      { "path": "/dashboard/transactions", "title": "Transactions", "file": "dashboard/transactions.html", "auth": "user" },
      { "path": "/dashboard/api", "title": "API Settings", "file": "dashboard/api.html", "auth": "user" },
      { "path": "/dashboard/tickets", "title": "Support Tickets", "file": "dashboard/tickets.html", "auth": "user" },
      { "path": "/dashboard/account", "title": "Account", "file": "dashboard/account.html", "auth": "user" }
    ],
    "admin": [
      { "path": "/admin", "title": "Admin Dashboard", "file": "admin/index.html", "auth": "admin" },
      { "path": "/admin/users", "title": "Manage Users", "file": "admin/users.html", "auth": "admin" },
      { "path": "/admin/orders", "title": "Manage Orders", "file": "admin/orders.html", "auth": "admin" },
      { "path": "/admin/deposits", "title": "Manage Deposits", "file": "admin/deposits.html", "auth": "admin" },
      { "path": "/admin/withdrawals", "title": "Manage Withdrawals", "file": "admin/withdrawals.html", "auth": "admin" },
      { "path": "/admin/services", "title": "Manage Services", "file": "admin/services.html", "auth": "admin" },
      { "path": "/admin/tickets", "title": "Manage Tickets", "file": "admin/tickets.html", "auth": "admin" },
      { "path": "/admin/settings", "title": "Settings", "file": "admin/settings.html", "auth": "admin" }
    ]
  },
  
  "navigation": {
    "header": [
      { "label": "Home", "href": "/", "icon": "home" },
      { "label": "Services", "href": "/services", "icon": "tags" },
      { "label": "Pricing", "href": "/pricing", "icon": "dollar-sign" },
      { "label": "Contact", "href": "/contact", "icon": "envelope" }
    ],
    "sidebar": [
      { "label": "Dashboard", "href": "/dashboard", "icon": "tachometer-alt", "section": "Main" },
      { "label": "New Order", "href": "/dashboard/new-order", "icon": "plus-circle", "section": "Main" },
      { "label": "Orders", "href": "/dashboard/orders", "icon": "shopping-cart", "section": "Main" },
      { "label": "Services", "href": "/dashboard/services", "icon": "tags", "section": "Main" },
      { "label": "Add Funds", "href": "/dashboard/add-funds", "icon": "wallet", "section": "Finance" },
      { "label": "Transactions", "href": "/dashboard/transactions", "icon": "history", "section": "Finance" },
      { "label": "API Settings", "href": "/dashboard/api", "icon": "code", "section": "Settings" },
      { "label": "Support Tickets", "href": "/dashboard/tickets", "icon": "headset", "section": "Support" },
      { "label": "Account", "href": "/dashboard/account", "icon": "user-cog", "section": "Settings" }
    ],
    "mobileBottomNav": [
      { "label": "Home", "href": "/", "icon": "home" },
      { "label": "Services", "href": "/services", "icon": "tags" },
      { "label": "Dashboard", "href": "/dashboard", "icon": "user" },
      { "label": "Support", "href": "/tickets", "icon": "headset" }
    ]
  },
  
  "features": {
    "darkMode": true,
    "offlineSupport": true,
    "notifications": true,
    "keyboardShortcuts": true,
    "pwa": true,
    "analytics": true
  },
  
  "api": {
    "proxy": "/php/api-proxy.php",
    "exchangeRate": "/php/exchange-rate.php",
    "markupPercentage": 30,
    "timeout": 30000,
    "retryCount": 3
  },
  
  "auth": {
    "storageKey": "boostbangla_auth",
    "userKey": "boostbangla_user",
    "loginRedirect": "/dashboard",
    "logoutRedirect": "/login"
  }
}

📋 File Migration Map (Old → New)
CSS Files
Old File	New Location	Action
css/style.css	assets/css/global.css	Merged — all tokens + base styles
css/components.css	assets/css/components.css	Kept separate
css/services.css	assets/css/components.css	Merged into components
css/universal-header.css	assets/css/layout.css	Layout-specific styles
css/notifications.css	assets/css/components.css	Merged into components
css/animations.css	assets/css/animations.css	Kept separate
css/custom-scrollbar.css	assets/css/global.css	Merged into globals
css/dark-mode.css	assets/css/dark-mode.css	Kept separate
css/mobile.css	assets/css/mobile.css	Kept separate
css/admin.css	assets/css/admin.css	Kept separate
css/skeleton.css	assets/js/ui/skeleton.js	Moved to JS component
JavaScript Files
Old File	New Location	Action
js/dark-mode.js	assets/js/core/theme.js	Merged into theme engine
js/amarboost.js	assets/js/api/amarboost.js	Kept separate
js/validation.js	assets/js/core/validation.js	Kept separate
js/core/notifications-helper.js	assets/js/ui/notifications.js	UI component
js/core/config.js	assets/js/core/config.js	Kept
js/core/auth.js	assets/js/core/auth.js	Kept
js/core/components.js	assets/js/core/theme.js	Merged
js/core/utils.js	assets/js/core/utils.js	Kept
js/core/header.js	assets/js/ui/header.js	UI component
js/core/toast.js	assets/js/core/toast.js	Kept
js/core/shortcuts.js	assets/js/core/shortcuts.js	Kept
js/core/offline.js	assets/js/core/offline.js	Kept
js/core/sidebar.js	assets/js/ui/sidebar.js	UI component
js/core/avatar.js	assets/js/ui/header.js	Merged into header
js/lib/virtual-scroller.js	assets/js/ui/virtual-scroller.js	UI component
js/lib/tour.js	assets/js/lib/tour.js	Kept
js/lib/offline-cache.js	assets/js/core/offline.js	Merged
js/lib/confetti.js	assets/js/lib/confetti.js	Kept
js/lib/analytics.js	assets/js/lib/analytics.js	Kept
js/workers/search-worker.js	assets/js/api/search-worker.js	API worker
js/modules/*.js	assets/js/modules/*.js	All kept
HTML Components
Old File	New Location	Action
components/header.html	components/header.html	Kept
components/footer.html	components/footer.html	Kept
components/unified-bell.html	components/notifications-dropdown.html	Renamed
components/universal-header.html	components/header.html	Merged
components/user-menu.html	components/user-menu.html	Kept
components/empty-state.html	components/empty-state.html	Kept
components/sidebar.html	components/sidebar.html	Kept
Pages
Old Path	New Path	Action
admin/*.html	pages/admin/*.html	Moved
dashboard/*.html	pages/dashboard/*.html	Moved
index.html	pages/public/index.html	Moved
login.html	pages/public/login.html	Moved
signup.html	pages/public/signup.html	Moved
services.html	pages/public/services.html	Moved
🎯 Final Notes
Feature	Status
Desktop-first design	✅ Big, bold, spacious
Mobile responsive	✅ All breakpoints covered
Dark mode	✅ Full support with persistence
Glass morphism	✅ Backdrop blur effects
Smooth animations	✅ fade, slide, float effects
Touch-friendly	✅ 44x44px minimum targets
Accessible	✅ High contrast, focus indicators
Zero dependencies	✅ Vanilla only
AI-optimized	✅ Complete AGENTS section

This SYSTEM.md file is the single source of truth for the BoostBangla Design System v3.0. Copy this entire document into your project as docs/SYSTEM.md and reference it for all development decisions. 🚀