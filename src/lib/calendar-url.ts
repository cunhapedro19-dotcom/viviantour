export function normalizeCalendarUrl(input: string): string {
  let url: URL;
  try { url = new URL(input.trim().replace(/^webcal:\/\//i, "https://")); }
  catch { throw new Error("Informe uma URL iCal válida, começando com https:// ou webcal://."); }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
    throw new Error("Use uma URL https:// ou webcal:// sem usuário e senha.");
  }
  url.hash = "";
  return url.toString();
}
