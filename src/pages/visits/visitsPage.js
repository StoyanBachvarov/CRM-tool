import { listCustomers } from '../../services/customersService';
import { listSalesReps } from '../../services/salesRepsService';
import { deleteVisit, listVisits, upsertVisit } from '../../services/visitsService';
import { deleteEntityAttachment, listEntityAttachments, uploadEntityAttachment } from '../../services/attachmentsService';

export async function renderVisitsPage(container, { showToast, user }) {
  const url = new URL(window.location.href);
  const selectedCustomerId = url.searchParams.get('customerId') || '';

  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="mb-0">Visits</h2>
      <button class="btn btn-primary" id="add-visit-btn"><i class="bi bi-plus-lg me-1"></i>Record Visit</button>
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
        <table class="table table-hover mb-0" id="visits-table">
          <thead class="table-light">
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Sales Rep</th>
              <th>Description</th>
              <th>Outcome</th>
              <th style="width: 140px;">Actions</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <div class="modal fade" id="visitModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <form id="visit-form">
            <div class="modal-header">
              <h5 class="modal-title">Visit</h5>
              <button class="btn-close" data-bs-dismiss="modal" type="button"></button>
            </div>
            <div class="modal-body row g-3">
              <input type="hidden" name="id" />
              <div class="col-md-6"><label class="form-label">Customer</label><select class="form-select" name="customer_id" required></select></div>
              <div class="col-md-6"><label class="form-label">Sales Rep</label><select class="form-select" name="sales_rep_id" required></select></div>
              <div class="col-md-6"><label class="form-label">Visit Date</label><input class="form-control" type="datetime-local" name="visit_date" required /></div>
              <div class="col-md-6"><label class="form-label">Outcome</label><input class="form-control" name="outcome" /></div>
              <div class="col-12"><label class="form-label">Description</label><input class="form-control" name="description" /></div>
              <div class="col-12"><label class="form-label">Notes</label><textarea class="form-control" name="notes" rows="3"></textarea></div>
              <div class="col-12">
                <label class="form-label">Attachments</label>
                <div class="d-flex gap-2 flex-wrap mb-2">
                  <input class="form-control" type="file" id="visit-attachment-input" accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx" />
                  <button type="button" class="btn btn-outline-secondary" id="visit-attachment-upload">Upload File</button>
                </div>
                <div class="form-text mb-2" id="visit-attachment-hint">Save visit first to enable file attachments.</div>
                <ul class="list-group" id="visit-attachments-list"></ul>
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

  const tbody = container.querySelector('#visits-table tbody');
  const customerFilter = document.getElementById('customer-filter');
  const form = document.getElementById('visit-form');
  const visitAttachmentInput = document.getElementById('visit-attachment-input');
  const visitAttachmentUploadBtn = document.getElementById('visit-attachment-upload');
  const visitAttachmentHint = document.getElementById('visit-attachment-hint');
  const visitAttachmentsList = document.getElementById('visit-attachments-list');
  const visitModal = new window.bootstrap.Modal(document.getElementById('visitModal'));

  let customers = [];
  let salesReps = [];
  let visits = [];
  let currentVisitId = '';

  async function initialize() {
    customers = await listCustomers();
    salesReps = await listSalesReps();

    customerFilter.innerHTML = [
      '<option value="">All Customers</option>',
      ...customers.map((c) => `<option value="${c.id}" ${c.id === selectedCustomerId ? 'selected' : ''}>${c.name}</option>`)
    ].join('');

    form.elements.customer_id.innerHTML = customers.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
    form.elements.sales_rep_id.innerHTML = salesReps.map((r) => `<option value="${r.id}">${r.full_name || r.id}</option>`).join('');
    form.elements.sales_rep_id.value = user.id;

    await loadVisits(customerFilter.value || selectedCustomerId || '');
  }

  async function loadVisits(customerId) {
    visits = await listVisits(customerId || undefined);
    tbody.innerHTML = visits
      .map(
        (visit) => `
          <tr>
            <td>${new Date(visit.visit_date).toLocaleString()}</td>
            <td>${visit.customers?.name || '-'}</td>
            <td>${visit.profiles?.full_name || '-'}</td>
            <td>${visit.description || '-'}</td>
            <td>${visit.outcome || '-'}</td>
            <td>
              <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${visit.id}">Edit</button>
              <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${visit.id}">Delete</button>
            </td>
          </tr>
        `
      )
      .join('');

    bindRowActions();
  }

  function bindRowActions() {
    tbody.querySelectorAll('.edit-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const visit = visits.find((v) => v.id === button.dataset.id);
        fillForm(visit);
        currentVisitId = visit.id;
        loadVisitAttachments();
        visitModal.show();
      });
    });

    tbody.querySelectorAll('.delete-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!window.confirm('Delete this visit?')) return;

        try {
          await deleteVisit(button.dataset.id);
          showToast('Visit deleted');
          await loadVisits(customerFilter.value);
        } catch (error) {
          showToast(error.message, 'danger');
        }
      });
    });
  }

  function fillForm(visit) {
    form.reset();
    form.elements.id.value = visit.id;
    form.elements.customer_id.value = visit.customer_id;
    form.elements.sales_rep_id.value = visit.sales_rep_id;
    form.elements.visit_date.value = toDatetimeLocal(visit.visit_date);
    form.elements.description.value = visit.description || '';
    form.elements.notes.value = visit.notes || '';
    form.elements.outcome.value = visit.outcome || '';
  }

  function syncVisitAttachmentState() {
    const hasVisit = Boolean(currentVisitId);
    visitAttachmentInput.disabled = !hasVisit;
    visitAttachmentUploadBtn.disabled = !hasVisit;
    visitAttachmentHint.textContent = hasVisit
      ? 'Upload screenshots or documents related to this visit.'
      : 'Save visit first to enable file attachments.';
  }

  function renderVisitAttachments(attachments) {
    if (!attachments.length) {
      visitAttachmentsList.innerHTML = '<li class="list-group-item text-muted">No attachments yet.</li>';
      return;
    }

    visitAttachmentsList.innerHTML = attachments
      .map(
        (attachment) => `
          <li class="list-group-item d-flex justify-content-between align-items-center gap-2">
            <div class="text-truncate">
              <a href="${attachment.downloadUrl}" target="_blank" rel="noopener noreferrer" class="text-decoration-none">${attachment.file_name}</a>
              <div class="small text-muted">Uploaded ${new Date(attachment.created_at).toLocaleString()}</div>
            </div>
            <button type="button" class="btn btn-sm btn-outline-danger visit-attachment-delete" data-id="${attachment.id}" data-path="${attachment.storage_path}">Delete</button>
          </li>
        `
      )
      .join('');
  }

  async function loadVisitAttachments() {
    syncVisitAttachmentState();
    if (!currentVisitId) {
      renderVisitAttachments([]);
      return;
    }

    const attachments = await listEntityAttachments('visit', currentVisitId);
    renderVisitAttachments(attachments);
  }

  customerFilter.addEventListener('change', async () => {
    await loadVisits(customerFilter.value || undefined);
  });

  document.getElementById('add-visit-btn').addEventListener('click', () => {
    form.reset();
    form.elements.id.value = '';
    currentVisitId = '';
    if (customerFilter.value) {
      form.elements.customer_id.value = customerFilter.value;
    }
    form.elements.sales_rep_id.value = user.id;
    renderVisitAttachments([]);
    syncVisitAttachmentState();
    visitModal.show();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());

    if (!payload.id) {
      delete payload.id;
    }

    payload.visit_date = new Date(payload.visit_date).toISOString();

    try {
      await upsertVisit(payload);
      visitModal.hide();
      showToast(payload.id ? 'Visit updated' : 'Visit recorded');
      await loadVisits(customerFilter.value || undefined);
    } catch (error) {
      showToast(error.message, 'danger');
    }
  });

  visitAttachmentUploadBtn.addEventListener('click', async () => {
    if (!currentVisitId) {
      showToast('Save visit first to upload files.', 'danger');
      return;
    }

    const file = visitAttachmentInput.files?.[0];
    if (!file) {
      showToast('Select a file to upload.', 'danger');
      return;
    }

    try {
      await uploadEntityAttachment({
        entityType: 'visit',
        entityId: currentVisitId,
        file,
        ownerId: user.id
      });
      visitAttachmentInput.value = '';
      await loadVisitAttachments();
      showToast('Visit attachment uploaded');
    } catch (error) {
      showToast(error.message, 'danger');
    }
  });

  visitAttachmentsList.addEventListener('click', async (event) => {
    const button = event.target.closest('.visit-attachment-delete');
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
      await loadVisitAttachments();
      showToast('Visit attachment deleted');
    } catch (error) {
      showToast(error.message, 'danger');
    }
  });

  document.getElementById('visitModal').addEventListener('hidden.bs.modal', () => {
    currentVisitId = '';
    visitAttachmentInput.value = '';
    renderVisitAttachments([]);
    syncVisitAttachmentState();
  });

  try {
    await initialize();
    syncVisitAttachmentState();
    renderVisitAttachments([]);
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

function toDatetimeLocal(value) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - offset * 60000);
  return adjusted.toISOString().slice(0, 16);
}
