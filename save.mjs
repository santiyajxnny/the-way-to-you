// Saves one little world (names, memories, message, optional photo) and returns a short code.
import { getStore } from "@netlify/blobs";

const MAX_BODY = 700_000;      // whole request, in characters
const MAX_PHOTO = 600_000;     // decoded photo, in bytes
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const cut = (v, n) => String(v ?? "").trim().slice(0, n);

function newId() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => abc[b % abc.length]).join("");
}

function checkPhoto(photo) {
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(photo);
  if (!m) return false;
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length === 0 || bytes.length > MAX_PHOTO) return false;
  const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isWebp = bytes.subarray(8, 12).toString("ascii") === "WEBP";
  return isJpg || isPng || isWebp;
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (Number(req.headers.get("content-length") || 0) > MAX_BODY) return json({ error: "too_large" }, 413);

  let body;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY) return json({ error: "too_large" }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  const d = body?.data || {};
  const data = {
    a: cut(d.a, 24),
    b: cut(d.b, 24),
    d: /^\d{4}-\d{2}-\d{2}$/.test(d.d || "") ? d.d : "",
    m: (Array.isArray(d.m) ? d.m : []).slice(0, 3).map((x) => cut(x, 120)),
    msg: cut(d.msg, 400),
    km: d.km !== false,
  };
  if (!data.a || !data.b) return json({ error: "names_required" }, 400);

  let photo = null;
  if (body.photo) {
    if (typeof body.photo !== "string" || !checkPhoto(body.photo)) return json({ error: "bad_photo" }, 400);
    photo = body.photo;
  }

  const created = Date.now();
  const id = newId();
  await getStore("worlds").setJSON(id, { data, photo, created }, { metadata: { created } });
  return json({ k: id });
};

export const config = {
  path: "/api/save",
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
