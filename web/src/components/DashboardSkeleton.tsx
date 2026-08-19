import React from 'react';

export function DashboardSkeleton({ darkHeader = false }: { darkHeader?: boolean }) {
  return (
    <div className="min-h-screen bg-cream animate-pulse">
      <div className={`h-16 ${darkHeader ? 'bg-night' : 'bg-card'} border-b border-ink/10`} />
      <main className="max-w-container mx-auto px-6 py-10 space-y-8">
        <div className="space-y-3"><div className="h-4 w-28 rounded bg-ink/10"/><div className="h-9 w-72 max-w-full rounded bg-ink/10"/><div className="h-4 w-96 max-w-full rounded bg-ink/10"/></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-card bg-card border border-ink/10 shadow-soft" />)}</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div className="h-72 rounded-card bg-card border border-ink/10"/><div className="h-72 rounded-card bg-card border border-ink/10"/></div>
      </main>
    </div>
  );
}
