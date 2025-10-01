"use client"

import { useEffect } from "react"

export function ResizeObserverErrorSuppressor() {
  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      if (event.message === "ResizeObserver loop completed with undelivered notifications.") {
        event.stopImmediatePropagation()
        event.preventDefault()
      }
    }

    window.addEventListener("error", errorHandler)

    return () => {
      window.removeEventListener("error", errorHandler)
    }
  }, [])

  return null
}
