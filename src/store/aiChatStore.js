import { create } from 'zustand'

// "Design with AI" chat state — deliberately a plain (non-persisted) zustand store
// rather than component-local state, so it survives the chat panel's host component
// unmounting (e.g. navigating to Settings and back) but is still cleared on a real
// page refresh, matching what was asked: kept for the session, lost on reload.
export const useAiChatStore = create((set) => ({
  open: false,
  messages: [], // { role: 'user'|'assistant'|'error', text }
  history: [],  // { brief, layoutId, copy } — sent back to the API so follow-ups refine the last result
  setOpen: (open) => set({ open }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  addHistoryTurn: (turn) => set((s) => ({ history: [...s.history, turn] })),
}))
