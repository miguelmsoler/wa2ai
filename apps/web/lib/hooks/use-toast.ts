"use client"

/**
 * Toast notification system.
 * 
 * Inspired by react-hot-toast library. Provides toast notifications
 * with automatic dismissal and state management.
 */

import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

/**
 * Maximum number of toasts to display simultaneously.
 */
const TOAST_LIMIT = 1

/**
 * Delay before automatically removing a toast (in milliseconds).
 */
const TOAST_REMOVE_DELAY = 1000000

/**
 * Extended toast type with ID and optional content.
 */
type ToasterToast = ToastProps & {
  /** Unique identifier for the toast */
  id: string
  /** Optional toast title */
  title?: React.ReactNode
  /** Optional toast description */
  description?: React.ReactNode
  /** Optional action button */
  action?: ToastActionElement
}

/**
 * Toast action types for reducer.
 */
const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

/**
 * Counter for generating unique toast IDs.
 */
let count = 0

/**
 * Generates a unique ID for a toast.
 * 
 * Uses a counter that wraps around Number.MAX_SAFE_INTEGER.
 * 
 * @returns Unique toast ID string
 */
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

/**
 * Map of toast IDs to their removal timeout handlers.
 */
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

/**
 * Schedules a toast for automatic removal.
 * 
 * Adds the toast to a removal queue with a delay.
 * If the toast is already scheduled, does nothing.
 * 
 * @param toastId - ID of the toast to schedule for removal
 */
const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

/**
 * Reducer for toast state management.
 * 
 * Handles all toast state mutations:
 * - ADD_TOAST: Adds a new toast (respects TOAST_LIMIT)
 * - UPDATE_TOAST: Updates an existing toast
 * - DISMISS_TOAST: Marks toast(s) as dismissed and schedules removal
 * - REMOVE_TOAST: Removes toast(s) from state
 * 
 * @param state - Current toast state
 * @param action - Action to perform
 * @returns New toast state
 */
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

/**
 * List of state change listeners (React components using useToast).
 */
const listeners: Array<(state: State) => void> = []

/**
 * In-memory toast state (shared across all useToast instances).
 */
let memoryState: State = { toasts: [] }

/**
 * Dispatches an action to update toast state.
 * 
 * Updates memory state and notifies all listeners (React components).
 * This allows multiple components to share the same toast state.
 * 
 * @param action - Action to dispatch
 */
function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

/**
 * Toast creation type (without ID, which is generated automatically).
 */
type Toast = Omit<ToasterToast, "id">

/**
 * Creates and displays a new toast notification.
 * 
 * Generates a unique ID, adds the toast to state, and returns
 * control functions (update, dismiss).
 * 
 * @param props - Toast properties (title, description, variant, etc.)
 * @returns Object with toast ID and control functions (dismiss, update)
 * 
 * @example
 * ```tsx
 * const { dismiss, update } = toast({
 *   title: "Success",
 *   description: "Route created successfully",
 *   variant: "default"
 * })
 * ```
 */
function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

/**
 * Hook to access toast notification system.
 * 
 * Provides:
 * - Current toast state (toasts array)
 * - toast() function to create new toasts
 * - dismiss() function to dismiss toasts
 * 
 * Uses a shared memory state pattern where all useToast instances
 * subscribe to the same state, allowing toasts to be created from
 * any component and displayed globally.
 * 
 * @returns Toast state and control functions
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { toast, dismiss } = useToast()
 *   
 *   const showSuccess = () => {
 *     toast({ title: "Success", description: "Operation completed" })
 *   }
 *   
 *   return <button onClick={showSuccess}>Show Toast</button>
 * }
 * ```
 */
function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  /**
   * Subscribes to toast state changes.
   * 
   * Registers this component as a listener so it receives state updates
   * when toasts are added, updated, or removed from other components.
   */
  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
