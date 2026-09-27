import { reactive } from 'vue'

export interface ConfirmOptions {
  title: string
  message?: string
  /** Bullet list describing the impact of the action. */
  impacts?: string[]
  confirmText?: string
  cancelText?: string
  tone?: 'danger' | 'warning' | 'brand'
  /** Ask for a reason (sent to backend audit). */
  reason?: boolean | { label?: string; placeholder?: string; required?: boolean }
  /** Double confirmation: user must type this exact text. */
  typeToConfirm?: string
}

export interface ConfirmResult {
  reason: string
}

interface State extends ConfirmOptions {
  open: boolean
  resolve?: (v: ConfirmResult | null) => void
}

export const confirmState = reactive<State>({ open: false, title: '' })

/** Promise-based confirmation dialog. Resolves null when cancelled. */
export function useConfirm() {
  return (opts: ConfirmOptions) =>
    new Promise<ConfirmResult | null>((resolve) => {
      confirmState.resolve?.(null)
      Object.assign(confirmState, {
        message: undefined,
        impacts: undefined,
        confirmText: undefined,
        cancelText: undefined,
        tone: undefined,
        reason: undefined,
        typeToConfirm: undefined,
        ...opts,
        open: true,
        resolve,
      })
    })
}

export function settleConfirm(result: ConfirmResult | null) {
  confirmState.resolve?.(result)
  confirmState.resolve = undefined
  confirmState.open = false
}
