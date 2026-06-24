import { create } from 'zustand'

export const useUiStore = create((set) => ({
  activeModal: null,   // 'addText' | 'addShape' | 'addVideo' | 'animation' | 'publish' | 'templates'
  openModal: (name) => set({ activeModal: name }),
  closeModal: () => set({ activeModal: null }),
}))
