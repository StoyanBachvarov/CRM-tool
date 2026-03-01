import { listCustomers } from '../../services/customersService';
import { deleteProject, getProjectTaskStats, getStageCountByProject, listProjects, upsertProject } from '../../services/projectsService';
import { getProjectUsersUrlForProject, getTasksUrlForProject } from '../../router';
import { deleteEntityAttachment, listEntityAttachments, uploadEntityAttachment } from '../../services/attachmentsService';
import { addProjectMember, listAllUsers, listProjectMembers, removeProjectMember } from '../../services/projectMembersService';

export async function renderProjectsPage(container, { showToast, user }) {
  const url = new URL(window.location.href);
  const pathname = window.location.pathname;
  const customerProjectsMatch = pathname.match(/^\/customer\/([^/]+)\/projects\/?$/);
  const selectedCustomerId = customerProjectsMatch ? decodeURIComponent(customerProjectsMatch[1]) : url.searchParams.get('customerId') || '';
  const isAddRoute = pathname === '/project/add';
  const editMatch = pathname.match(/^\/project\/([^/]+)\/edit\/?$/);
  const editProjectId = editMatch ? decodeURIComponent(editMatch[1]) : '';
  const usersMatch = pathname.match(/^\/projects\/([^/]+)\/users\/?$/);
  const usersProjectId = usersMatch ? decodeURIComponent(usersMatch[1]) : '';

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
              <th style="width: 300px;">Actions</th>
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

    <div class="modal fade" id="projectUsersModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="project-users-title">Project Users</h5>
            <button class="btn-close" data-bs-dismiss="modal" type="button"></button>
          </div>
          <div class="modal-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <div class="text-muted small" id="project-users-owner-note"></div>
              <button class="btn btn-primary btn-sm" id="project-users-add-btn" type="button">Add User</button>
            </div>
            <div class="table-responsive">
              <table class="table table-hover mb-0" id="project-users-table">
                <thead class="table-light">
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Assigned At</th>
                    <th style="width: 120px;">Actions</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary" type="button" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="addProjectUserModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Add User to Project</h5>
            <button class="btn-close" data-bs-dismiss="modal" type="button"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Search users</label>
              <input class="form-control" id="project-user-search" placeholder="Search by name, role, or user ID" />
            </div>
            <div class="table-responsive">
              <table class="table table-hover mb-0" id="project-user-candidates-table">
                <thead class="table-light">
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th style="width: 120px;">Action</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary" type="button" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="removeProjectUserModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Remove User</h5>
            <button class="btn-close" data-bs-dismiss="modal" type="button"></button>
          </div>
          <div class="modal-body" id="remove-project-user-message"></div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary" type="button" data-bs-dismiss="modal">Cancel</button>
            <button class="btn btn-danger" type="button" id="confirm-remove-project-user-btn">Remove</button>
          </div>
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
  const projectUsersModal = new window.bootstrap.Modal(document.getElementById('projectUsersModal'));
  const addProjectUserModal = new window.bootstrap.Modal(document.getElementById('addProjectUserModal'));
  const removeProjectUserModal = new window.bootstrap.Modal(document.getElementById('removeProjectUserModal'));

  const projectUsersTitle = document.getElementById('project-users-title');
  const projectUsersOwnerNote = document.getElementById('project-users-owner-note');
  const projectUsersAddBtn = document.getElementById('project-users-add-btn');
  const projectUsersTableBody = container.querySelector('#project-users-table tbody');
  const userSearchInput = document.getElementById('project-user-search');
  const userCandidatesTableBody = container.querySelector('#project-user-candidates-table tbody');
  const removeProjectUserMessage = document.getElementById('remove-project-user-message');
  const confirmRemoveProjectUserBtn = document.getElementById('confirm-remove-project-user-btn');

  let customers = [];
  let projects = [];
  let currentProjectId = '';
  let currentUsersProject = null;
  let currentProjectMembers = [];
  let allUsers = [];
  let selectedMemberForRemoval = null;

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
              ${project.owner_id === user.id ? `<button class="btn btn-sm btn-outline-primary edit-btn" data-id="${project.id}">Edit</button>` : ''}
              ${project.owner_id === user.id ? `<button class="btn btn-sm btn-outline-danger delete-btn" data-id="${project.id}">Delete</button>` : ''}
              <a class="btn btn-sm btn-outline-secondary" href="${getTasksUrlForProject(project.id)}">Manage Tasks</a>
              <a class="btn btn-sm btn-outline-secondary" href="${getProjectUsersUrlForProject(project.id)}">Users</a>
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

    tableBody.querySelectorAll('a[href^="/projects/"][href$="/users"]').forEach((link) => {
      link.addEventListener('click', async (event) => {
        event.preventDefault();
        const projectId = link.getAttribute('href').split('/')[2];
        const project = projects.find((item) => item.id === projectId);
        if (!project) {
          return;
        }
        await openProjectUsersModal(project);
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

  function isCurrentUserProjectOwner() {
    return Boolean(currentUsersProject) && currentUsersProject.owner_id === user.id;
  }

  async function openProjectUsersModal(project) {
    currentUsersProject = project;
    selectedMemberForRemoval = null;
    projectUsersTitle.textContent = `Project Users - ${project.title}`;

    const isOwner = isCurrentUserProjectOwner();
    projectUsersOwnerNote.textContent = isOwner
      ? 'You can assign or remove sales representatives from this project.'
      : 'Read-only view. Only the project owner can assign or remove users.';
    projectUsersAddBtn.classList.toggle('d-none', !isOwner);

    await loadProjectMembers();
    if (!allUsers.length) {
      allUsers = await listAllUsers();
    }

    userSearchInput.value = '';
    renderUserCandidates();
    projectUsersModal.show();
    window.history.pushState({}, '', getProjectUsersUrlForProject(project.id));
  }

  async function loadProjectMembers() {
    if (!currentUsersProject) {
      projectUsersTableBody.innerHTML = '';
      return;
    }

    currentProjectMembers = await listProjectMembers(currentUsersProject.id);
    renderProjectMembers();
  }

  function renderProjectMembers() {
    const isOwner = isCurrentUserProjectOwner();
    if (!currentProjectMembers.length) {
      projectUsersTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">No users assigned.</td></tr>';
      return;
    }

    projectUsersTableBody.innerHTML = currentProjectMembers
      .map((member) => {
        const profile = member.profiles || {};
        return `
          <tr>
            <td>
              <div>${escapeHtml(profile.full_name || 'Unknown user')}</div>
              <div class="small text-muted">${member.user_id}</div>
            </td>
            <td>${profile.role || 'sales_rep'}</td>
            <td>${new Date(member.created_at).toLocaleString()}</td>
            <td>
              ${
                isOwner
                  ? `<button class="btn btn-sm btn-outline-danger remove-project-user-btn" data-user-id="${member.user_id}">Remove</button>`
                  : ''
              }
            </td>
          </tr>
        `;
      })
      .join('');

    projectUsersTableBody.querySelectorAll('.remove-project-user-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const foundMember = currentProjectMembers.find((member) => member.user_id === button.dataset.userId);
        const userName = foundMember?.profiles?.full_name || button.dataset.userId;
        selectedMemberForRemoval = {
          userId: button.dataset.userId,
          userName
        };
        removeProjectUserMessage.textContent = `Remove ${userName} from this project?`;
        removeProjectUserModal.show();
      });
    });
  }

  function renderUserCandidates() {
    const searchTerm = userSearchInput.value.trim().toLowerCase();
    const memberIds = new Set(currentProjectMembers.map((member) => member.user_id));
    const isOwner = isCurrentUserProjectOwner();

    const filtered = allUsers.filter((profile) => {
      const haystack = `${profile.full_name || ''} ${profile.role || ''} ${profile.id}`.toLowerCase();
      return haystack.includes(searchTerm);
    });

    if (!filtered.length) {
      userCandidatesTableBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-3">No users found.</td></tr>';
      return;
    }

    userCandidatesTableBody.innerHTML = filtered
      .map((profile) => {
        const alreadyAssigned = memberIds.has(profile.id);
        return `
          <tr>
            <td>
              <div>${escapeHtml(profile.full_name || 'Unknown user')}</div>
              <div class="small text-muted">${profile.id}</div>
            </td>
            <td>${profile.role || 'sales_rep'}</td>
            <td>
              <button
                class="btn btn-sm ${alreadyAssigned ? 'btn-outline-secondary' : 'btn-outline-primary'} add-project-user-btn"
                data-user-id="${profile.id}"
                ${alreadyAssigned || !isOwner ? 'disabled' : ''}
              >${alreadyAssigned ? 'Assigned' : 'Add'}</button>
            </td>
          </tr>
        `;
      })
      .join('');

    userCandidatesTableBody.querySelectorAll('.add-project-user-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!currentUsersProject) {
          return;
        }

        try {
          await addProjectMember(currentUsersProject.id, button.dataset.userId);
          showToast('User assigned to project');
          await loadProjectMembers();
          renderUserCandidates();
        } catch (error) {
          showToast(error.message, 'danger');
        }
      });
    });
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

  document.getElementById('projectUsersModal').addEventListener('hidden.bs.modal', () => {
    currentUsersProject = null;
    currentProjectMembers = [];
    selectedMemberForRemoval = null;
    projectUsersTableBody.innerHTML = '';
    userCandidatesTableBody.innerHTML = '';

    const currentPath = window.location.pathname;
    if (/^\/projects\/[^/]+\/users\/?$/.test(currentPath)) {
      const basePath = selectedCustomerId ? `/customer/${selectedCustomerId}/projects` : '/projects';
      window.history.replaceState({}, '', basePath);
    }
  });

  projectUsersAddBtn.addEventListener('click', () => {
    if (!isCurrentUserProjectOwner()) {
      return;
    }
    userSearchInput.value = '';
    renderUserCandidates();
    addProjectUserModal.show();
  });

  userSearchInput.addEventListener('input', () => {
    renderUserCandidates();
  });

  confirmRemoveProjectUserBtn.addEventListener('click', async () => {
    if (!currentUsersProject || !selectedMemberForRemoval) {
      return;
    }

    try {
      await removeProjectMember(currentUsersProject.id, selectedMemberForRemoval.userId);
      removeProjectUserModal.hide();
      showToast('User removed from project');
      await loadProjectMembers();
      renderUserCandidates();
    } catch (error) {
      showToast(error.message, 'danger');
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

    if (usersProjectId) {
      const project = projects.find((item) => item.id === usersProjectId);
      if (project) {
        await openProjectUsersModal(project);
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
