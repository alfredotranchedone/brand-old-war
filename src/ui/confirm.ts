import { create } from 'zustand';

interface ConfirmState {
  message: string | null;
  onYes: (() => void) | null;
}

/** Dialogo di conferma dentro l'app (più affidabile di `window.confirm` su browser incorporati). */
export const useConfirm = create<ConfirmState>()(() => ({ message: null, onYes: null }));

export function askConfirm(message: string, onYes: () => void): void {
  useConfirm.setState({ message, onYes });
}

export function answerConfirm(yes: boolean): void {
  const { onYes } = useConfirm.getState();
  useConfirm.setState({ message: null, onYes: null });
  if (yes) onYes?.();
}
