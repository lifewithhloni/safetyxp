# SafetyXP architecture

## Overview
SafetyXP is structured as a scalable, enterprise-ready Next.js application with feature-oriented modules, shared UI primitives, domain services, and mock-backed data access for future Supabase integration.

## Principles
- Keep the product experience visually stable while improving maintainability.
- Prefer shared components over duplicated UI.
- Isolate domain logic in services rather than placing it directly in pages.
- Design for multi-tenant and role-aware expansion.
- Keep current data access mock-based until backend services are introduced.

## Layering
- App layer: route-level pages and layouts
- Feature layer: task-specific shells and flows
- UI layer: reusable primitives such as buttons, cards, forms, and navigation
- Domain services: mock-backed business access for progress, certificates, policies, and auth
- Types and constants: shared contracts and configuration

## Directory guidance
- app/: route structure and root layout
- components/: reusable UI modules
- features/: feature-specific shells
- services/: mock domain services
- providers/: shared context providers
- types/: TypeScript contracts
- constants/: shared navigation and design configuration
- docs/: architecture and implementation notes
