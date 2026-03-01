import { deleteCustomer, getCustomerStats, listCustomers, upsertCustomer } from '../../services/customersService';

export async function renderCustomersPage(container, { showToast, user }) {
  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="mb-0">Customers</h2>
      <button class="btn btn-primary" id="add-customer-btn"><i class="bi bi-plus-lg me-1"></i>Add Customer</button>
    </div>
    <div class="card shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover mb-0" id="customers-table">
          <thead class="table-light">
            <tr>
              <th>Name</th>
              <th>Address</th>
              <th>Unique Number</th>
              <th>Projects</th>
              <th>Upcoming Visits</th>
              <th style="width: 260px;">Actions</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <div class="modal fade" id="customerModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <form id="customer-form">
            <div class="modal-header">
              <h5 class="modal-title">Customer</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body row g-3">
              <input type="hidden" name="id" />
              <div class="col-md-6"><label class="form-label">Name</label><input class="form-control" name="name" required /></div>
              <div class="col-md-6"><label class="form-label">Company</label><input class="form-control" name="company" /></div>
              <div class="col-md-6"><label class="form-label">Contact Email</label><input class="form-control" type="email" name="contact_email" /></div>
              <div class="col-md-6"><label class="form-label">Contact Phone</label><input class="form-control" name="contact_phone" /></div>
              <div class="col-md-6"><label class="form-label">Address</label><input class="form-control" name="address" /></div>
              <div class="col-md-6"><label class="form-label">Unique Number</label><input class="form-control" name="unique_number" required /></div>
              <div class="col-12"><label class="form-label">Notes</label><textarea class="form-control" name="notes" rows="3"></textarea></div>
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

  const tableBody = container.querySelector('#customers-table tbody');
  const modalElement = document.getElementById('customerModal');
  const customerModal = new window.bootstrap.Modal(modalElement);
  const form = document.getElementById('customer-form');

  async function loadData() {
    const [customers, stats] = await Promise.all([listCustomers(), getCustomerStats()]);
    const statsMap = new Map(stats.map((item) => [item.customerId, item]));

    tableBody.innerHTML = customers
      .map((customer) => {
        const stat = statsMap.get(customer.id) || { projectsCount: 0, upcomingVisits: 0 };
        return `
        <tr>
          <td title="${customer.name}">${truncate(customer.name, 24)}</td>
          <td title="${customer.address || ''}">${truncate(customer.address || '-', 30)}</td>
          <td>${customer.unique_number || '-'}</td>
          <td>${stat.projectsCount}</td>
          <td>${stat.upcomingVisits}</td>
          <td class="text-nowrap">
            <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${customer.id}">Edit</button>
            <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${customer.id}">Delete</button>
            <a class="btn btn-sm btn-outline-secondary" href="/projects.html?customerId=${customer.id}">View Projects</a>
            <a class="btn btn-sm btn-outline-secondary" href="/visits.html?customerId=${customer.id}">View Visits</a>
          </td>
        </tr>
      `;
      })
      .join('');

    tableBody.querySelectorAll('.edit-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const customer = customers.find((item) => item.id === button.dataset.id);
        fillForm(customer);
        customerModal.show();
      });
    });

    tableBody.querySelectorAll('.delete-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        const isConfirmed = window.confirm('Delete this customer?');
        if (!isConfirmed) return;

        try {
          await deleteCustomer(button.dataset.id);
          showToast('Customer deleted');
          await loadData();
        } catch (error) {
          showToast(error.message, 'danger');
        }
      });
    });
  }

  document.getElementById('add-customer-btn').addEventListener('click', () => {
    form.reset();
    form.elements.id.value = '';
    customerModal.show();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    payload.owner_id = user.id;
    if (!payload.id) {
      delete payload.id;
    }

    try {
      await upsertCustomer(payload);
      customerModal.hide();
      showToast(payload.id ? 'Customer updated' : 'Customer created');
      await loadData();
    } catch (error) {
      showToast(error.message, 'danger');
    }
  });

  function fillForm(customer) {
    Object.entries(customer).forEach(([key, value]) => {
      if (form.elements[key]) {
        form.elements[key].value = value ?? '';
      }
    });
  }

  try {
    await loadData();
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

function truncate(value, maxLength) {
  if (!value) {
    return '-';
  }
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}...`;
}
