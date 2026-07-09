import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useUiStore = create(persist((set) => ({
  activeModal: null,
  modalData: null,
  canvasZoom: 100,
  ftLibrary: null,
  templateBuilder: null, // { snapshot, editingTemplateId } while active, else null
  activeBrandId: null,   // brand guide selected in the header, used by AI design/image generation
  openModal: (name, data = null) => set({ activeModal: name, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),
  setCanvasZoom: (zoom) => set({ canvasZoom: Math.min(200, Math.max(25, zoom)) }),
  setFtLibrary: (lib) => set({ ftLibrary: lib }),
  setTemplateBuilder: (v) => set((s) => ({ templateBuilder: typeof v === 'function' ? v(s.templateBuilder) : v })),
  setActiveBrandId: (id) => set({ activeBrandId: id }),
}), {
  name: 'kult-adbuilder-ui',
  // Only the in-progress template draft and the selected brand need to survive a
  // refresh — modals/zoom/library selection should reset to their defaults on reload.
  partialize: (state) => ({ templateBuilder: state.templateBuilder, activeBrandId: state.activeBrandId }),
}))
