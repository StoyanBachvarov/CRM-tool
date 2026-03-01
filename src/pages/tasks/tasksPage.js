import Sortable from 'sortablejs';
import { supabase } from '../../services/supabaseClient';
import { listProjects } from '../../services/projectsService';
import { listSalesReps } from '../../services/salesRepsService';
import {
  addTaskComment,
  deleteTask,
  listLabelsForTask,
  listProjectStages,
  listTaskComments,
  listTaskLabels,
  listTasksByProject,
  moveTask,
  replaceTaskLabels,
  upsertTask
} from '../../services/tasksService';
import { getProjectIdFromUrl } from '../../router';
import { deleteEntityAttachment, listEntityAttachments, uploadEntityAttachment } from '../../services/attachmentsService';

const INITIAL_TASK_BATCH = 25;
const TASK_BATCH_SIZE = 25;

export async function renderTasksPage(container, { showToast, user }) {
  const preselectedProjectId = getProjectIdFromUrl();

  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="mb-0">Tasks Board</h2>
    </div>

    <div class="card shadow-sm mb-3 p-3">
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label">Project</label>
          <select class="form-select" id="project-select"></select>
        </div>
      </div>
    </div>

    <div id="board-wrapper"></div>

    <div class="modal fade" id="taskModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <form id="task-form">
            <div class="modal-header">
              <h5 class="modal-title">Task</h5>
              <button class="btn-close" data-bs-dismiss="modal" type="button"></button>
            </div>
            <div class="modal-body row g-3">
              <input type="hidden" name="id" />
              <input type="hidden" name="project_id" />
              <div class="col-md-6"><label class="form-label">Stage</label><select class="form-select" name="stage_id" required></select></div>
              <div class="col-md-6"><label class="form-label">Assigned Sales Rep</label><select class="form-select" name="assigned_sales_rep_id"></select></div>
              <div class="col-12"><label class="form-label">Title</label><input class="form-control" name="title" required /></div>
              <div class="col-12"><label class="form-label">Description</label><textarea class="form-control" name="description" rows="4"></textarea></div>
              <div class="col-md-6"><label class="form-label">Status</label>
                <select class="form-select" name="status">
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label">Labels</label>
                <div class="border rounded p-2" id="task-labels-box" style="max-height: 140px; overflow-y: auto;"></div>
              </div>
              <div class="col-12">
                <label class="form-label">Attachments</label>
                <div class="d-flex gap-2 flex-wrap mb-2">
                  <input class="form-control" type="file" id="task-attachment-input" accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx" />
                  <button type="button" class="btn btn-outline-secondary" id="task-attachment-upload">Upload File</button>
                </div>
                <div class="form-text mb-2" id="task-attachment-hint">Save task first to enable file attachments.</div>
                <ul class="list-group" id="task-attachments-list"></ul>
              </div>
              <div class="col-12">
                <label class="form-label">Comments</label>
                <div class="border rounded p-2 mb-2" id="task-comments-list" style="max-height: 180px; overflow-y: auto;"></div>
                <div class="input-group">
                  <input class="form-control" id="task-comment-input" placeholder="Write a comment..." />
                  <button type="button" class="btn btn-outline-primary" id="add-task-comment-btn">Add</button>
                </div>
                <div class="form-text" id="task-comments-hint">Save task first to add comments.</div>
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

  const boardWrapper = document.getElementById('board-wrapper');
  const projectSelect = document.getElementById('project-select');
  const taskForm = document.getElementById('task-form');
  const taskAttachmentInput = document.getElementById('task-attachment-input');
  const taskAttachmentUploadBtn = document.getElementById('task-attachment-upload');
  const taskAttachmentHint = document.getElementById('task-attachment-hint');
  const taskAttachmentsList = document.getElementById('task-attachments-list');
  const taskLabelsBox = document.getElementById('task-labels-box');
  const taskCommentsList = document.getElementById('task-comments-list');
  const taskCommentInput = document.getElementById('task-comment-input');
  const addTaskCommentBtn = document.getElementById('add-task-comment-btn');
  const taskCommentsHint = document.getElementById('task-comments-hint');
  const taskModal = new window.bootstrap.Modal(document.getElementById('taskModal'));

  let projects = [];
  let stages = [];
  let tasks = [];
  let salesReps = [];
  let labels = [];
  let currentTaskId = '';
  let stageVisibleCounts = new Map();
  let tasksChannel = null;
  let realtimeRefreshTimer = null;

  async function initialize() {
    [projects, salesReps, labels] = await Promise.all([listProjects(), listSalesReps(), listTaskLabels()]);

    projectSelect.innerHTML = [
      '<option value="">Select project</option>',
      ...projects.map((project) => `<option value="${project.id}" ${project.id === preselectedProjectId ? 'selected' : ''}>${project.title}</option>`)
    ].join('');

    if (!projectSelect.value && projects.length) {
      projectSelect.value = projects[0].id;
    }

    taskForm.elements.assigned_sales_rep_id.innerHTML = [
      '<option value="">Unassigned</option>',
      ...salesReps.map((rep) => `<option value="${rep.id}">${rep.full_name || rep.id}</option>`)
    ].join('');

    renderLabelOptions([]);

    if (projectSelect.value) {
      await loadBoard(projectSelect.value);
    }
  }

  async function loadBoard(projectId) {
    [stages, tasks] = await Promise.all([listProjectStages(projectId), listTasksByProject(projectId)]);

    stageVisibleCounts = new Map(stages.map((stage) => [stage.id, INITIAL_TASK_BATCH]));

    taskForm.elements.project_id.value = projectId;
    taskForm.elements.stage_id.innerHTML = stages.map((stage) => `<option value="${stage.id}">${stage.name}</option>`).join('');

    renderBoard();
  }

  function clearTasksRealtimeSubscription() {
    if (tasksChannel && supabase) {
      supabase.removeChannel(tasksChannel);
    }
    tasksChannel = null;
    if (realtimeRefreshTimer) {
      window.clearTimeout(realtimeRefreshTimer);
      realtimeRefreshTimer = null;
    }
  }

  function subscribeToProjectTasks(projectId) {
    clearTasksRealtimeSubscription();

    if (!supabase || !projectId) {
      return;
    }

    tasksChannel = supabase
      .channel(`tasks-project-${projectId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `project_id=eq.${projectId}`
      }, async () => {
        if (realtimeRefreshTimer) {
          window.clearTimeout(realtimeRefreshTimer);
        }

        realtimeRefreshTimer = window.setTimeout(async () => {
          if (projectSelect.value !== projectId) {
            return;
          }

          try {
            await loadBoard(projectId);
          } catch {
            // no-op
          }
        }, 200);
      })
      .subscribe();
  }

  function renderBoard() {
    if (!stages.length) {
      boardWrapper.innerHTML = '<div class="alert alert-info">No stages found for this project.</div>';
      return;
    }

    boardWrapper.innerHTML = `
      <div class="kanban-board">
        ${stages
          .map((stage) => {
            const stageTasks = getStageTasks(stage.id);
            const visibleCount = stageVisibleCounts.get(stage.id) || INITIAL_TASK_BATCH;
            const visibleTasks = stageTasks.slice(0, visibleCount);
            return `
              <section class="kanban-column" data-stage-id="${stage.id}">
                <div class="kanban-column-header d-flex justify-content-between align-items-center">
                  <h6 class="mb-0">${stage.name}</h6>
                  <span class="badge text-bg-light">${stageTasks.length}</span>
                </div>
                <div class="kanban-task-list" data-stage-id="${stage.id}">
                  ${visibleTasks.map(renderTaskCard).join('')}
                  ${
                    stageTasks.length > visibleTasks.length
                      ? `<div class="text-center small text-muted py-2" data-load-hint="${stage.id}">Scroll to load more...</div>`
                      : ''
                  }
                </div>
                <button class="btn btn-outline-primary btn-lg add-task-btn" data-stage-id="${stage.id}">
                  <i class="bi bi-plus-lg me-2 fs-5"></i>Add New Task
                </button>
              </section>
            `;
          })
          .join('')}
      </div>
    `;

    initializeSortableLists();
    bindInfiniteScrollLoaders();
  }

  function renderTaskCard(task) {
    const taskLabels = (task.task_label_assignments || []).map((item) => item.task_labels).filter(Boolean);

    return `
      <article class="task-card" data-task-id="${task.id}">
        <div class="d-flex justify-content-between gap-2">
          <h6 class="mb-1">${task.title}</h6>
          <div class="dropdown">
            <button class="btn btn-sm btn-light" data-bs-toggle="dropdown"><i class="bi bi-three-dots"></i></button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li><button class="dropdown-item edit-task-btn" data-id="${task.id}" type="button">Edit</button></li>
              <li><button class="dropdown-item text-danger delete-task-btn" data-id="${task.id}" type="button">Delete</button></li>
            </ul>
          </div>
        </div>
        <p class="small text-muted mb-2">${task.description || '-'}</p>
        <div class="d-flex flex-wrap gap-1 mb-2">
          ${taskLabels.map((label) => `<span class="badge text-bg-${label.color || 'secondary'}">${label.name}</span>`).join('')}
        </div>
        <div class="small text-muted">${task.profiles?.full_name ? `Assignee: ${task.profiles.full_name}` : 'Unassigned'}</div>
      </article>
    `;
  }

  function getStageTasks(stageId) {
    return tasks.filter((task) => task.stage_id === stageId).sort((a, b) => (a.position || 0) - (b.position || 0));
  }

  function bindInfiniteScrollLoaders() {
    boardWrapper.querySelectorAll('.kanban-task-list').forEach((listElement) => {
      listElement.addEventListener('scroll', () => {
        if (listElement.scrollTop + listElement.clientHeight < listElement.scrollHeight - 80) {
          return;
        }

        const stageId = listElement.dataset.stageId;
        const currentVisible = stageVisibleCounts.get(stageId) || INITIAL_TASK_BATCH;
        const total = getStageTasks(stageId).length;

        if (currentVisible >= total) {
          return;
        }

        stageVisibleCounts.set(stageId, Math.min(total, currentVisible + TASK_BATCH_SIZE));
        renderBoard();
      });
    });
  }

  function initializeSortableLists() {
    const lists = boardWrapper.querySelectorAll('.kanban-task-list');

    lists.forEach((list) => {
      new Sortable(list, {
        group: 'crm-tasks',
        animation: 150,
        ghostClass: 'bg-light',
        onEnd: async (event) => {
          const movedTaskId = event.item.dataset.taskId;
          const destinationStageId = event.to.dataset.stageId;

          try {
            await syncPositions(event.to, destinationStageId);
            if (event.from !== event.to) {
              await syncPositions(event.from, event.from.dataset.stageId);
            }

            const movedTask = tasks.find((task) => task.id === movedTaskId);
            if (movedTask) {
              movedTask.stage_id = destinationStageId;
              movedTask.status = stageNameToStatus(getStageName(destinationStageId));
            }

            showToast('Task edited');
            await loadBoard(projectSelect.value);
          } catch (error) {
            showToast(error.message, 'danger');
            await loadBoard(projectSelect.value);
          }
        }
      });
    });
  }

  async function syncPositions(listElement, stageId) {
    const cards = [...listElement.querySelectorAll('.task-card')];

    for (let index = 0; index < cards.length; index += 1) {
      const taskId = cards[index].dataset.taskId;
      const position = index + 1;
      const status = stageNameToStatus(getStageName(stageId));
      await moveTask(taskId, stageId, position, status);
    }
  }

  function fillTaskForm(task) {
    taskForm.elements.id.value = task.id;
    taskForm.elements.project_id.value = task.project_id;
    taskForm.elements.stage_id.value = task.stage_id;
    taskForm.elements.assigned_sales_rep_id.value = task.assigned_sales_rep_id || '';
    taskForm.elements.title.value = task.title;
    taskForm.elements.description.value = task.description || '';
    taskForm.elements.status.value = task.status || 'open';
  }

  function renderLabelOptions(selectedLabelIds) {
    if (!labels.length) {
      taskLabelsBox.innerHTML = '<div class="text-muted small">No labels available.</div>';
      return;
    }

    const selected = new Set(selectedLabelIds || []);
    taskLabelsBox.innerHTML = labels
      .map(
        (label) => `
          <div class="form-check">
            <input class="form-check-input task-label-checkbox" type="checkbox" value="${label.id}" id="task-label-${label.id}" ${selected.has(label.id) ? 'checked' : ''}>
            <label class="form-check-label" for="task-label-${label.id}">
              <span class="badge text-bg-${label.color || 'secondary'} me-1">${label.name}</span>
            </label>
          </div>
        `
      )
      .join('');
  }

  async function loadTaskComments() {
    syncCommentsState();
    if (!currentTaskId) {
      taskCommentsList.innerHTML = '<div class="text-muted small">No comments yet.</div>';
      return;
    }

    const comments = await listTaskComments(currentTaskId);
    if (!comments.length) {
      taskCommentsList.innerHTML = '<div class="text-muted small">No comments yet.</div>';
      return;
    }

    taskCommentsList.innerHTML = comments
      .map(
        (comment) => `
          <div class="border rounded p-2 mb-2">
            <div class="small fw-semibold">${comment.profiles?.full_name || comment.author_id}</div>
            <div class="small text-muted mb-1">${new Date(comment.created_at).toLocaleString()}</div>
            <div>${escapeHtml(comment.message)}</div>
          </div>
        `
      )
      .join('');
  }

  function syncCommentsState() {
    const hasTask = Boolean(currentTaskId);
    taskCommentInput.disabled = !hasTask;
    addTaskCommentBtn.disabled = !hasTask;
    taskCommentsHint.textContent = hasTask ? 'Team discussion history for this task.' : 'Save task first to add comments.';
  }

  function syncTaskAttachmentState() {
    const hasTask = Boolean(currentTaskId);
    taskAttachmentInput.disabled = !hasTask;
    taskAttachmentUploadBtn.disabled = !hasTask;
    taskAttachmentHint.textContent = hasTask
      ? 'Upload screenshots or documents related to this task.'
      : 'Save task first to enable file attachments.';
  }

  function renderTaskAttachments(attachments) {
    if (!attachments.length) {
      taskAttachmentsList.innerHTML = '<li class="list-group-item text-muted">No attachments yet.</li>';
      return;
    }

    taskAttachmentsList.innerHTML = attachments
      .map(
        (attachment) => `
          <li class="list-group-item d-flex justify-content-between align-items-center gap-2">
            <div class="text-truncate">
              <a href="${attachment.downloadUrl}" target="_blank" rel="noopener noreferrer" class="text-decoration-none">${attachment.file_name}</a>
              <div class="small text-muted">Uploaded ${new Date(attachment.created_at).toLocaleString()}</div>
            </div>
            <button type="button" class="btn btn-sm btn-outline-danger task-attachment-delete" data-id="${attachment.id}" data-path="${attachment.storage_path}">Delete</button>
          </li>
        `
      )
      .join('');
  }

  async function loadTaskAttachments() {
    syncTaskAttachmentState();
    if (!currentTaskId) {
      renderTaskAttachments([]);
      return;
    }

    const attachments = await listEntityAttachments('task', currentTaskId);
    renderTaskAttachments(attachments);
  }

  function openNewTaskModal(stageId) {
    taskForm.reset();
    taskForm.elements.id.value = '';
    currentTaskId = '';
    taskForm.elements.project_id.value = projectSelect.value;
    taskForm.elements.stage_id.value = stageId;
    taskForm.elements.status.value = stageNameToStatus(getStageName(stageId));
    renderLabelOptions([]);
    renderTaskAttachments([]);
    taskCommentsList.innerHTML = '<div class="text-muted small">No comments yet.</div>';
    taskCommentInput.value = '';
    syncTaskAttachmentState();
    syncCommentsState();
    taskModal.show();
  }

  async function openEditTaskModal(taskId) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) {
      return;
    }

    fillTaskForm(task);
    currentTaskId = task.id;
    taskCommentInput.value = '';

    const selectedLabels = await listLabelsForTask(task.id);
    renderLabelOptions(selectedLabels);
    await Promise.all([loadTaskAttachments(), loadTaskComments()]);
    taskModal.show();
  }

  boardWrapper.addEventListener('click', async (event) => {
    const addButton = event.target.closest('.add-task-btn');
    if (addButton) {
      openNewTaskModal(addButton.dataset.stageId);
      return;
    }

    const editButton = event.target.closest('.edit-task-btn');
    if (editButton) {
      try {
        await openEditTaskModal(editButton.dataset.id);
      } catch (error) {
        showToast(error.message, 'danger');
      }
      return;
    }

    const deleteButton = event.target.closest('.delete-task-btn');
    if (deleteButton) {
      if (!window.confirm('Delete this task?')) return;

      try {
        await deleteTask(deleteButton.dataset.id);
        showToast('Task deleted');
        await loadBoard(projectSelect.value);
      } catch (error) {
        showToast(error.message, 'danger');
      }
    }
  });

  function getStageName(stageId) {
    return stages.find((stage) => stage.id === stageId)?.name || '';
  }

  projectSelect.addEventListener('change', async () => {
    if (!projectSelect.value) {
      clearTasksRealtimeSubscription();
      boardWrapper.innerHTML = '';
      return;
    }
    await loadBoard(projectSelect.value);
    subscribeToProjectTasks(projectSelect.value);
  });

  taskForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const payload = Object.fromEntries(new FormData(taskForm).entries());
    const selectedLabelIds = [...taskLabelsBox.querySelectorAll('.task-label-checkbox:checked')].map((checkbox) => checkbox.value);

    if (!payload.id) {
      delete payload.id;
      payload.position = tasks.filter((task) => task.stage_id === payload.stage_id).length + 1;
    }

    try {
      const taskId = await upsertTask(payload);
      await replaceTaskLabels(taskId, selectedLabelIds);
      currentTaskId = taskId;
      taskModal.hide();
      showToast(payload.id ? 'Task edited' : 'Task created');
      await loadBoard(projectSelect.value);
    } catch (error) {
      showToast(error.message, 'danger');
    }
  });

  taskAttachmentUploadBtn.addEventListener('click', async () => {
    if (!currentTaskId) {
      showToast('Save task first to upload files.', 'danger');
      return;
    }

    const file = taskAttachmentInput.files?.[0];
    if (!file) {
      showToast('Select a file to upload.', 'danger');
      return;
    }

    try {
      await uploadEntityAttachment({
        entityType: 'task',
        entityId: currentTaskId,
        file,
        ownerId: user.id
      });
      taskAttachmentInput.value = '';
      await loadTaskAttachments();
      showToast('Task attachment uploaded');
    } catch (error) {
      showToast(error.message, 'danger');
    }
  });

  taskAttachmentsList.addEventListener('click', async (event) => {
    const button = event.target.closest('.task-attachment-delete');
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
      await loadTaskAttachments();
      showToast('Task attachment deleted');
    } catch (error) {
      showToast(error.message, 'danger');
    }
  });

  addTaskCommentBtn.addEventListener('click', async () => {
    const message = taskCommentInput.value.trim();
    if (!currentTaskId) {
      showToast('Save task first to add comments.', 'danger');
      return;
    }

    if (!message) {
      showToast('Comment cannot be empty.', 'danger');
      return;
    }

    try {
      await addTaskComment(currentTaskId, user.id, message);
      taskCommentInput.value = '';
      await loadTaskComments();
      showToast('Comment added');
    } catch (error) {
      showToast(error.message, 'danger');
    }
  });

  document.getElementById('taskModal').addEventListener('hidden.bs.modal', () => {
    currentTaskId = '';
    taskAttachmentInput.value = '';
    renderTaskAttachments([]);
    renderLabelOptions([]);
    taskCommentInput.value = '';
    taskCommentsList.innerHTML = '<div class="text-muted small">No comments yet.</div>';
    syncTaskAttachmentState();
    syncCommentsState();
  });

  window.addEventListener('beforeunload', () => {
    clearTasksRealtimeSubscription();
  });

  try {
    await initialize();
    if (projectSelect.value) {
      subscribeToProjectTasks(projectSelect.value);
    }
    syncTaskAttachmentState();
    syncCommentsState();
    renderTaskAttachments([]);
    taskCommentsList.innerHTML = '<div class="text-muted small">No comments yet.</div>';
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

function stageNameToStatus(stageName) {
  const value = stageName.toLowerCase();
  if (value.includes('complete')) {
    return 'completed';
  }
  if (value.includes('progress')) {
    return 'in_progress';
  }
  return 'open';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
