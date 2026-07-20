/**
 * Fetch images from Wikipedia for answer names.
 * Uses the Wikipedia REST API (free, no API key needed).
 */

const WIKI_API = "https://en.wikipedia.org/api/rest_v1";
const WIKI_TH_API = "https://th.wikipedia.org/api/rest_v1";

/**
 * Try to get a thumbnail image for a given name/topic from Wikipedia.
 * Tries Thai Wikipedia first, then English.
 * Returns the image URL or null.
 */
export async function getWikipediaImage(name: string): Promise<string | null> {
  // Clean up name for search
  const cleanName = name.replace(/[()]/g, "").trim();
  
  // Try Thai Wikipedia first
  const thUrl = await fetchWikiImage(WIKI_TH_API, cleanName);
  if (thUrl) return thUrl;
  
  // Try English Wikipedia
  const enUrl = await fetchWikiImage(WIKI_API, cleanName);
  if (enUrl) return enUrl;
  
  return null;
}

async function fetchWikiImage(apiBase: string, title: string): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(title);
    const res = await fetch(
      `${apiBase}/page/summary/${encoded}`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    // Use thumbnail if available (smaller, faster)
    return data?.thumbnail?.source ?? data?.originalimage?.source ?? null;
  } catch {
    return null;
  }
}

/**
 * Batch fetch images for multiple names.
 * Returns a map of name -> imageUrl (only for successful lookups).
 */
export async function getImagesForAnswers(
  answers: Record<string, string>
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const entries = Object.entries(answers);
  
  // Fetch in parallel with a concurrency limit
  const BATCH_SIZE = 3;
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async ([playerId, name]) => {
        const url = await getWikipediaImage(name);
        if (url) result[playerId] = url;
      })
    );
    // results are consumed via side effects on `result`
    void results;
  }
  
  return result;
}
