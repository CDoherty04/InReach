import type { ReactNode } from 'react'

export function L({ en, es, block = false }: { en: ReactNode; es: ReactNode; block?: boolean }) {
  const Tag = block ? 'div' : 'span'
  return (
    <>
      <Tag className="lang-en">{en}</Tag>
      <Tag className="lang-es">{es}</Tag>
    </>
  )
}
