/**
 * Free Uzbek → Russian translation using MyMemory (no API key, CORS-enabled).
 * Falls back to the public Google translate endpoint if MyMemory fails.
 * Returns the best-effort translation or throws.
 */
export async function translateUzToRu(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";

  // Primary: MyMemory (stable, free 5000 chars/day/IP)
  try {
    const url = new URL("https://api.mymemory.translated.net/get");
    url.searchParams.set("q", trimmed);
    url.searchParams.set("langpair", "uz|ru");
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const json = (await res.json()) as {
        responseData?: { translatedText?: string };
        responseStatus?: number;
      };
      const out = json?.responseData?.translatedText?.trim();
      if (out && json.responseStatus === 200) return out;
    }
  } catch {
    /* fall through to Google */
  }

  // Fallback: Google public gtx (no key, unofficial)
  const gurl = new URL("https://translate.googleapis.com/translate_a/single");
  gurl.searchParams.set("client", "gtx");
  gurl.searchParams.set("sl", "uz");
  gurl.searchParams.set("tl", "ru");
  gurl.searchParams.set("dt", "t");
  gurl.searchParams.set("q", trimmed);

  const gres = await fetch(gurl.toString(), {
    signal: AbortSignal.timeout(10_000),
  });
  if (!gres.ok) throw new Error(`Tarjima xizmati ishlamayapti (${gres.status})`);
  const data = (await gres.json()) as Array<Array<Array<string>> | unknown>;
  const chunks = (data?.[0] as Array<Array<string>>) ?? [];
  const out = chunks
    .map((c) => c?.[0] ?? "")
    .join("")
    .trim();
  if (!out) throw new Error("Tarjima qaytmadi");
  return out;
}
