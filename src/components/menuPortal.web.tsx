import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function menuPortal(node: ReactNode): ReactNode {
  return createPortal(node, document.body);
}
