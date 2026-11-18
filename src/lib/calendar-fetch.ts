import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";
import { normalizeCalendarUrl } from "./calendar-url";

// Only public IPv4 destinations; pin DNS to the validated address to prevent rebinding.
function publicAddress(ip: string) {
  if (isIP(ip) !== 4) return false;
  const [a, b] = ip.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0)) || (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19)));
}

export async function fetchCalendar(input: string, redirects = 0, signal = AbortSignal.timeout(15000)): Promise<string> {
  const url = new URL(normalizeCalendarUrl(input));
  const addresses = await lookup(url.hostname, { all: true, family: 4 });
  if (!addresses.length || addresses.some(a => !publicAddress(a.address))) {
    throw new Error("O calendário precisa estar em um endereço público na internet.");
  }
  return new Promise((resolve, reject) => {
    const req = request(url, {
      signal,
      family: 4,
      headers: { Accept: "text/calendar", "Accept-Encoding": "identity" },
      lookup: (_hostname, _options, callback) => callback(null, addresses[0].address, 4),
    }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode ?? 0)) {
        res.resume();
        if (!res.headers.location || redirects >= 3) return reject(new Error("O link redireciona demais. Use a URL direta do calendário."));
        fetchCalendar(new URL(res.headers.location, url).toString(), redirects + 1, signal).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Calendário inacessível (HTTP ${res.statusCode}). Confira se o link iCal está ativo e permite acesso sem login.`));
      }
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > 5 * 1024 * 1024) res.destroy(new Error("Calendário maior que o limite de 5 MB."));
        else chunks.push(chunk);
      });
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.end();
  });
}
