import { Suspense } from 'react';
import BookingWizard from '@/components/marketplace/BookingWizard';
export const metadata={title:'Réserver — Afrofade'};
export default function BookingPage(){return <Suspense fallback={<main className="min-h-screen bg-cream"/>}><BookingWizard/></Suspense>}
