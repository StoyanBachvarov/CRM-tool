import { listTaskLabels, listTasksByLabel } from '../../services/tasksService';

export async function renderTaskLabelsPage(container, { showToast }) {
  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="mb-0">Tasks by Label</h2>
    </div>

    <div class="card shadow-sm mb-3 p-3">
      <div class="row g-3 align-items-end">
        <div class="col-md-6">
          <label class="form-label">Label</label>
          <select class="form-select" id="task-label-filter"></select>
        </div>
      </div>
    </div>

    <div class="card shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover mb-0" id="task-labels-table">
          <thead class="table-light">
            <tr>
              <th>Task</th>
              <th>Project</th>
              <th>Stage</th>
              <th>Assignee</th>
              <th>Status</th>
              <th>Labels</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;

  const labelFilter = document.getElementById('task-label-filter');
  const tableBody = container.querySelector('#task-labels-table tbody');

  let labels = [];

  function renderRows(tasks) {
    if (!tasks.length) {
      tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">No tasks found.</td></tr>';
      return;
    }

    tableBody.innerHTML = tasks
      .map((task) => {
        const labelsHtml = (task.task_label_assignments || [])
          .map((item) => item.task_labels)
          .filter(Boolean)
          .map((label) => `<span class="badge text-bg-${label.color || 'secondary'} me-1">${escapeHtml(label.name)}</span>`)
          .join('');

        return `
          <tr>
            <td>
              <div class="fw-semibold">${escapeHtml(task.title || '-')}</div>
              <div class="small text-muted text-truncate" style="max-width: 280px;">${escapeHtml(task.description || '')}</div>
            </td>
            <td>${escapeHtml(task.customer_projects?.title || '-')}</td>
            <td>${escapeHtml(task.project_stages?.name || '-')}</td>
            <td>${escapeHtml(task.profiles?.full_name || 'Unassigned')}</td>
            <td><span class="badge text-bg-light">${escapeHtml(task.status || 'open')}</span></td>
            <td>${labelsHtml || '<span class="text-muted">-</span>'}</td>
          </tr>
        `;
      })
      .join('');
  }

  async function loadTasks() {
    const selected = labelFilter.value || '';
    const tasks = await listTasksByLabel(selected || undefined);
    renderRows(tasks);
  }

  try {
    labels = await listTaskLabels();
    labelFilter.innerHTML = [
      '<option value="">All labels</option>',
      ...labels.map((label) => `<option value="${label.id}">${escapeHtml(label.name)}</option>`)
    ].join('');

    await loadTasks();

    labelFilter.addEventListener('change', async () => {
      try {
        await loadTasks();
      } catch (error) {
        showToast(error.message, 'danger');
      }
    });
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
