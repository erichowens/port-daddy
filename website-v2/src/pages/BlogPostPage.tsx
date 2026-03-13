import { useParams, Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { blogPosts } from '@/data/blogData'
import { Mermaid } from '@/components/ui/Mermaid'

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()
  const post = blogPosts.find(p => p.slug === slug)

  if (!post) {
    return <Navigate to="/blog" replace />
  }

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--bg-base)' }}>
      <article className="max-w-3xl mx-auto">
        <header className="mb-12">
          <Link to="/blog" className="text-sm font-bold no-underline uppercase tracking-widest flex items-center gap-2 mb-8 group" style={{ color: 'var(--brand-primary)' }}>
            <span className="transition-transform group-hover:-translate-x-1">←</span>
            Back to Blog
          </Link>
          
          <div className="flex items-center gap-3 mb-4 text-xs font-mono tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>
            <span>{post.date}</span>
            <span style={{ color: 'var(--border-subtle)' }}>•</span>
            <span>{post.author}</span>
          </div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-bold tracking-tight mb-8"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--p-font-display)', lineHeight: 1.2 }}
          >
            {post.title}
          </motion.h1>

          <div className="flex flex-wrap gap-2">
            {post.tags.map(tag => (
              <span key={tag} className="px-2.5 py-1 rounded-md text-xs font-medium" style={{ background: 'var(--bg-overlay)', color: 'var(--brand-primary)', border: '1px solid var(--border-subtle)' }}>
                {tag}
              </span>
            ))}
          </div>
        </header>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="prose prose-invert prose-brand max-w-none prose-headings:font-display prose-headings:font-bold prose-a:text-[var(--brand-primary)] prose-code:text-[var(--brand-primary)] prose-code:bg-[var(--bg-overlay)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none"
        >
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-mermaid/.exec(className || '')
                return !inline && match ? (
                  <Mermaid chart={String(children).replace(/\n$/, '')} />
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                )
              }
            }}
          >
            {post.content}
          </ReactMarkdown>
        </motion.div>

        <footer className="mt-16 pt-8 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg" style={{ background: 'var(--brand-primary)', color: 'var(--bg-base)' }}>
                PD
              </div>
              <div>
                <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{post.author}</div>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Core Development Team</div>
              </div>
            </div>
          </div>
        </footer>
      </article>
    </div>
  )
}
