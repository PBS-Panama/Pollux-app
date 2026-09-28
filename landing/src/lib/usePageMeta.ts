/**
 * usePageMeta.ts — sets document.title + <meta name="robots" content="noindex">
 * for the duration a page is mounted, restoring both on unmount.
 * Shared by Login.tsx and Register.tsx (previously duplicated in both).
 */

import { useEffect } from 'react'

export function usePageMeta(title: string) {
  useEffect(() => {
    const previous = document.title
    document.title = title
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => {
      document.title = previous
      meta.remove()
    }
  }, [title])
}
