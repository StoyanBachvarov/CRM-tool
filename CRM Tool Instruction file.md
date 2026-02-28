CRM Tool: Building an End-to-End App with JavaScript, HTML, CSS, Bootstrap, Vite and Supabase, using Git and GitHub Copilot.

1. Project Assignment: CRM tool

Using AI-assisted development, implement and deploy a fully functional multi-page JavaScript application. 

The application represents a basic Customer Relationship Management (CRM) system used to manage customers, sales activities, projects, and operational tasks.

CRM System Overview

Implement a CRM platform where registered users (sales representatives and administrators) can manage customer relationships and track business activities.

The system should support the following core business entities:

# Customers

-- Users can:

- Create, view, edit, and delete customers
- Store customer information (name, company, contact details, notes)
- View all related activities for a customer

# Sales Representatives

-- Users represent sales reps within the organization

- Sales reps can be assigned to customers, projects, visits, and tasks
- Access is based on authentication and role permissions


# Visits
A visit represents interaction with a customer (meeting, call, demo, etc.).

-- Users can:

- Create visits linked to a customer
- Record visit date, description, and outcome
- Edit or delete visits
- Track visit history per customer

# Projects per Customer

- Each customer may have multiple projects.

-- Users can:

- Create projects assigned to a specific customer
- Edit and delete projects
- Assign sales reps to projects
- Track project progress and related tasks

# Tasks

- Tasks represent actionable work items connected to projects or customers.
- Tasks include:
- Title
- Rich-text description
- Assigned sales rep
- Status tracking


2. Project Requirements

These are the capstone project requirements, which all students should follow.

## Technologies

-- Frontend: 
Implement the app in HTML, CSS, JavaScript and Bootstrap. Use UI libraries and components of your choice. Keep it simple, without TypeScript and UI frameworks like React and Vue.

-- Backend: Use Supabase as a backend (database, authentication and storage).

-- Build tools: Node.js, npm, Vite.

-- Deployment: Netlify.

## Architecture
-- Use Node.js, npm and Vite to structure the app with modular components.

-- Use multi-page navigation (instead of single page with popups) and keep each page in separate file.

-- Use modular design: split your app into self-contained components (e.g. UI pages, services, utils) to improve project maintenance. When reasonable, use separate files for the UI, business logic, styles, and other app assets. Avoid big and complex monolith code.

-- Define "Agent Instructions" (.github/copilot-instructions.md) to provide architectural guidelines and project-wide instructions for the AI dev agent.

## User Interface (UI)
- Place different app pages in separate files (for better maintenance).
- Implement responsive design for desktop and mobile browsers.
- Implement modern and user-friendly UI design, using Bootstrap components and custom styles.
- Use icons, effects and visual cues to enhance user experience and make the app more intuitive.

## Backend
- Use Supabase as a backend to keep all app data.
- Use Supabase DB for data tables.
- Use Supabase Auth for authentication (users, register, login, logout).
- Use Supabase Storage to upload photos and files at the server-side.
- Optionally, use Supabase Edge Functions for special server-side interactions.

## Authentication and Authorization
- Use Supabase Auth for authentication and authorization with JWT tokens.
- Implement users (register, login, logout) and roles (normal and admin users).
- Use Row-Level Security (RLS) policies to implement access control.
- If role-based access control (RBAC) is needed, use `user_roles` table + RLS to implement it.
- Implement admin panel (or similar concept for special users, different from regular).

## Database
- Use best practices to design the Supabase DB schema, including normalization, indexing, and relationships.
- When changing the DB schema, always use Supabase migrations.
- Sync the DB migrations history from Supabase to a local project folder.

## Storage
- Store app user files (like photos and documents) in Supabase Storage.
- Your project should use file upload and download somewhere, e.g. profile pictures or product photos.

## Deployment
- Your project should be deployed live on the Internet (e.g. in Netlify, Vercel or similar platform).
Provide sample credentials (e.g. demo / demo123) to simplify testing your app.

## GitHub Repo
Use a GitHub repo to hold your project assets.
Commit and push each successful change during the development.

## Documentation
- Generate a project documentation in your GitHub repository.
- Project description: describe briefly your project (what it does, who can do what, etc.).
- Architecture: front-end, back-end, technologies used, database, etc.
- Database schema design: visualize the main DB tables and their relationships.
- Local development setup guide.
- Key folders and files and their purpose.

3. Steps to Build the Project

Follow these sample steps (or similar) to build the app incrementally.

## Create a VS Code Project
## Create a new project workspace in VS Code.

## Setup Copilot Instructions

