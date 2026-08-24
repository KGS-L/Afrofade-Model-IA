import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { getServiceSupabase } from '@/lib/supabase';

const CUSTOMER_RECONSTRUCTION_COST = 2;
const JOB_ID_PATTERN = /^recon_[0-9]+$/;

function cleanClientName(value: unknown): string {
  if (typeof value !== 'string') return 'Client Afrofade';
  return value.trim().slice(0, 255) || 'Client Afrofade';
}

function cleanRequestId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const requestId = value.trim();
  return /^[a-zA-Z0-9_-]{12,120}$/.test(requestId) ? requestId : null;
}

async function deleteGeneratedModel(backendUrl: string, internalSecret: string, jobId: string) {
  if (!JOB_ID_PATTERN.test(jobId)) return;
  try {
    await fetch(`${backendUrl}/api/v1/models/${jobId}.glb`, {
      method: 'DELETE',
      headers: { 'X-Internal-API-Key': internalSecret },
      cache: 'no-store',
    });
  } catch (error) {
    console.warn('[Reconstruct Proxy] Unable to clean orphaned generated model:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const principal = await getVerifiedPrincipal(request);
    if (!principal) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });

    const body = await request.json();
    const payloadPhotos = body?.photos_urls || body?.photos;
    const requestId = cleanRequestId(body?.requestId);
    const clientName = cleanClientName(body?.clientName || body?.client_name);

    if (!requestId) {
      return NextResponse.json({ error: 'Identifiant de reconstruction invalide.' }, { status: 400 });
    }

    if (!Array.isArray(payloadPhotos) || payloadPhotos.length < 3) {
      return NextResponse.json({ error: 'Au moins 3 photos client sont requises.' }, { status: 400 });
    }

    if (payloadPhotos.length > 4 || payloadPhotos.some((photo) => typeof photo !== 'string' || photo.length === 0)) {
      return NextResponse.json({ error: 'Entre 3 et 4 photos valides sont autorisées.' }, { status: 400 });
    }

    const supabaseAdmin = getServiceSupabase();
    const now = new Date().toISOString();

    // Fail fast before spending AI compute. The final debit/quota update remains
    // atomic in PostgreSQL after reconstruction succeeds.
    if (principal.role === 'customer') {
      const { data: wallet, error } = await supabaseAdmin
        .from('credit_wallets')
        .select('balance')
        .eq('user_id', principal.user.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!wallet || Number(wallet.balance) < CUSTOMER_RECONSTRUCTION_COST) {
        return NextResponse.json(
          { error: `Cette reconstruction nécessite ${CUSTOMER_RECONSTRUCTION_COST} crédits.`, code: 'insufficient_credits' },
          { status: 402 }
        );
      }
    } else if (principal.role === 'salon') {
      if (!principal.salonId) {
        return NextResponse.json({ error: 'Profil salon incomplet.' }, { status: 403 });
      }

      const [subscriptionResult, salonResult] = await Promise.all([
        supabaseAdmin
          .from('subscriptions')
          .select('id')
          .eq('salon_id', principal.salonId)
          .eq('status', 'active')
          .gt('expires_at', now)
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from('salons')
          .select('quota_limit, quota_used')
          .eq('id', principal.salonId)
          .single(),
      ]);

      if (subscriptionResult.error) throw new Error(subscriptionResult.error.message);
      if (salonResult.error || !salonResult.data) throw new Error(salonResult.error?.message || 'Salon not found.');

      if (!subscriptionResult.data) {
        return NextResponse.json(
          { error: 'Un abonnement salon actif est requis pour lancer une reconstruction.', code: 'subscription_required' },
          { status: 402 }
        );
      }
      if (Number(salonResult.data.quota_used) >= Number(salonResult.data.quota_limit)) {
        return NextResponse.json(
          { error: 'Le quota de reconstructions de votre salon est épuisé.', code: 'quota_exhausted' },
          { status: 429 }
        );
      }
    }

    const backendUrl = process.env.API_INTERNAL_URL;
    const internalSecret = process.env.API_INTERNAL_SECRET;
    if (!backendUrl || !internalSecret) {
      console.error('[Reconstruct Proxy] API_INTERNAL_URL/API_INTERNAL_SECRET missing.');
      return NextResponse.json({ error: 'Service 3D indisponible.' }, { status: 503 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000);
    let jobId: string | null = null;

    try {
      const response = await fetch(`${backendUrl}/api/v1/reconstruct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-API-Key': internalSecret,
        },
        body: JSON.stringify({
          photos_urls: payloadPhotos,
          client_name: clientName,
          salon_id: principal.salonId || principal.user.id,
          preserve_skin_texture: true,
        }),
        signal: controller.signal,
        cache: 'no-store',
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        console.error(`[Reconstruct Proxy] Backend ${response.status}: ${detail.slice(0, 300)}`);
        return NextResponse.json({ error: 'La reconstruction 3D a échoué.' }, { status: response.status });
      }

      const reconstructed = (await response.json()) as {
        status?: string;
        job_id?: string;
        processing_time_ms?: number;
        vertices_count?: number;
        identity_preserved?: boolean;
        message?: string;
      };

      jobId = typeof reconstructed.job_id === 'string' ? reconstructed.job_id : null;
      if (reconstructed.status !== 'success' || !jobId || !JOB_ID_PATTERN.test(jobId)) {
        console.error('[Reconstruct Proxy] Invalid backend reconstruction response:', reconstructed);
        return NextResponse.json({ error: 'Réponse invalide du moteur 3D.' }, { status: 502 });
      }

      const meshGlbUrl = `/api/v1/models/${jobId}.glb`;
      let usage: unknown;
      if (principal.role === 'admin') {
        usage = { admin_free_test: true, balance: 999, head_id: jobId };
      } else if (principal.role === 'customer') {
        const { data, error } = await supabaseAdmin.rpc('finalize_customer_reconstruction', {
          p_user_id: principal.user.id,
          p_mesh_url: meshGlbUrl,
          p_client_name: clientName,
          p_request_key: requestId,
          p_cost: CUSTOMER_RECONSTRUCTION_COST,
        });
        if (error) {
          if (error.message.includes('insufficient_credits')) {
            await deleteGeneratedModel(backendUrl, internalSecret, jobId);
            return NextResponse.json({ error: 'Crédits insuffisants.', code: 'insufficient_credits' }, { status: 402 });
          }
          throw new Error(error.message);
        }
        usage = data;
      } else {
        const { data, error } = await supabaseAdmin.rpc('finalize_salon_reconstruction', {
          p_salon_id: principal.salonId,
          p_mesh_url: meshGlbUrl,
          p_client_name: clientName,
          p_request_key: requestId,
        });
        if (error) {
          if (error.message.includes('quota_exhausted')) {
            await deleteGeneratedModel(backendUrl, internalSecret, jobId);
            return NextResponse.json({ error: 'Quota salon épuisé.', code: 'quota_exhausted' }, { status: 429 });
          }
          throw new Error(error.message);
        }
        usage = data;
      }

      return NextResponse.json({
        status: 'success',
        requestId,
        meshGlbUrl,
        processingTimeMs: Number(reconstructed.processing_time_ms || 0),
        verticesCount: Number(reconstructed.vertices_count || 0),
        identityPreserved: reconstructed.identity_preserved === true,
        message: reconstructed.message || 'Reconstruction terminée.',
        usage,
      });
    } catch (fetchError) {
      if (jobId) await deleteGeneratedModel(backendUrl, internalSecret, jobId);
      console.error('[Reconstruct Proxy] Reconstruction failed:', fetchError);
      const aborted = fetchError instanceof Error && fetchError.name === 'AbortError';
      return NextResponse.json(
        { error: aborted ? 'Le moteur 3D a dépassé le délai autorisé.' : 'Le moteur 3D est temporairement indisponible.' },
        { status: 503 }
      );
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error('[Reconstruct Proxy]', error);
    return NextResponse.json({ error: 'Erreur interne lors de la reconstruction 3D.' }, { status: 500 });
  }
}
