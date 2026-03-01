export async function renderIndexPage(container) {
  container.innerHTML = `
    <section class="hero-card bg-white shadow-sm p-4 p-md-5 mb-4">
      <div class="row align-items-center">
        <div class="col-lg-8">
          <h1 class="display-6 fw-bold mb-3">CRM tool for customer relationships and sales operations</h1>
          <p class="lead text-muted mb-4">
            Manage customers, track visits, organize customer projects, and deliver tasks across your sales team.
          </p>
          <a class="btn btn-primary btn-lg" href="/login">Register or Login</a>
        </div>
        <div class="col-lg-4 mt-4 mt-lg-0">
          <div class="card border-0 bg-light">
            <div class="card-body">
              <h5 class="card-title">What you can manage</h5>
              <ul class="mb-0">
                <li>Customer accounts and notes</li>
                <li>Sales representatives and ownership</li>
                <li>Customer visits and outcomes</li>
                <li>Projects by customer</li>
                <li>Task progress by stage</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}
