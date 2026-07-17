import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// "Design with AI" chat state — persisted to localStorage so the conversation survives
// a page refresh; it's only ever cleared when the user explicitly clicks the Clear
// chat button (see clearChat below). `open` is deliberately excluded from persistence
// (via partialize) so the panel doesn't auto-open on every page load.
export const useAiChatStore = create(
  persist(
    (set) => ({
      open: false,
      messages: [], // { role: 'user'|'assistant'|'error', text }
      history: [],  // { brief, layoutId, copy } — sent back to the API so follow-ups refine the last result
      setOpen: (open) => set((s) => ({ open: typeof open === 'function' ? open(s.open) : open })),
      addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
      addHistoryTurn: (turn) => set((s) => ({ history: [...s.history, turn] })),
      clearChat: () => set({ messages: [], history: [] }),
    }),
    {
      name: 'ai-chat-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ messages: s.messages, history: s.history }),
    }
  )
)
