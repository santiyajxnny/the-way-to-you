// Returns one little world by its code. Anything older than 6 months is deleted instead.
import { getStore } from "@netlify/blobs";

const SIX_MONTHS = 183 * 24 * 60 * 60 * 1000;
const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...extra } });

export default async (req) => {
  const k = new URL(req.url).searchParams.get("k") || "";
  if (!/^[A-Za-z0-9]{6,32}$/.test(k)) return json({ error: "not_found" }, 404);

  const store = getStore("worlds");
  const world = await store.get(k, { type: "json" });
  if (!world) return json({ error: "not_found" }, 404);

  if (!world.created || Date.now() - world.created > SIX_MONTHS) {
    await store.delete(k);
    return json({ error: "expired" }, 410);
  }
  return json({ data: world.data, photo: world.photo, created: world.created }, 200, {
    "cache-control": "no-store",
  });
};

export const config = {
  path: "/api/load",
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
