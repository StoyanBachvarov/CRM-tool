import { listCustomers } from '../../services/customersService';
import { deleteProject, getProjectTaskStats, getStageCountByProject, listProjects, upsertProject } from '../../services/projectsService';
import { getTasksUrlForProject } from '../../router';
import { deleteEntityAttachment, listEntityAttachments, uploadEntityAttachment } from '../../services/attachmentsService';

export async function renderProjectsPage(container, { showToast, user }) {
  const url = new URL(window.location.href);
  const pathname = window.location.pathname;
  const customerProjectsMatch = pathname.match(/^\/customer\/([^/]+)\/projects\/?$/);
  const selectedCustomerId = customerProjectsMatch ? decodeURIComponent(customerProjectsMatch[1]) : url.searchParams.get('customerId') || '';
  const isAddRoute = pathname === '/project/add';
  const editMatch = pathname.match(/^\/project\/([^/]+)\/edit\/?$/);
  const editProjectId = editMatch ? decodeURIComponent(editMatch[1]) : '';

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
              <div class="col-12">
                <label class="form-label">Attachments</label>
                <div class="d-flex gap-2 flex-wrap mb-2">
                  <input class="form-control" type="file" id="project-attachment-input" accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx" />
                  <button type="button" class="btn btn-outline-secondary" id="project-attachment-upload">Upload File</button>
                </div>
                <div class="form-text mb-2" id="project-attachment-hint">Save project first to enable file attachments.</div>
                <ul class="list-group" id="project-attachments-list"></ul>
              </div>
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
  const projectAttachmentInput = document.getElementById('project-attachment-input');
  const projectAttachmentUploadBtn = document.getElementById('project-attachment-upload');
  const projectAttachmentHint = document.getElementById('project-attachment-hint');
  const projectAttachmentsList = document.getElementById('project-attachments-list');
  const projectModal = new window.bootstrap.Modal(document.getElementById('projectModal'));

  let customers = [];
  let projects = [];
  let currentProjectId = '';

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
        openProjectModal(project);
        currentProjectId = project.id;
        loadProjectAttachments();
        window.history.pushState({}, '', `/project/${button.dataset.id}/edit`);
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

  function openProjectModal(project) {
    form.reset();
    form.elements.id.value = '';
    currentProjectId = '';
    if (customerFilter.value) {
      form.elements.customer_id.value = customerFilter.value;
    }
    if (project) {
      fillForm(project);
      currentProjectId = project.id;
    }
    renderProjectAttachments([]);
    syncProjectAttachmentState();
    projectModal.show();
  }

  function syncProjectAttachmentState() {
    const hasProject = Boolean(currentProjectId);
    projectAttachmentInput.disabled = !hasProject;
    projectAttachmentUploadBtn.disabled = !hasProject;
    projectAttachmentHint.textContent = hasProject
      ? 'Upload screenshots or documents related to this project.'
      : 'Save project first to enable file attachments.';
  }

  function renderProjectAttachments(attachments) {
    if (!attachments.length) {
      projectAttachmentsList.innerHTML = '<li class="list-group-item text-muted">No attachments yet.</li>';
      return;
    }

    projectAttachmentsList.innerHTML = attachments
      .map(
        (attachment) => `
          <li class="list-group-item d-flex justify-content-between align-items-center gap-2">
            <div class="text-truncate">
              <a href="${attachment.downloadUrl}" target="_blank" rel="noopener noreferrer" class="text-decoration-none">${attachment.file_name}</a>
              <div class="small text-muted">Uploaded ${new Date(attachment.created_at).toLocaleString()}</div>
            </div>
            <button type="button" class="btn btn-sm btn-outline-danger project-attachment-delete" data-id="${attachment.id}" data-path="${attachment.storage_path}">Delete</button>
          </li>
        `
      )
      .join('');
  }

  async function loadProjectAttachments() {
    syncProjectAttachmentState();
    if (!currentProjectId) {
      renderProjectAttachments([]);
      return;
    }

    const attachments = await listEntityAttachments('project', currentProjectId);
    renderProjectAttachments(attachments);
  }

  document.getElementById('add-project-btn').addEventListener('click', () => {
    openProjectModal();
    window.history.pushState({}, '', '/project/add');
  });

  document.getElementById('projectModal').addEventListener('hidden.bs.modal', () => {
    currentProjectId = '';
    projectAttachmentInput.value = '';
    renderProjectAttachments([]);
    syncProjectAttachmentState();

    const currentPath = window.location.pathname;
    if (currentPath === '/project/add' || /^\/project\/[^/]+\/edit\/?$/.test(currentPath)) {
      const basePath = selectedCustomerId ? `/customer/${selectedCustomerId}/projects` : '/projects';
      window.history.replaceState({}, '', basePath);
    }
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
      if (payload.id) {
        currentProjectId = payload.id;
      }
      projectModal.hide();
      showToast(payload.id ? 'Project updated' : 'Project created');
      await loadProjects(customerFilter.value || undefined);
    } catch (error) {
      showToast(error.message, 'danger');
    }
  });

  projectAttachmentUploadBtn.addEventListener('click', async () => {
    if (!currentProjectId) {
      showToast('Save project first to upload files.', 'danger');
      return;
    }

    const file = projectAttachmentInput.files?.[0];
    if (!file) {
      showToast('Select a file to upload.', 'danger');
      return;
    }

    try {
      await uploadEntityAttachment({
        entityType: 'project',
        entityId: currentProjectId,
        file,
        ownerId: user.id
      });
      projectAttachmentInput.value = '';
      await loadProjectAttachments();
      showToast('Project attachment uploaded');
    } catch (error) {
      showToast(error.message, 'danger');
    }
  });

  projectAttachmentsList.addEventListener('click', async (event) => {
    const button = event.target.closest('.project-attachment-delete');
    if (!button) {
      return;
    }

    if (!window.confirm('Delete this attachment?')) {
      return;
    }

    try {
      await deleteEntityAttachment({
        attachmentId: button.dataset.id,
        storagePath: button.dataset.path
      });
      await loadProjectAttachments();
      showToast('Project attachment deleted');
    } catch (error) {
      showToast(error.message, 'danger');
    }
  });

  try {
    await initialize();

    if (isAddRoute) {
      openProjectModal();
    }

    if (editProjectId) {
      const project = projects.find((item) => item.id === editProjectId);
      if (project) {
        openProjectModal(project);
        loadProjectAttachments();
      }
    }
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
