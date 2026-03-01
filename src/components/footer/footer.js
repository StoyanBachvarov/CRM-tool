export function renderFooter() {
  const year = new Date().getFullYear();
  return `
    <footer class="border-top py-3 mt-5 bg-white">
      <div class="container d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
        <small class="text-muted">© ${year} CRM Tool</small>
        <small class="text-muted">Built with Vite, Bootstrap and Supabase</small>
      </div>
    </footer>
  `;
}
