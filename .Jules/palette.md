## 2024-03-24 - Accessibility Labels for Detail Modals
**Learning:** Found multiple instances of icon-only buttons (close, delete, color selection) lacking `aria-label`s in the `DetailModals` component. This makes it difficult for screen reader users to understand the button's purpose, especially critical actions like deleting subtasks or closing informative modals.
**Action:** Always ensure icon-only buttons have descriptive `aria-label`s describing the action.
