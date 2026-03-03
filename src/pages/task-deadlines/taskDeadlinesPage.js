import { listTasksByDeadline } from '../../services/tasksService';

export async function renderTaskDeadlinesPage(container, { showToast }) {
  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="mb-0">Task Deadlines</h2>
    </div>

    <div class="card shadow-sm mb-3 p-3">
      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-outline-primary deadline-filter active" data-filter="upcoming">Upcoming</button>
        <button class="btn btn-outline-primary deadline-filter" data-filter="overdue">Overdue</button>
        <button class="btn btn-outline-primary deadline-filter" data-filter="all">All Due Tasks</button>
      </div>
    </div>

    <div class="card shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover mb-0" id="deadline-tasks-table">
          <thead class="table-light">
            <tr>
              <th>Task</th>
              <th>Project</th>
              <th>Stage</th>
              <th>Assignee</th>
              <th>Status</th>
              <th>Due Date</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;

  const tbody = container.querySelector('#deadline-tasks-table tbody');
  const filterButtons = [...container.querySelectorAll('.deadline-filter')];
  let tasks = [];
  let selectedFilter = 'upcoming';

  function applyFilter() {
    const now = new Date();
    const upcomingLimit = new Date(now);
    upcomingLimit.setDate(upcomingLimit.getDate() + 7);

    return tasks.filter((task) => {
      const dueDate = new Date(task.due_date);
      if (Number.isNaN(dueDate.getTime())) {
        return false;
      }

      if (selectedFilter === 'overdue') {
        return dueDate < now && task.status !== 'completed';
      }

      if (selectedFilter === 'upcoming') {
        return dueDate >= now && dueDate <= upcomingLimit && task.status !== 'completed';
      }

      return true;
    });
  }

  function renderRows() {
    const rows = applyFilter();

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">No tasks found for this deadline filter.</td></tr>';
      return;
    }

    tbody.innerHTML = rows
      .map((task) => {
        const dueDate = new Date(task.due_date);
        const overdue = dueDate < new Date() && task.status !== 'completed';
        const dueText = dueDate.toLocaleString();

        return `
          <tr>
            <td>
              <div class="fw-semibold">${escapeHtml(task.title || '-')}</div>
              <div class="small text-muted text-truncate" style="max-width: 320px;">${escapeHtml(task.description || '')}</div>
            </td>
            <td>${escapeHtml(task.customer_projects?.title || '-')}</td>
            <td>${escapeHtml(task.project_stages?.name || '-')}</td>
            <td>${escapeHtml(task.profiles?.full_name || 'Unassigned')}</td>
            <td><span class="badge text-bg-light">${escapeHtml(task.status || 'open')}</span></td>
            <td><span class="badge ${overdue ? 'text-bg-danger' : 'text-bg-light'}">${escapeHtml(dueText)}</span></td>
          </tr>
        `;
      })
      .join('');
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      selectedFilter = button.dataset.filter;
      filterButtons.forEach((item) => item.classList.toggle('active', item === button));
      renderRows();
    });
  });

  try {
    tasks = await listTasksByDeadline();
    renderRows();
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
