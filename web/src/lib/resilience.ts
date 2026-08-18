/**
/**
 * Utilitaire de résilience réseau pour les requêtes HTTP (Afrofade SaaS).
 * Exécute jusqu'à maxRetries tentatives avec backoff exponentiel en cas
 * d'instabilité ou de micro-coupures 3G/4G/Wi-Fi en salon de coiffure.
 */

export interface RetryOptions extends RequestInit {
  maxRetries?: number;
  initialBackoffMs?: number;
  retryOnStatusCodes?: number[];
}

export async function fetchWithRetry(
  url: string,
  options: RetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    initialBackoffMs = 500,
    retryOnStatusCodes = [500, 502, 503, 504],
    ...fetchOptions
  } = options;

  let attempt = 0;
  let delay = initialBackoffMs;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, fetchOptions);

      if (response.ok || !retryOnStatusCodes.includes(response.status)) {
        return response;
      }

      attempt++;
      if (attempt >= maxRetries) {
        return response; // Return response if max retries reached
      }
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        throw error;
      }
    }

    // Exponential backoff
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay *= 2;
  }

  throw new Error(`Échec de la requête après ${maxRetries} tentatives.`);
}
