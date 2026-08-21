import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { getServiceSupabase } from '@/lib/supabase';

function clean(value: unknown, max: number): string | null {
  const text = typeof value === 'string' ? value.trim().slice(0, max) : '';
  return text || null;
}

async function ownedProfile(userId: string) {
  const { data, error } = await getServiceSupabase().from('professional_profiles').select('id').eq('user_id', userId).maybeSingle();
  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data;
}

export async function GET(req: NextRequest) {
  try {
    const principal = await getVerifiedPrincipal(req);
    if (!principal) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    const profile = await ownedProfile(principal.user.id);
    if (!profile) return NextResponse.json({ items: [] });
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.from('professional_portfolio_items')
      .select('id, bucket, storage_path, mime_type, file_size_bytes, title, description, moderation_status, publication_status, created_at, portfolio_taxonomy_links(taxonomy_id, hair_taxonomy(slug,label_fr))')
      .eq('professional_profile_id', profile.id).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    console.error('[Portfolio] GET failed:', error);
    return NextResponse.json({ error: 'Impossible de charger le portfolio.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const principal = await getVerifiedPrincipal(req);
    if (!principal) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    const profile = await ownedProfile(principal.user.id);
    if (!profile) return NextResponse.json({ error: 'Créez d’abord votre profil professionnel.' }, { status: 409 });
    const body = await req.json();
    const bucket = body?.storageRef?.bucket === 'portfolio' ? 'portfolio' : '';
    const path = typeof body?.storageRef?.path === 'string' ? body.storageRef.path.trim() : '';
    const mimeType = typeof body?.mimeType === 'string' ? body.mimeType.toLowerCase() : '';
    const fileSize = Number(body?.fileSize || 0);
    const expectedPrefix = `professionals/${profile.id}/`;
    if (!bucket || !path.startsWith(expectedPrefix) || path.includes('..')) return NextResponse.json({ error: 'Référence de fichier invalide.' }, { status: 400 });
    if (!['image/jpeg','image/png','image/webp'].includes(mimeType) || !Number.isInteger(fileSize) || fileSize < 1 || fileSize > 8 * 1024 * 1024) return NextResponse.json({ error: 'Métadonnées image invalides.' }, { status: 400 });

    const taxonomyIds = Array.isArray(body?.taxonomyIds) ? [...new Set(body.taxonomyIds.filter((id: unknown) => typeof id === 'string'))].slice(0, 12) : [];
    const supabase = getServiceSupabase();
    if (taxonomyIds.length) {
      const { data: validTaxonomy, error: taxonomyError } = await supabase.from('hair_taxonomy').select('id').in('id', taxonomyIds).eq('active', true);
      if (taxonomyError) throw new Error(taxonomyError.message);
      if ((validTaxonomy?.length ?? 0) !== taxonomyIds.length) return NextResponse.json({ error: 'Un ou plusieurs styles sont invalides.' }, { status: 400 });
    }

    const { data: item, error } = await supabase.from('professional_portfolio_items').insert({
      professional_profile_id: profile.id,
      owner_user_id: principal.user.id,
      bucket,
      storage_path: path,
      mime_type: mimeType,
      file_size_bytes: fileSize,
      title: clean(body?.title, 160),
      description: clean(body?.description, 1200),
      publication_status: 'draft',
      moderation_status: 'pending',
    }).select('id').single();
    if (error || !item) throw new Error(error?.message || 'portfolio_insert_failed');

    if (taxonomyIds.length) {
      const { error: linkError } = await supabase.from('portfolio_taxonomy_links').insert(taxonomyIds.map((taxonomyId) => ({ portfolio_item_id: item.id, taxonomy_id: taxonomyId })));
      if (linkError) {
        await supabase.from('professional_portfolio_items').delete().eq('id', item.id).eq('owner_user_id', principal.user.id);
        throw new Error(linkError.message);
      }
    }
    return NextResponse.json({ id: item.id, status: 'pending' }, { status: 201 });
  } catch (error) {
    console.error('[Portfolio] POST failed:', error);
    return NextResponse.json({ error: 'Impossible d’ajouter cette réalisation.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const principal = await getVerifiedPrincipal(req);
    if (!principal) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    const id = new URL(req.url).searchParams.get('id') || '';
    if (!id) return NextResponse.json({ error: 'Réalisation requise.' }, { status: 400 });
    const profile = await ownedProfile(principal.user.id);
    if (!profile) return NextResponse.json({ error: 'Réalisation introuvable.' }, { status: 404 });
    const supabase = getServiceSupabase();
    const { data: item, error } = await supabase.from('professional_portfolio_items').select('id,bucket,storage_path').eq('id', id).eq('professional_profile_id', profile.id).eq('owner_user_id', principal.user.id).maybeSingle();
    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    if (!item) return NextResponse.json({ error: 'Réalisation introuvable.' }, { status: 404 });
    const { error: deleteError } = await supabase.from('professional_portfolio_items').delete().eq('id', item.id).eq('owner_user_id', principal.user.id);
    if (deleteError) throw new Error(deleteError.message);
    const storageResult = await supabase.storage.from(item.bucket).remove([item.storage_path]);
    if (storageResult.error) console.warn('[Portfolio] metadata deleted but storage cleanup failed:', storageResult.error.message);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('[Portfolio] DELETE failed:', error);
    return NextResponse.json({ error: 'Impossible de supprimer cette réalisation.' }, { status: 500 });
  }
}
