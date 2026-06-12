function invokeDashboardAction(element, attribute) {
  const name = element.dataset[attribute];
  if (!name) return;
  const handler = window[name];
  if (typeof handler !== 'function') return;
  let args = [];
  if (element.dataset.args) {
    try {
      args = JSON.parse(element.dataset.args);
    } catch {
      return;
    }
  } else if (element.dataset.arg !== undefined) {
    args = [element.dataset.arg];
  }
  handler(...args);
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('[data-href]');
  if (link) window.location.href = link.dataset.href;
  const target = event.target.closest('[data-click-action]');
  if (target) invokeDashboardAction(target, 'clickAction');
});

document.addEventListener('change', (event) => {
  const target = event.target.closest('[data-change-action]');
  if (target) invokeDashboardAction(target, 'changeAction');
});

document.addEventListener('input', (event) => {
  const target = event.target.closest('[data-input-action]');
  if (target) invokeDashboardAction(target, 'inputAction');
});

document.addEventListener('submit', (event) => {
  const target = event.target.closest('[data-submit-action]');
  if (!target) return;
  event.preventDefault();
  const handler = window[target.dataset.submitAction];
  if (typeof handler === 'function') handler(event);
});
