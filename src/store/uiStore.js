import { create } from 'zustand'

export const useUiStore = create((set) => ({
  activeModal: null,
  modalData: null,   // extra payload passed to the active modal
  openModal: (name, data = null) => set({ activeModal: name, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),
}))
