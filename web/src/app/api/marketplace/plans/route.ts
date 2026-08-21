import { NextResponse } from 'next/server';
import { getMarketplaceSubscriptionCatalog } from '@/lib/marketplace-plans';
import { TERMS } from '@/lib/plans';
export async function GET(){const products=getMarketplaceSubscriptionCatalog().map(p=>({id:p.id,subjectType:p.subjectType,label:p.label,amountFcfa:p.amountFcfa,enabled:p.enabled,capabilities:p.capabilities}));return NextResponse.json({products,terms:TERMS.map(t=>({id:t.id,label:t.label,months:t.months,discount:t.discount,hint:t.hint}))});}
