import assert from "node:assert/strict";
import test from "node:test";
import { cleanUserStoragePrefix } from "./account-storage-cleanup.ts";

const userId = "11111111-1111-4111-8111-111111111111";

function createFakeBucket(initialPaths: string[], options: { failRemove?: boolean; keepObjects?: boolean } = {}) {
  const objects = new Set(initialPaths);
  const removeCalls: string[][] = [];

  return {
    objects,
    removeCalls,
    async listV2(input: { prefix: string; limit: number; cursor?: string }) {
      const entries = new Map<string, { name: string; id: string | null }>();
      for (const objectPath of objects) {
        if (!objectPath.startsWith(input.prefix)) continue;
        const remainder = objectPath.slice(input.prefix.length);
        if (!remainder) continue;
        const [name, ...rest] = remainder.split("/");
        const fullName = input.prefix + name;
        entries.set(fullName, { name: fullName, id: rest.length ? null : "object-id" });
      }

      const sorted = [...entries.values()].sort((a, b) => a.name.localeCompare(b.name));
      const offset = input.cursor ? Number(input.cursor) : 0;
      const page = sorted.slice(offset, offset + input.limit);
      const nextOffset = offset + page.length;
      return {
        data: {
          objects: page.filter((entry) => entry.id !== null),
          folders: page.filter((entry) => entry.id === null).map((entry) => ({ name: entry.name })),
          hasNext: nextOffset < sorted.length,
          nextCursor: nextOffset < sorted.length ? String(nextOffset) : null,
        },
        error: null,
      };
    },
    async remove(paths: string[]) {
      removeCalls.push(paths);
      if (options.failRemove) return { error: { message: "storage remove failed" } };
      if (!options.keepObjects) paths.forEach((path) => objects.delete(path));
      return { error: null };
    },
  };
}

test("cleans every cursor-paginated object and deeply nested folder", async () => {
  const paths = Array.from({ length: 1001 }, (_, index) => `${userId}/file-${String(index).padStart(4, "0")}.pdf`);
  paths.push(`${userId}/one/two/three/four/five/six/deep.pdf`);
  const bucket = createFakeBucket(paths);

  const removed = await cleanUserStoragePrefix(bucket, userId);

  assert.equal(removed, 1002);
  assert.equal(bucket.objects.size, 0);
  assert.equal(bucket.removeCalls.length, 2);
  assert.ok(bucket.removeCalls.every((batch) => batch.length <= 1000));
});

test("fails closed when storage removal reports an error", async () => {
  const bucket = createFakeBucket([`${userId}/homework.pdf`], { failRemove: true });
  await assert.rejects(cleanUserStoragePrefix(bucket, userId), /storage remove failed/);
});

test("fails closed when a fresh verification listing still finds objects", async () => {
  const bucket = createFakeBucket([`${userId}/homework.pdf`], { keepObjects: true });
  await assert.rejects(cleanUserStoragePrefix(bucket, userId), /remain after cleanup/);
});

test("rejects an invalid owner prefix", async () => {
  const bucket = createFakeBucket([]);
  await assert.rejects(cleanUserStoragePrefix(bucket, "not-a-user-id"), /Invalid storage owner prefix/);
});
