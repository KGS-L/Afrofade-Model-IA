import { Suspense } from 'react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';

export default function WorkspacePage() {
  return <Suspense fallback={<DashboardSkeleton />}><WorkspaceShell /></Suspense>;
}
