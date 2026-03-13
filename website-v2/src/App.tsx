import './App.css'
import { Hero } from '@/components/landing/Hero'
import { DemoGallery } from '@/components/landing/DemoGallery'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { Features } from '@/components/landing/Features'
import { BlueprintsSection } from '@/components/blueprints/BlueprintsSection'
import { HarborsSection } from '@/components/landing/HarborsSection'
import { AgentEcosystem } from '@/components/landing/AgentEcosystem'
import { MaturitySection } from '@/components/landing/MaturitySection'
import { CTABanner } from '@/components/landing/CTABanner'
import { Footer } from '@/components/layout/Footer'
import { Nav } from '@/components/landing/Nav'
import { motion } from 'framer-motion'

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] selection:bg-[var(--brand-primary)] selection:text-white">
      <Nav />
      
      {/* 
        The Centered Master Container 
        Using max-w-7xl (1280px) for ideal reading width 
      */}
      <main className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Hero />
        </motion.div>

        <div className="space-y-32 sm:space-y-48 pb-32">
          <DemoGallery />
          <HowItWorks />
          <Features />
          <BlueprintsSection />
          <HarborsSection />
          <AgentEcosystem />
          <MaturitySection />
        </div>
      </main>

      <CTABanner />
      <Footer />
    </div>
  )
}
