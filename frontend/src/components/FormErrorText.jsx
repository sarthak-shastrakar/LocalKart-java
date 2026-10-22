import { AlertTriangle } from 'lucide-react';

/**
 * Accessible inline error text for forms.
 * Renders under the relevant field with a warning icon.
 *
 * @param {string}  message    - The error text to display.
 * @param {string}  [id]       - Optional id for aria-describedby linkage.
 */
export default function FormErrorText({ message, id }) {
  if (!message) return null;

  return (
    <p
      id={id}
      role="alert"
      aria-live="polite"
      className="flex items-start gap-1.5 text-xs text-red-600 font-medium mt-1.5"
    >
      <AlertTriangle size={13} className="shrink-0 mt-0.5" />
      <span>{message}</span>
    </p>
  );
}
