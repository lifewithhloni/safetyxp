# SafetyXP API architecture

## Scope
The API layer is intentionally designed to remain backend-agnostic until a data provider is introduced.

## Principles
- Keep API contracts stable and typed.
- Prefer domain-oriented service methods over ad-hoc page logic.
- Keep current data access mock-based for local development.
- Prepare for future Supabase or REST API integration with a consistent service boundary.

## Suggested service boundaries
- Auth service
- User service
- Policy service
- Progress service
- Certificate service
- Quiz service
- Scenario service

## Integration route
1. Define the typed contract.
2. Implement a concrete adapter for the backend.
3. Swap the mock service behind the same interface.
4. Preserve UI components and routes unchanged.