-- Write a simple Copilot agent instructions file (.github/copilot-instructions.md) to provide app context and general guidelines to the AI dev agent, based on the project requirements and technology stack:
- Brief project description
- Architecture and technology stack
- UI guidelines
- Pages and navigation guidelines
- Backend and database guidelines
- Authentication and authorization guidelines

## Setup GitHub Repo
## Setup Git and publish your project to a GitHub repo.

## Setup a Multi-Page App
- Create a multi-page app with routing and page navigation with Vite, JavaScript, HTML, CSS and Bootstrap and split the app in components, each in separate file (to avoid large amounts of code in a single file).
- Generate Vite config files from scratch.
- Use modular design, where components and pages have their own HTML, CSS and JS code.
- Split the site layout into components: header, page content, footer.
- Implement pages, routing and navigation between pages: to load page fragments and dynamically render the page (header, page components, footer).
- Implement URLs like these: /, /login, /dashboard, /projects/{id}/tasks

Commit and push to GitHub after the above functionality is implemented and works correctly.

## Create a Supabase Project
- Create a new project in Supabase to hold your app data, auth and storage.

## Connect Supabase MCP
- Connect Supabase MCP in VS Code to access your Supabase project.
- Commit and push to GitHub after the above functionality is implemented and works correctly.

## Design the Database
- Initially design the app database schema (simplified, not full for now):
- Users (use Supabase Auth)
- Customers (name, address, customer_id, owner)
- Customer Projects (title, description, customer_id, owner)
- Project stages for each project (name, position)
- Tasks for each project (title, description, position, status)
- Visits (customer_id, sales_rep_id, visit_date, notes, outcome)

Note:
Don't add Project members table (to connect users with projects).
This is too complex and may cause serious issues.
We shall work on this later.

## Row Level Security (RLS)
Implement RLS policies so that each user can access only:
Their own customers
Projects belonging to their customers
Stages of their projects
Tasks of their projects
Visits assigned to them or their customers

## Database Creation
When ready:
Create the database by applying Supabase migrations.
Pull DB migrations from Supabase to local SQL migration scripts.
Commit and push to GitHub after the above functionality is implemented and works correctly.

## Seed Sample Data

- Create a JS script to seed sample data into the database.
Register sample users in Supabase Auth:

steve@gmail.com / pass123
maria@gmail.com / pass123
peter@gmail.com / pass123

- Ask the AI dev agent to seed sample data using the existing users:
- Create 4 customers
- Create 4 customer projects — one per customer
- Define default stages for each project:

    - New | In Progress | Completed

- Define sample tasks:
    - 10–12 tasks per project (distributed across stages)
- Create sample visits:
    - 2–3 visits per customer with notes and outcomes

## Implement the Index Page

- The Index page is the landing page for site visitors where they learn about the CRM and can register or log in.
URL: /
- Create appropriate CRM landing page content explaining:
- Customer management
- Sales tracking
- Visit management
- Project and task organization
- Commit and push to GitHub after the above functionality is implemented and works correctly.

## Implement Register / Login
- Implement user:

    - Register
    - Login
    - Logout

- Switch off email confirmations in Supabase Auth.
- Create register/login page:

    - URL: /login

- Behavior:
    - After successful login → redirect to Dashboard
    - After logout → redirect to Index

- Commit and push to GitHub after the above functionality is implemented and works correctly.

## Toast Notifications

- Implement toast notifications.

- Display:
    - Errors as toast notifications
    - Info notifications after significant user actions:
    - customer created
    - project updated
    - visit recorded
    - task edited

- Do not show notifications for obvious actions (e.g., 
login successful).

## Implement the Dashboard Page

- The Dashboard page is the home page for logged-in users.

- URL: /dashboard
- Display:
    - Total number of customers
    - Total number of customer projects
    - Total tasks:
    - Open
    - Completed
    - Upcoming visits count
    - Link to Customers page

- Commit and push to GitHub after the above functionality is implemented and works correctly.

## Implement Customers Page

- The Customers page for logged-in users.

- URL: /customers
- Users see customers in a table:
    Name | Address | Unique Number | Projects | Upcoming Visits
- Requirements:
    - Truncate long fields
    - Calculate number of projects per customer
    - Show upcoming visits count
- Users can:
    - View / Create / Edit / Delete customers
- Separate pages:
    /customer/add
    /customer/{id}/edit
- Use popup confirmation for delete.
- Add links:
    [View Projects]
    [View Visits]

- Commit and push to GitHub after the above functionality is implemented and works correctly.

## Implement Customer Projects Page
- URL: /customer/{id}/projects
- Display projects related to the selected customer:
    Title | Description | Stages | Open Tasks | Tasks Done
- Requirements:
    - Truncate description when long
    - Show number of stages
    - Calculate open vs completed tasks
