# Contributor Guide for Claude Code

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. It contains essential information about the codebase architecture, development commands, and implementation patterns specific to the Mockcodes project.

## Common Development Commands

**Development:**
- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Code Architecture

This is **Mockcodes**, a micro SaaS platform for converting UI screenshots into code using AI. The application generates optimized prompts and scaffolds complete projects with Tailwind CSS and shadcn/ui.

### Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Authentication:** Clerk
- **Database:** Supabase with Row Level Security
- **Payments:** Stripe with webhooks
- **Styling:** Tailwind CSS + shadcn/ui components
- **AI Integration:** OpenAI API
- **State Management:** TanStack React Query
- **Form Handling:** React Hook Form + Zod validation

### Directory Structure
```
app/                    # Next.js 14 App Router pages
├── api/               # API routes and webhook handlers
├── layout.tsx         # Root layout with providers
└── page.tsx           # Home page
components/            # React components
├── ui/               # shadcn/ui components
└── providers/        # Context providers (Clerk, TanStack)
utils/                # Business logic utilities
├── ai/              # OpenAI integration
├── stripe/          # Payment processing
└── supabase/        # Database client and helpers
hooks/                # Custom React hooks
types/                # TypeScript type definitions
supabase/             # Database migrations and config
documentation/        # Project documentation
```

### Key Implementation Patterns

**Authentication Flow:**
- Use Clerk's `auth()` server action to protect routes
- Wrap app in `ClerkProvider` in `app/layout.tsx`
- Integrate user data with Supabase via user ID

**Database:**
- All tables use Row Level Security (RLS)
- Customer data linked to Clerk user IDs
- Subscription management through Stripe webhooks

**AI Processing:**
- Screenshot uploads limited to 5MB PNG/JPEG
- AI prompts generated via OpenAI API in `utils/ai/openai.ts`
- Results cached and managed through React Query

**Payment Processing:**
- Stripe Payment Intents API with webhooks
- Monthly quota system with calendar-based resets
- Subscription tiers managed in Supabase

### Development Guidelines

**Next.js 14 App Router:**
- Use server components for data-heavy pages
- API routes in `app/api/` directory
- Leverage server actions for form submissions

**Component Development:**
- Use shadcn/ui components from `components/ui/`
- Follow component composition over inheritance
- Implement proper TypeScript types for all props

**Data Fetching:**
- TanStack React Query for client-side data management
- Server components for initial data loading
- Implement proper loading and error states

**File Upload Handling:**
- Client and server-side validation for 5MB limit
- Support PNG/JPEG formats only
- Store uploads in designated public directory

**Styling:**
- Use Tailwind CSS utility classes
- Responsive design with mobile-first approach
- Maintain consistent design system via shadcn/ui

### Database Schema Notes
- `customers` table links to Clerk users
- `subscriptions` managed via Stripe webhooks
- `products` and `prices` mirror Stripe catalog
- Monthly quotas reset automatically

### Environment Variables Required
- Clerk authentication keys
- Supabase URL and anon key
- Stripe secret and publishable keys
- OpenAI API key

### Testing and Deployment
- Run `npm run lint` before commits
- Vercel deployment with environment variables
- Stripe webhook endpoints configured for production