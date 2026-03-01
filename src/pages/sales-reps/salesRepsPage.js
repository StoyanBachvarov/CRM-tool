import { listSalesReps, updateSalesRepName, updateSalesRepRole } from '../../services/salesRepsService';

export async function renderSalesRepsPage(container, { showToast }) {
  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="mb-0">Sales Representatives</h2>
    </div>
    <div class="card shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover mb-0" id="sales-reps-table">
          <thead class="table-light">
            <tr>
              <th>Email / User ID</th>
              <th>Full Name</th>
              <th>Role</th>
              <th style="width: 180px;">Actions</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;

  const tbody = container.querySelector('#sales-reps-table tbody');

  async function loadData() {
    const reps = await listSalesReps();
    tbody.innerHTML = reps
      .map(
        (rep) => `
          <tr>
            <td class="small">${rep.id}</td>
            <td>
              <input class="form-control form-control-sm name-input" data-id="${rep.id}" value="${escapeHtml(rep.full_name || '')}" />
            </td>
            <td>
              <select class="form-select form-select-sm role-input" data-id="${rep.id}">
                <option value="sales_rep" ${rep.role === 'sales_rep' ? 'selected' : ''}>Sales Rep</option>
                <option value="admin" ${rep.role === 'admin' ? 'selected' : ''}>Admin</option>
              </select>
            </td>
            <td><button class="btn btn-sm btn-primary save-btn" data-id="${rep.id}">Save</button></td>
          </tr>
        `
      )
      .join('');

    tbody.querySelectorAll('.save-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.dataset.id;
        const nameInput = tbody.querySelector(`.name-input[data-id="${id}"]`);
        const roleInput = tbody.querySelector(`.role-input[data-id="${id}"]`);

        try {
          await updateSalesRepName(id, nameInput.value.trim() || 'Sales Rep');
          await updateSalesRepRole(id, roleInput.value);
          showToast('Sales representative updated');
        } catch (error) {
          showToast(error.message, 'danger');
        }
      });
    });
  }

  try {
    await loadData();
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
