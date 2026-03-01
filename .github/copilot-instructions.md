# CRM Tool Copilot Instructions

## Project context
- Build and maintain a multi-page CRM web app using Vite, JavaScript, HTML, CSS and Bootstrap.
- Backend services use Supabase (Postgres, Auth, Storage, Realtime).

## Architecture guidelines
- Keep each page in a separate HTML entry file (`index.html`, `login.html`, `dashboard.html`, `customers.html`, `sales-reps.html`, `visits.html`, `projects.html`, `tasks.html`).
- Keep code modular and split by responsibility:
  - `src/pages/*` for page-specific UI and event handlers
  - `src/components/header`, `src/components/footer`, `src/components/common`
  - `src/services/*` for Supabase data access
  - `src/styles/*` for custom styling
- Avoid monolithic files; prefer small focused modules.

## UI guidelines
- Use Bootstrap components first.
- Ensure responsive behavior for desktop/mobile.
- Use concise, productivity-focused UX and clear action labels.
- Use toast notifications for errors and important entity changes.

## Auth and authorization
- Use Supabase Auth with register/login/logout.
- Protect app pages so only authenticated users can access dashboard and entity pages.
- Apply and maintain RLS-first design in migrations.
- Treat `profiles.role` values as `sales_rep` and `admin`.

## Database and backend
- Manage schema via SQL migration files in `supabase/migrations`.
- Keep entities normalized: customers, projects, stages, tasks, visits, profiles.
- Do not hardcode Supabase secrets; use environment variables.
- Use Supabase Storage bucket `crm-attachments` for file attachments metadata and files.

## Coding style
- Keep implementation simple and explicit.
- Keep naming descriptive and consistent with existing modules.
- Prefer minimal, focused changes over broad refactors.
