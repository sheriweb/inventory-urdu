import type { KeyboardEvent } from 'react';

const FOCUSABLE_SELECTOR =
  'input:not([type=hidden]):not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled])';

export function handleFormEnterKey(e: KeyboardEvent<HTMLElement>) {
  if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;

  const target = e.target as HTMLElement;
  if (target.tagName === 'TEXTAREA') return;
  if (target.getAttribute('data-skip-enter-nav') === 'true') return;
  if (target.closest('[data-skip-enter-nav]')) return;

  const container = target.closest('form') ?? target.closest('[data-enter-nav-root]');
  if (!container) return;

  const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null,
  );

  const idx = focusable.indexOf(target);
  if (idx < 0 || idx >= focusable.length - 1) return;

  e.preventDefault();
  const next = focusable[idx + 1];
  next.focus();
  if (next instanceof HTMLInputElement && next.type !== 'date') {
    next.select();
  }
}
