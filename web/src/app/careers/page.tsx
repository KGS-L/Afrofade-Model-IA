import { Suspense } from 'react';
import CareersMarketplace from '@/components/careers/CareersMarketplace';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
export const metadata={title:'Carrières coiffure — Afrofade',description:'Trouvez des opportunités dans les métiers de la coiffure et de la barbe.'};
export default function CareersPage(){return <div className="min-h-screen bg-cream text-ink"><Suspense fallback={<main className="min-h-[60vh]"/>}><CareersMarketplace/></Suspense><Footer/></div>}
