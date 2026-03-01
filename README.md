# CRM Tool

Multi-page CRM application built with JavaScript, HTML, CSS, Bootstrap, Vite and Supabase.

## Features
- Authentication: register, login, logout
- Dashboard with CRM totals
- Customers CRUD
- Sales representatives management (profiles + roles)
- Visits CRUD linked to customers and sales reps
- Customer projects CRUD with default project stages
- Tasks board per project with drag-and-drop move/reorder
- Toast notifications for key actions and errors

## Tech Stack
- Frontend: Vite + Vanilla JS + Bootstrap + Bootstrap Icons
- Backend: Supabase (Auth, Postgres, Storage)
- Deployment target: Netlify

## Project Structure
- `src/pages/*` page modules
- `src/components/header`, `src/components/footer`, `src/components/common`
- `src/services/*` Supabase data services
- `supabase/migrations/*` database and RLS migration scripts
- `scripts/seed.js` demo data seeding script

## Environment Variables
Create `.env` from `.env.example`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

For seeding with admin API:
- `SUPABASE_SERVICE_ROLE_KEY`

## Local Setup
1. `npm install`
2. Create `.env` with Supabase values
3. Apply migration in Supabase SQL editor or CLI from `supabase/migrations`
4. In Supabase Auth settings, disable email confirmations for easier testing
5. `npm run dev`

## Seed Demo Data
- `npm run seed`
- Demo users:
  - `steve@gmail.com / pass123`
  - `maria@gmail.com / pass123`
  - `peter@gmail.com / pass123`

## Deployment (Netlify)
1. Connect this GitHub repository in Netlify.
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Set environment variables in Netlify:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Notes
- RLS policies are included in migration SQL for owner/admin-based access.
- Attachments table and storage bucket (`crm-attachments`) are prepared in the schema for file upload workflows.
