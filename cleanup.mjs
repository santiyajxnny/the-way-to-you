// Runs once a day and deletes every little world older than 6 months.
import { getStore } from "@netlify/blobs";

const SIX_MONTHS = 183 * 24 * 60 * 60 * 1000;

export default async () => {
  const store = getStore("worlds");
  const { blobs } = await store.list();
  const now = Date.now();
  let removed = 0;
  for (const { key } of blobs) {
    const meta = await store.getMetadata(key);
    const created = Number(meta?.metadata?.created || 0);
    if (!created || now - created > SIX_MONTHS) {
      await store.delete(key);
      removed++;
    }
  }
  console.log(`cleanup: removed ${removed} of ${blobs.length}`);
};

export const config = { schedule: "@daily" };
