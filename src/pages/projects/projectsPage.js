import { listCustomers } from '../../services/customersService';
import { deleteProject, getProjectTaskStats, getStageCountByProject, listProjects, upsertProject } from '../../services/projectsService';
import { getTasksUrlForProject } from '../../router';

export async function renderProjectsPage(container, { showToast, user }) {
  const url = new URL(window.location.href);
  const selectedCustomerId = url.searchParams.get('customerId') || '';

  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="mb-0">Projects per Customer</h2>
      <button class="btn btn-primary" id="add-project-btn"><i class="bi bi-plus-lg me-1"></i>Add Project</button>
    </div>

    <div class="card shadow-sm mb-3 p-3">
      <div class="row g-3 align-items-end">
        <div class="col-md-5">
          <label class="form-label">Filter by Customer</label>
          <select class="form-select" id="customer-filter"></select>
        </div>
      </div>
    </div>

    <div class="card shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover mb-0" id="projects-table">
          <thead class="table-light">
            <tr>
              <th>Title</th>
              <th>Description</th>
              <th>Customer</th>
              <th>Stages</th>
              <th>Open Tasks</th>
              <th>Tasks Done</th>
              <th style="width: 210px;">Actions</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <div class="modal fade" id="projectModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <form id="project-form">
            <div class="modal-header">
              <h5 class="modal-title">Project</h5>
              <button class="btn-close" data-bs-dismiss="modal" type="button"></button>
            </div>
            <div class="modal-body row g-3">
              <input type="hidden" name="id" />
              <div class="col-md-6"><label class="form-label">Customer</label><select class="form-select" name="customer_id" required></select></div>
              <div class="col-md-6"><label class="form-label">Title</label><input class="form-control" name="title" required /></div>
              <div class="col-12"><label class="form-label">Description</label><textarea class="form-control" name="description" rows="4"></textarea></div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline-secondary" type="button" data-bs-dismiss="modal">Cancel</button>
              <button class="btn btn-primary" type="submit">Save</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  const tableBody = container.querySelector('#projects-table tbody');
  const customerFilter = document.getElementById('customer-filter');
  const form = document.getElementById('project-form');
  const projectModal = new window.bootstrap.Modal(document.getElementById('projectModal'));

  let customers = [];
  let projects = [];

  async function initialize() {
    customers = await listCustomers();

    customerFilter.innerHTML = [
      '<option value="">All Customers</option>',
      ...customers.map((c) => `<option value="${c.id}" ${c.id === selectedCustomerId ? 'selected' : ''}>${c.name}</option>`)
    ].join('');

    form.elements.customer_id.innerHTML = customers.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');

    await loadProjects(customerFilter.value || selectedCustomerId || '');
  }

  async function loadProjects(customerId) {
    projects = await listProjects(customerId || undefined);

    const projectIds = projects.map((project) => project.id);
    const [taskStats, stageCounts] = await Promise.all([
      getProjectTaskStats(projectIds),
      getStageCountByProject(projectIds)
    ]);

    tableBody.innerHTML = projects
      .map((project) => {
        const stats = taskStats.get(project.id) || { open: 0, completed: 0 };
        const stageCount = stageCounts.get(project.id) || 0;
        return `
          <tr>
            <td>${project.title}</td>
            <td title="${project.description || ''}">${truncate(project.description || '-', 45)}</td>
            <td>${project.customers?.name || '-'}</td>
            <td>${stageCount}</td>
            <td>${stats.open}</td>
            <td>${stats.completed}</td>
            <td class="text-nowrap">
              <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${project.id}">Edit</button>
              <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${project.id}">Delete</button>
              <a class="btn btn-sm btn-outline-secondary" href="${getTasksUrlForProject(project.id)}">Manage Tasks</a>
            </td>
          </tr>
        `;
      })
      .join('');

    bindActions();
  }

  function bindActions() {
    tableBody.querySelectorAll('.edit-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const project = projects.find((item) => item.id === button.dataset.id);
        fillForm(project);
        projectModal.show();
      });
    });

    tableBody.querySelectorAll('.delete-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!window.confirm('Delete this project?')) return;
        try {
          await deleteProject(button.dataset.id);
          showToast('Project deleted');
          await loadProjects(customerFilter.value || undefined);
        } catch (error) {
          showToast(error.message, 'danger');
        }
      });
    });
  }

  function fillForm(project) {
    form.reset();
    form.elements.id.value = project.id;
    form.elements.customer_id.value = project.customer_id;
    form.elements.title.value = project.title || '';
    form.elements.description.value = project.description || '';
  }

  document.getElementById('add-project-btn').addEventListener('click', () => {
    form.reset();
    form.elements.id.value = '';
    if (customerFilter.value) {
      form.elements.customer_id.value = customerFilter.value;
    }
    projectModal.show();
  });

  customerFilter.addEventListener('change', async () => {
    await loadProjects(customerFilter.value || undefined);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());

    payload.owner_id = user.id;
    if (!payload.id) {
      delete payload.id;
    }

    try {
      await upsertProject(payload);
      projectModal.hide();
      showToast(payload.id ? 'Project updated' : 'Project created');
      await loadProjects(customerFilter.value || undefined);
    } catch (error) {
      showToast(error.message, 'danger');
    }
  });

  try {
    await initialize();
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}...`;
}
