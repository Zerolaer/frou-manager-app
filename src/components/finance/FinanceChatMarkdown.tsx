import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { cn } from '@/lib/utils'

type Props = {
  content: string
  variant?: 'assistant' | 'user'
}

const assistantComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-2 mt-3 text-base font-semibold text-gray-900 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-1.5 mt-3 text-sm font-semibold text-gray-900 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1 mt-2 text-sm font-semibold text-gray-800 first:mt-0">{children}</h3>
  ),
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
  ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-violet-300 pl-3 text-gray-600">{children}</blockquote>
  ),
  hr: () => <hr className="my-3 border-gray-200" />,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-violet-600 underline underline-offset-2 hover:text-violet-700"
    >
      {children}
    </a>
  ),
  code: ({ className, children }) => {
    const isBlock = Boolean(className)
    if (isBlock) {
      return (
        <pre className="my-2 overflow-x-auto rounded-lg bg-gray-200/70 px-2.5 py-2 text-xs">
          <code className="font-mono">{children}</code>
        </pre>
      )
    }
    return (
      <code className="rounded bg-gray-200/70 px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
    )
  },
  table: ({ children }) => (
    <div className="my-2.5 -mx-0.5 overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[240px] border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-gray-100">{children}</tbody>,
  tr: ({ children }) => (
    <tr className="transition-colors even:bg-white odd:bg-gray-50/60 hover:bg-violet-50/50">{children}</tr>
  ),
  th: ({ children }) => (
    <th
      className={cn(
        'border-b border-gray-200 px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500',
        '[&:not(:first-child)]:text-right',
      )}
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td
      className={cn(
        'px-2.5 py-1.5 tabular-nums text-gray-800',
        '[&:not(:first-child)]:text-right [&:not(:first-child)]:font-medium',
      )}
    >
      {children}
    </td>
  ),
}

const userComponents: Components = {
  p: ({ children }) => <p className="leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
}

export function FinanceChatMarkdown({ content, variant = 'assistant' }: Props) {
  const components = variant === 'user' ? userComponents : assistantComponents

  return (
    <div className={cn('finance-chat-md', variant === 'assistant' && 'text-sm')}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
