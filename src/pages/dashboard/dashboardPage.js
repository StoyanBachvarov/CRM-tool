import { getDashboardCounts } from '../../services/tasksService';

export async function renderDashboardPage(container, { showToast }) {
  try {
    const summary = await getDashboardCounts();

    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2 class="mb-0">Dashboard</h2>
        <a href="/customers" class="btn btn-primary">Go to Customers</a>
      </div>

      <div class="row g-3">
        ${renderCard('Customers', summary.customers, 'bi-people', '/customers')}
        ${renderCard('Projects', summary.projects, 'bi-kanban', '/projects')}
        ${renderCard('Open Tasks', summary.openTasks, 'bi-list-check', '/tasks')}
        ${renderCard('Completed Tasks', summary.completedTasks, 'bi-check2-circle', '/tasks')}
        ${renderCard('Upcoming Visits', summary.upcomingVisits, 'bi-calendar-event', '/visits')}
      </div>
    `;
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

function renderCard(label, value, icon, href) {
  return `
    <div class="col-sm-6 col-lg-4 col-xl-3">
      <a href="${href}" class="text-decoration-none text-reset d-block h-100">
        <div class="card shadow-sm h-100">
          <div class="card-body d-flex align-items-center gap-3">
            <i class="bi ${icon} fs-2 text-primary"></i>
            <div>
              <h6 class="text-muted mb-1">${label}</h6>
              <h3 class="mb-0">${value}</h3>
            </div>
          </div>
        </div>
      </a>
    </div>
  `;
}
