import { Suspense } from 'react';
import MarketplaceModerationConsole from '@/components/admin/MarketplaceModerationConsole';

export const metadata={title:'Modération Marketplace — Afrofade'};
export default function AdminMarketplacePage(){return <Suspense fallback={<main className="min-h-screen bg-cream"/>}><MarketplaceModerationConsole/></Suspense>}
