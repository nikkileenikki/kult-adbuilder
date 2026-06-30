import { create } from 'zustand'

export const useUiStore = create((set) => ({
  activeModal: null,
  modalData: null,
  canvasZoom: 100,
  ftLibrary: null,
  openModal: (name, data = null) => set({ activeModal: name, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),
  setCanvasZoom: (zoom) => set({ canvasZoom: Math.min(200, Math.max(25, zoom)) }),
  setFtLibrary: (lib) => set({ ftLibrary: lib }),
}))
