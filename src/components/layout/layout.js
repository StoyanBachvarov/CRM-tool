import { renderHeader } from '../header/header';
import { renderFooter } from '../footer/footer';

export function renderLayout(appRoot, { user, pageId }) {
  appRoot.innerHTML = `
    ${renderHeader({ user, pageId })}
    <main id="page-content" class="container py-4"></main>
    ${renderFooter()}
  `;

  return document.getElementById('page-content');
}
