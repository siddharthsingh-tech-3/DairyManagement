import { create } from 'zustand'

interface ToastState {
  message: string | null
  severity: 'success' | 'error' | 'info' | 'warning'
  show: (message: string, severity?: ToastState['severity']) => void
  clear: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  severity: 'success',
  show: (message, severity = 'success') => set({ message, severity }),
  clear: () => set({ message: null }),
}))
