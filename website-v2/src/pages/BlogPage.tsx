import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { blogPosts } from '@/data/blogData'

export function BlogPage() {
  return (
    <div className="min-h-screen pt-32 pb-24 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-4xl mx-auto">
        <header className="mb-16 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-bold tracking-tight mb-4"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--p-font-display)' }}
          >
            Engineering Blog
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            Deep dives into protocol design, formal methods, and agentic coordination.
          </motion.p>
        </header>

        <div className="space-y-12">
          {blogPosts.map((post, index) => (
            <motion.article 
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index + 1) }}
              className="p-8 rounded-2xl border transition-all hover:translate-y-[-4px]"
              style={{ 
                background: 'var(--bg-overlay)', 
                borderColor: 'var(--border-subtle)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.04)'
              }}
            >
              <div className="flex items-center gap-3 mb-4 text-xs font-mono tracking-wider uppercase" style={{ color: 'var(--brand-primary)' }}>
                <span>{post.date}</span>
                <span style={{ color: 'var(--border-subtle)' }}>•</span>
                <span>{post.author}</span>
              </div>
              <Link to={`/blog/${post.slug}`} className="no-underline group">
                <h2 className="text-2xl font-bold mb-4 group-hover:text-[var(--brand-primary)] transition-colors" style={{ color: 'var(--text-primary)' }}>
                  {post.title}
                </h2>
              </Link>
              <p className="text-lg leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                {post.excerpt}
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {post.tags.map(tag => (
                  <span key={tag} className="px-2.5 py-1 rounded-md text-xs font-medium" style={{ background: 'var(--bg-base)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                    {tag}
                  </span>
                ))}
              </div>
              <Link to={`/blog/${post.slug}`} className="text-sm font-bold no-underline uppercase tracking-widest flex items-center gap-2 group" style={{ color: 'var(--brand-primary)' }}>
                Read Post
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  )
}
