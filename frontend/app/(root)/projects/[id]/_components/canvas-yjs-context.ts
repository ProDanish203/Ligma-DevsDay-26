import { createContext, useContext } from 'react';
import type * as Y from 'yjs';

export const CanvasYjsContext = createContext<Y.Doc | null>(null);

export function useCanvasYDoc(): Y.Doc | null {
  return useContext(CanvasYjsContext);
}
