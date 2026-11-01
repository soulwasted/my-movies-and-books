export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (!u.hostname.endsWith("youtube.com") && !u.hostname.endsWith("youtube-nocookie.com")) return null;
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const m = u.pathname.match(/\/(?:embed|shorts|v)\/([\w-]+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}
