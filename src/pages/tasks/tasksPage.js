import Sortable from 'sortablejs';
import { listProjects } from '../../services/projectsService';
import { listSalesReps } from '../../services/salesRepsService';
import { deleteTask, listProjectStages, listTasksByProject, moveTask, upsertTask } from '../../services/tasksService';

export async function renderTasksPage(container, { showToast }) {
  const url = new URL(window.location.href);
  const preselectedProjectId = url.searchParams.get('projectId') || '';

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
  const taskModal = new window.bootstrap.Modal(document.getElementById('taskModal'));

  let projects = [];
  let stages = [];
  let tasks = [];
  let salesReps = [];

  async function initialize() {
    projects = await listProjects();
    salesReps = await listSalesReps();

    projectSelect.innerHTML = [
      '<option value="">Select project</option>',
      ...projects.map((project) => `<option value="${project.id}" ${project.id === preselectedProjectId ? 'selected' : ''}>${project.title}</option>`)
    ].join('');

    taskForm.elements.assigned_sales_rep_id.innerHTML = [
      '<option value="">Unassigned</option>',
      ...salesReps.map((rep) => `<option value="${rep.id}">${rep.full_name || rep.id}</option>`)
    ].join('');

    if (projectSelect.value) {
      await loadBoard(projectSelect.value);
    }
  }

  async function loadBoard(projectId) {
    stages = await listProjectStages(projectId);
    tasks = await listTasksByProject(projectId);

    taskForm.elements.project_id.value = projectId;
    taskForm.elements.stage_id.innerHTML = stages.map((stage) => `<option value="${stage.id}">${stage.name}</option>`).join('');

    renderBoard();
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
            const stageTasks = tasks.filter((task) => task.stage_id === stage.id).sort((a, b) => (a.position || 0) - (b.position || 0));
            return `
              <section class="kanban-column" data-stage-id="${stage.id}">
                <div class="kanban-column-header d-flex justify-content-between align-items-center">
                  <h6 class="mb-0">${stage.name}</h6>
                  <span class="badge text-bg-light">${stageTasks.length}</span>
                </div>
                <div class="kanban-task-list" data-stage-id="${stage.id}">
                  ${stageTasks.map(renderTaskCard).join('')}
                </div>
                <button class="btn btn-outline-primary add-task-btn" data-stage-id="${stage.id}">
                  <i class="bi bi-plus-lg me-1"></i>Add New Task
                </button>
              </section>
            `;
          })
          .join('')}
      </div>
    `;

    boardWrapper.querySelectorAll('.add-task-btn').forEach((button) => {
      button.addEventListener('click', () => {
        taskForm.reset();
        taskForm.elements.id.value = '';
        taskForm.elements.project_id.value = projectSelect.value;
        taskForm.elements.stage_id.value = button.dataset.stageId;
        taskForm.elements.status.value = stageNameToStatus(getStageName(button.dataset.stageId));
        taskModal.show();
      });
    });

    boardWrapper.querySelectorAll('.edit-task-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const task = tasks.find((item) => item.id === button.dataset.id);
        fillTaskForm(task);
        taskModal.show();
      });
    });

    boardWrapper.querySelectorAll('.delete-task-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!window.confirm('Delete this task?')) return;

        try {
          await deleteTask(button.dataset.id);
          showToast('Task deleted');
          await loadBoard(projectSelect.value);
        } catch (error) {
          showToast(error.message, 'danger');
        }
      });
    });

    initializeSortableLists();
  }

  function renderTaskCard(task) {
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
        <div class="small text-muted">${task.profiles?.full_name ? `Assignee: ${task.profiles.full_name}` : 'Unassigned'}</div>
      </article>
    `;
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

  function getStageName(stageId) {
    return stages.find((stage) => stage.id === stageId)?.name || '';
  }

  projectSelect.addEventListener('change', async () => {
    if (!projectSelect.value) {
      boardWrapper.innerHTML = '';
      return;
    }
    await loadBoard(projectSelect.value);
  });

  taskForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const payload = Object.fromEntries(new FormData(taskForm).entries());

    if (!payload.id) {
      delete payload.id;
      payload.position = tasks.filter((task) => task.stage_id === payload.stage_id).length + 1;
    }

    try {
      await upsertTask(payload);
      taskModal.hide();
      showToast(payload.id ? 'Task edited' : 'Task created');
      await loadBoard(projectSelect.value);
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
