import { getServiceSupabase } from './marketplace';

export interface StorageUploadOptions {
  bucket?: string;
  folder?: 'heads' | 'hair' | 'temp_photos' | 'exports';
  contentType?: string;
}

export class AssetStorage {
  private static DEFAULT_BUCKET = '3d-assets';

  /**
   * Generates a deterministic storage path for canonical assets.
   */
  public static getPath(folder: 'heads' | 'hair' | 'temp_photos' | 'exports', filename: string): string {
    return `${folder}/${filename}`;
  }

  /**
   * Uploads binary buffer to Supabase Storage with structured prefix.
   */
  public static async uploadBuffer(
    buffer: Buffer | Uint8Array,
    filename: string,
    options: StorageUploadOptions = {}
  ): Promise<{ path: string; publicUrl: string }> {
    const supabase = getServiceSupabase();
    const bucket = options.bucket || this.DEFAULT_BUCKET;
    const folder = options.folder || 'heads';
    const filePath = this.getPath(folder, filename);

    const { error } = await supabase.storage.from(bucket).upload(filePath, buffer, {
      contentType: options.contentType || 'model/gltf-binary',
      upsert: true,
    });

    if (error) {
      throw new Error(`AssetStorage upload failed: ${error.message}`);
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return {
      path: filePath,
      publicUrl: data.publicUrl,
    };
  }

  /**
   * Generates a signed read URL for private assets.
   */
  public static async getSignedReadUrl(filePath: string, expiresInSeconds: number = 3600): Promise<string> {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.storage
      .from(this.DEFAULT_BUCKET)
      .createSignedUrl(filePath, expiresInSeconds);

    if (error || !data) {
      throw new Error(`Failed to generate signed URL: ${error?.message}`);
    }
    return data.signedUrl;
  }
}
