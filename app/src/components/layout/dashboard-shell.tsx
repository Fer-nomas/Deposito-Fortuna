'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Providers } from '@/components/layout/providers'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="min-h-screen bg-[#f1f5f9]">
        <Sidebar />
        <div className="pl-[260px] transition-all duration-300">
          <Header />
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </Providers>
  )
}
