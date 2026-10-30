type StorageEntry = { name?: unknown; id?: unknown };

type StorageBucketLike = {
  list(
    prefix: string,
    options: { limit: number; offset: number; sortBy: { column: "name"; order: "asc" } },
  ): Promise<{ data: unknown[] | null; error: { message: string } | null }>;
  remove(paths: string[]): Promise<{ error: { message: string } | null }>;
};

/** Delete and verify every object beneath one user's storage prefix. */
export async function cleanUserStoragePrefix(bucket: StorageBucketLike, userId: string): Promise<number> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error("Invalid storage owner prefix.");

  async function listAllFiles(): Promise<string[]> {
    const pendingPrefixes = [userId];
    const visitedPrefixes = new Set<string>();
    const files: string[] = [];
    const pageSize = 100;

    while (pendingPrefixes.length > 0) {
      const prefix = pendingPrefixes.pop()!;
      if (visitedPrefixes.has(prefix)) continue;
      visitedPrefixes.add(prefix);

      let offset = 0;
      while (true) {
        const { data, error } = await bucket.list(prefix, {
          limit: pageSize,
          offset,
          sortBy: { column: "name", order: "asc" },
        });
        if (error) throw new Error(error.message);

        const entries = data || [];
        for (const rawEntry of entries) {
          const entry = rawEntry as StorageEntry;
          const name = entry.name;
          if (typeof name !== "string" || !name || name === "." || name === ".." || name.includes("/") || name.includes("\\")) {
            throw new Error("Storage returned an invalid path segment.");
          }
          if (entry.id !== null && typeof entry.id !== "string") {
            throw new Error("Storage returned an invalid object listing entry.");
          }

          const objectPath = prefix + "/" + name;
          if (entry.id === null) pendingPrefixes.push(objectPath);
          else files.push(objectPath);
        }

        offset += entries.length;
        if (entries.length < pageSize) break;
      }
    }

    return files;
  }

  const files = await listAllFiles();
  for (let index = 0; index < files.length; index += 1000) {
    const { error } = await bucket.remove(files.slice(index, index + 1000));
    if (error) throw new Error(error.message);
  }

  const remaining = await listAllFiles();
  if (remaining.length > 0) {
    throw new Error(remaining.length + " user-owned storage object(s) remain after cleanup.");
  }

  return files.length;
}
