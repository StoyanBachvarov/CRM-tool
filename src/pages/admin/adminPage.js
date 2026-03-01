import {
  deleteAdminCustomer,
  deleteAdminProject,
  deleteAdminProjectStage,
  deleteAdminTask,
  deleteAdminUser,
  listAdminCustomers,
  listAdminProjects,
  listAdminProjectStages,
  listAdminTasks,
  listAdminUsers,
  updateAdminCustomer,
  updateAdminProject,
  updateAdminProjectStage,
  updateAdminTask,
  updateAdminUser
} from '../../services/adminService';

export async function renderAdminPage(container, { showToast, user }) {
  if (user.role !== 'admin') {
    container.innerHTML = '<div class="alert alert-danger">Access denied. Admin role required.</div>';
    return;
  }

  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="mb-0">Admin Panel</h2>
      <button class="btn btn-outline-secondary" id="admin-refresh-btn">Refresh</button>
    </div>

    <div class="card shadow-sm mb-3">
      <div class="card-header fw-semibold">Customer Projects</div>
      <div class="table-responsive">
        <table class="table table-hover mb-0" id="admin-projects-table">
          <thead class="table-light">
            <tr>
              <th>Title</th>
              <th>Description</th>
              <th>Customer</th>
              <th>Owner</th>
              <th style="width: 160px;">Actions</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <div class="card shadow-sm mb-3">
      <div class="card-header d-flex justify-content-between align-items-center">
        <span class="fw-semibold">Project Stages</span>
        <select class="form-select form-select-sm" id="admin-stages-project-filter" style="max-width: 320px;"></select>
      </div>
      <div class="table-responsive">
        <table class="table table-hover mb-0" id="admin-stages-table">
          <thead class="table-light">
            <tr>
              <th>Name</th>
              <th>Position</th>
              <th style="width: 160px;">Actions</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <div class="card shadow-sm mb-3">
      <div class="card-header d-flex justify-content-between align-items-center">
        <span class="fw-semibold">Tasks</span>
        <select class="form-select form-select-sm" id="admin-tasks-project-filter" style="max-width: 320px;"></select>
      </div>
      <div class="table-responsive">
        <table class="table table-hover mb-0" id="admin-tasks-table">
          <thead class="table-light">
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Stage</th>
              <th>Assignee</th>
              <th style="width: 160px;">Actions</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <div class="card shadow-sm mb-3">
      <div class="card-header fw-semibold">Customers</div>
      <div class="table-responsive">
        <table class="table table-hover mb-0" id="admin-customers-table">
          <thead class="table-light">
            <tr>
              <th>Name</th>
              <th>Company</th>
              <th>Unique #</th>
              <th>Owner</th>
              <th style="width: 160px;">Actions</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <div class="card shadow-sm">
      <div class="card-header fw-semibold">Users / Sales Representatives</div>
      <div class="table-responsive">
        <table class="table table-hover mb-0" id="admin-users-table">
          <thead class="table-light">
            <tr>
              <th>User ID</th>
              <th>Full Name</th>
              <th>Role</th>
              <th style="width: 160px;">Actions</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;

  const projectsTableBody = container.querySelector('#admin-projects-table tbody');
  const stagesTableBody = container.querySelector('#admin-stages-table tbody');
  const tasksTableBody = container.querySelector('#admin-tasks-table tbody');
  const customersTableBody = container.querySelector('#admin-customers-table tbody');
  const usersTableBody = container.querySelector('#admin-users-table tbody');

  const stagesProjectFilter = document.getElementById('admin-stages-project-filter');
  const tasksProjectFilter = document.getElementById('admin-tasks-project-filter');

  let projects = [];
  let stages = [];
  let tasks = [];
  let customers = [];
  let usersList = [];

  async function loadAll() {
    [projects, customers, usersList] = await Promise.all([listAdminProjects(), listAdminCustomers(), listAdminUsers()]);

    const projectOptions = [
      '<option value="">Select project</option>',
      ...projects.map((project) => `<option value="${project.id}">${escapeHtml(project.title)}</option>`)
    ].join('');

    stagesProjectFilter.innerHTML = projectOptions;
    tasksProjectFilter.innerHTML = projectOptions;

    if (!stagesProjectFilter.value && projects.length) {
      stagesProjectFilter.value = projects[0].id;
    }
    if (!tasksProjectFilter.value && projects.length) {
      tasksProjectFilter.value = projects[0].id;
    }

    await Promise.all([loadStages(), loadTasks()]);

    renderProjects();
    renderCustomers();
    renderUsers();
  }

  async function loadStages() {
    stages = stagesProjectFilter.value ? await listAdminProjectStages(stagesProjectFilter.value) : [];
    renderStages();
  }

  async function loadTasks() {
    tasks = tasksProjectFilter.value ? await listAdminTasks(tasksProjectFilter.value) : [];
    renderTasks();
  }

  function renderProjects() {
    projectsTableBody.innerHTML = projects
      .map(
        (project) => `
          <tr>
            <td><input class="form-control form-control-sm admin-project-title" data-id="${project.id}" value="${escapeHtml(project.title || '')}" /></td>
            <td><input class="form-control form-control-sm admin-project-description" data-id="${project.id}" value="${escapeHtml(project.description || '')}" /></td>
            <td>${escapeHtml(project.customers?.name || '-')}</td>
            <td class="small text-muted">${project.owner_id}</td>
            <td>
              <button class="btn btn-sm btn-primary admin-project-save" data-id="${project.id}">Save</button>
              <button class="btn btn-sm btn-outline-danger admin-project-delete" data-id="${project.id}">Delete</button>
            </td>
          </tr>
        `
      )
      .join('');

    projectsTableBody.querySelectorAll('.admin-project-save').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.dataset.id;
        const title = projectsTableBody.querySelector(`.admin-project-title[data-id="${id}"]`).value.trim();
        const description = projectsTableBody.querySelector(`.admin-project-description[data-id="${id}"]`).value;

        if (!title) {
          showToast('Project title is required.', 'danger');
          return;
        }

        try {
          await updateAdminProject(id, { title, description });
          showToast('Project updated');
          await loadAll();
        } catch (error) {
          showToast(error.message, 'danger');
        }
      });
    });

    projectsTableBody.querySelectorAll('.admin-project-delete').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!window.confirm('Delete this project?')) return;
        try {
          await deleteAdminProject(button.dataset.id);
          showToast('Project deleted');
          await loadAll();
        } catch (error) {
          showToast(error.message, 'danger');
        }
      });
    });
  }

  function renderStages() {
    stagesTableBody.innerHTML = stages
      .map(
        (stage) => `
          <tr>
            <td><input class="form-control form-control-sm admin-stage-name" data-id="${stage.id}" value="${escapeHtml(stage.name || '')}" /></td>
            <td><input class="form-control form-control-sm admin-stage-position" data-id="${stage.id}" type="number" min="1" value="${stage.position || 1}" /></td>
            <td>
              <button class="btn btn-sm btn-primary admin-stage-save" data-id="${stage.id}">Save</button>
              <button class="btn btn-sm btn-outline-danger admin-stage-delete" data-id="${stage.id}">Delete</button>
            </td>
          </tr>
        `
      )
      .join('');

    stagesTableBody.querySelectorAll('.admin-stage-save').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.dataset.id;
        const name = stagesTableBody.querySelector(`.admin-stage-name[data-id="${id}"]`).value.trim();
        const position = Number(stagesTableBody.querySelector(`.admin-stage-position[data-id="${id}"]`).value || 1);

        if (!name) {
          showToast('Stage name is required.', 'danger');
          return;
        }

        try {
          await updateAdminProjectStage(id, { name, position });
          showToast('Stage updated');
          await loadStages();
        } catch (error) {
          showToast(error.message, 'danger');
        }
      });
    });

    stagesTableBody.querySelectorAll('.admin-stage-delete').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!window.confirm('Delete this stage?')) return;
        try {
          await deleteAdminProjectStage(button.dataset.id);
          showToast('Stage deleted');
          await loadStages();
        } catch (error) {
          showToast(error.message, 'danger');
        }
      });
    });
  }

  function renderTasks() {
    const stageOptions = stages.map((stage) => `<option value="${stage.id}">${escapeHtml(stage.name)}</option>`).join('');
    const userOptions = ['<option value="">Unassigned</option>', ...usersList.map((profile) => `<option value="${profile.id}">${escapeHtml(profile.full_name || profile.id)}</option>`)].join('');

    tasksTableBody.innerHTML = tasks
      .map(
        (task) => `
          <tr>
            <td><input class="form-control form-control-sm admin-task-title" data-id="${task.id}" value="${escapeHtml(task.title || '')}" /></td>
            <td>
              <select class="form-select form-select-sm admin-task-status" data-id="${task.id}">
                <option value="open" ${task.status === 'open' ? 'selected' : ''}>Open</option>
                <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
              </select>
            </td>
            <td>
              <select class="form-select form-select-sm admin-task-stage" data-id="${task.id}">${stageOptions}</select>
            </td>
            <td>
              <select class="form-select form-select-sm admin-task-assignee" data-id="${task.id}">${userOptions}</select>
            </td>
            <td>
              <button class="btn btn-sm btn-primary admin-task-save" data-id="${task.id}">Save</button>
              <button class="btn btn-sm btn-outline-danger admin-task-delete" data-id="${task.id}">Delete</button>
            </td>
          </tr>
        `
      )
      .join('');

    tasks.forEach((task) => {
      const stageSelect = tasksTableBody.querySelector(`.admin-task-stage[data-id="${task.id}"]`);
      const assigneeSelect = tasksTableBody.querySelector(`.admin-task-assignee[data-id="${task.id}"]`);
      if (stageSelect) stageSelect.value = task.stage_id || '';
      if (assigneeSelect) assigneeSelect.value = task.assigned_sales_rep_id || '';
    });

    tasksTableBody.querySelectorAll('.admin-task-save').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.dataset.id;
        const title = tasksTableBody.querySelector(`.admin-task-title[data-id="${id}"]`).value.trim();
        const status = tasksTableBody.querySelector(`.admin-task-status[data-id="${id}"]`).value;
        const stageId = tasksTableBody.querySelector(`.admin-task-stage[data-id="${id}"]`).value;
        const assignedSalesRepId = tasksTableBody.querySelector(`.admin-task-assignee[data-id="${id}"]`).value || null;

        if (!title || !stageId) {
          showToast('Task title and stage are required.', 'danger');
          return;
        }

        try {
          await updateAdminTask(id, {
            title,
            status,
            stage_id: stageId,
            assigned_sales_rep_id: assignedSalesRepId
          });
          showToast('Task updated');
          await loadTasks();
        } catch (error) {
          showToast(error.message, 'danger');
        }
      });
    });

    tasksTableBody.querySelectorAll('.admin-task-delete').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!window.confirm('Delete this task?')) return;
        try {
          await deleteAdminTask(button.dataset.id);
          showToast('Task deleted');
          await loadTasks();
        } catch (error) {
          showToast(error.message, 'danger');
        }
      });
    });
  }

  function renderCustomers() {
    customersTableBody.innerHTML = customers
      .map(
        (customer) => `
          <tr>
            <td><input class="form-control form-control-sm admin-customer-name" data-id="${customer.id}" value="${escapeHtml(customer.name || '')}" /></td>
            <td><input class="form-control form-control-sm admin-customer-company" data-id="${customer.id}" value="${escapeHtml(customer.company || '')}" /></td>
            <td>${escapeHtml(customer.unique_number || '-')}</td>
            <td class="small text-muted">${customer.owner_id}</td>
            <td>
              <button class="btn btn-sm btn-primary admin-customer-save" data-id="${customer.id}">Save</button>
              <button class="btn btn-sm btn-outline-danger admin-customer-delete" data-id="${customer.id}">Delete</button>
            </td>
          </tr>
        `
      )
      .join('');

    customersTableBody.querySelectorAll('.admin-customer-save').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.dataset.id;
        const name = customersTableBody.querySelector(`.admin-customer-name[data-id="${id}"]`).value.trim();
        const company = customersTableBody.querySelector(`.admin-customer-company[data-id="${id}"]`).value.trim();

        if (!name) {
          showToast('Customer name is required.', 'danger');
          return;
        }

        try {
          await updateAdminCustomer(id, { name, company });
          showToast('Customer updated');
          await loadAll();
        } catch (error) {
          showToast(error.message, 'danger');
        }
      });
    });

    customersTableBody.querySelectorAll('.admin-customer-delete').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!window.confirm('Delete this customer?')) return;
        try {
          await deleteAdminCustomer(button.dataset.id);
          showToast('Customer deleted');
          await loadAll();
        } catch (error) {
          showToast(error.message, 'danger');
        }
      });
    });
  }

  function renderUsers() {
    usersTableBody.innerHTML = usersList
      .map(
        (profile) => `
          <tr>
            <td class="small text-muted">${profile.id}</td>
            <td><input class="form-control form-control-sm admin-user-name" data-id="${profile.id}" value="${escapeHtml(profile.full_name || '')}" /></td>
            <td>
              <select class="form-select form-select-sm admin-user-role" data-id="${profile.id}">
                <option value="sales_rep" ${profile.role === 'sales_rep' ? 'selected' : ''}>Sales Rep</option>
                <option value="admin" ${profile.role === 'admin' ? 'selected' : ''}>Admin</option>
              </select>
            </td>
            <td>
              <button class="btn btn-sm btn-primary admin-user-save" data-id="${profile.id}">Save</button>
              <button class="btn btn-sm btn-outline-danger admin-user-delete" data-id="${profile.id}">Delete</button>
            </td>
          </tr>
        `
      )
      .join('');

    usersTableBody.querySelectorAll('.admin-user-save').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.dataset.id;
        const fullName = usersTableBody.querySelector(`.admin-user-name[data-id="${id}"]`).value.trim() || 'Sales Rep';
        const role = usersTableBody.querySelector(`.admin-user-role[data-id="${id}"]`).value;

        try {
          await updateAdminUser(id, { full_name: fullName, role });
          showToast('User updated');
          await loadAll();
        } catch (error) {
          showToast(error.message, 'danger');
        }
      });
    });

    usersTableBody.querySelectorAll('.admin-user-delete').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!window.confirm('Delete this user profile? This may remove related CRM data.')) return;
        try {
          await deleteAdminUser(button.dataset.id);
          showToast('User deleted');
          await loadAll();
        } catch (error) {
          showToast(error.message, 'danger');
        }
      });
    });
  }

  document.getElementById('admin-refresh-btn').addEventListener('click', async () => {
    try {
      await loadAll();
      showToast('Admin data refreshed');
    } catch (error) {
      showToast(error.message, 'danger');
    }
  });

  stagesProjectFilter.addEventListener('change', async () => {
    try {
      await loadStages();
    } catch (error) {
      showToast(error.message, 'danger');
    }
  });

  tasksProjectFilter.addEventListener('change', async () => {
    try {
      await loadTasks();
    } catch (error) {
      showToast(error.message, 'danger');
    }
  });

  try {
    await loadAll();
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