- Users can:
    View / Create / Edit / Delete projects
- Pages:
    /project/add
    /project/{id}/edit
- Add link:
    [Manage Tasks]
- Commit and push to GitHub after the above functionality is implemented and works correctly.

## Implement View Tasks Page

- The Tasks page visualizes tasks for a selected customer project.
- URL: /project/{id}/tasks
- Requirements:
    - Display project stages as columns
    - Display tasks as cards inside columns
    - Implement horizontal and vertical scrolling when content overflows

- Commit and push to GitHub after the above functionality is implemented and works correctly.

## Implement Add / Edit / Delete Task
- Inside the Tasks page:
    - Add / Edit / Delete task using popups
    - Confirmation dialog for delete
- UI requirements:
    - Show [Add New Task] button in each column (large "+" button)
- Commit and push to GitHub after the above functionality is implemented and works correctly.

## Implement Move Task
- Implement Trello-style task movement using drag and drop.
- Users must be able to:
    - Move tasks between stages (horizontal move)
    - Reorder tasks within a stage (vertical move)
- Commit and push to GitHub after the above functionality is implemented and works correc

## Deploy to Netlify

- Create a new Netlify project, connect to the GitHub repo.
- Create the required environment variables.


4. Additional Functionality

## Attachments
- Attach screenshots and documents to CRM tasks and visits.
- Requirements:
- Allow file uploads related to:
    - Tasks
    - Customer visits
    - Customer projects (optional extension)

- Use Supabase Storage to store uploaded files.
- Store file metadata in database tables (file name, owner, related entity, upload date).


## Implement Project Team Members (CRM Project Access)

- In the Customer Projects area implement Assign user to project functionality.
- URL: /projects/{id}/users
- Project owners can assign or remove sales representatives from customer projects.
- Requirements
    - Display all users assigned to the project in a table.
    - Implement [Add User] popup:
    - Lists all application users
    - Includes search box


- Implement [Remove User] with confirmation popup.

## Database Changes
- Create table:
    - project_members (project_id, user_id)

## Application Logic Update
- Modify existing functionality so that:
- Users see projects where they are owner OR assigned member
- Not only projects they created themselves.

## Update RLS Policies
- Modify RLS policies for:
    - customer_projects
    - project_members
    - project_stages
    - tasks
    - visits (if linked to project)
- Users can access project data when:
    - They are the project owner, or
    - They are an assigned project member


- Commit and push to GitHub after the above functionality is implemented and works correctly.

## Real-Time Sync
- Implement automatic real-time updates.
- In a multi-user CRM environment, several sales representatives may work on the same customer project simultaneously.
- Requirements:
    - When a task is added, edited, moved, or deleted:
    - Automatically refresh task boards for other users

- Do NOT perform full page reload
- Use Supabase real-time subscriptions.

## Admin Panel
- Implement admin role and Admin Panel.
- The admin panel allows system-wide CRM management.
- Admin capabilities:
    - Customer Projects
        - List / view / edit / delete projects
    - Project Stages
        - List / view / edit / delete stages per project

    - Tasks
        - List / view / edit / delete tasks
    - Customers
        - List / view / edit / delete customers
        - Users / Sales Representatives
        - List / view / edit / delete users

## Paging / Infinite Scrolling
- Tasks Scaling
    - Insert 100+ tasks per project
    - Handle performance issues
    - Implement infinite scrolling to dynamically load tasks when columns contain many items.

- Projects Scaling
    - Insert 100+ customer projects
    - Implement paging for the projects table.
## Comments
- Add comments (discussion) for each task.
- Purpose:
    - Internal team collaboration
    - Communication history related to customer work

- Each comment includes:
    - Author
    - Timestamp
    - Message content

## Assignees
- Allow assigning users (sales representatives) to tasks.
- Each task has:
    - Responsible person (assignee)
    - Visible ownership in task card

## Task Labels
- Implement task labels (tags).
- Examples:
    - Sales
    - Follow-up
    - Support
    - Urgent


- Requirements:
    - Assign labels to tasks
    - Create screen to view/filter tasks by label.
## Task Deadlines
- Implement deadlines for tasks.
Features:
- Due date field
- Visual deadline indicator
- Screen to view tasks by deadline (e.g., upcoming or overdue).

## Checklists
- Implement checklists inside tasks.
- Checklist structure:
- Ordered list of subtasks
- Each item marked:
    - Pending
    - Done

- Used for structured sales or project workflows.

## Activity Log
- Implement activity logs for tasks.
- Track every change including:
    - Task created
    - Status changed
    - Assignee changed
    - Comment added
    - Task moved between stages
    - Task edited or deleted


- The activity log provides full audit history for CRM operations.


