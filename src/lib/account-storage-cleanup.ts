type StorageObjectEntry = { name?: unknown; id?: unknown };
type StorageFolderEntry = { name?: unknown };

type StorageBucketLike = {
  listV2(options: {
    prefix: string;
    limit: number;
    cursor?: string;
    with_delimiter: true;
  }): Promise<{
    data: {
      objects?: unknown[];
      folders?: unknown[];
      hasNext: boolean;
      nextCursor?: string | null;
    } | null;
    error: { message: string } | null;
  }>;
  remove(paths: string[]): Promise<{ error: { message: string } | null }>;
};

/** Delete and verify every object beneath one user's storage prefix. */
export async function cleanUserStoragePrefix(bucket: StorageBucketLike, userId: string): Promise<number> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error("Invalid storage owner prefix.");

  function resolvePath(prefix: string, rawName: unknown): string {
    if (typeof rawName !== "string" || !rawName) throw new Error("Storage returned an invalid path.");
    const name = rawName.replace(/\\/+$/, "");
    const path = name.startsWith(userId + "/") ? name : prefix + "/" + name;
    if (
      !path.startsWith(userId + "/") ||
      path.split("/").some((segment) => !segment || segment === "." || segment === ".." || segment.includes(String.fromCharCode(92)))
    ) {
      throw new Error("Storage returned a path outside the account prefix.");
    }
    return path;
  }

  async function listAllFiles(): Promise<string[]> {
    const pendingPrefixes = [userId];
    const visitedPrefixes = new Set<string>();
    const files: string[] = [];
    const pageSize = 100;

    while (pendingPrefixes.length > 0) {
      const prefix = pendingPrefixes.pop()!;
      if (visitedPrefixes.has(prefix)) continue;
      visitedPrefixes.add(prefix);

      let cursor: string | undefined;
      while (true) {
        const { data, error } = await bucket.listV2({
          prefix: prefix + "/",
          limit: pageSize,
          ...(cursor ? { cursor } : {}),
          with_delimiter: true,
        });
        if (error) throw new Error(error.message);
        if (!data) throw new Error("Storage returned an empty listing response.");

        for (const rawObject of data.objects || []) {
          const object = rawObject as StorageObjectEntry;
          if (typeof object.id !== "string") throw new Error("Storage returned an invalid object listing entry.");
          files.push(resolvePath(prefix, object.name));
        }

        for (const rawFolder of data.folders || []) {
          const folder = rawFolder as StorageFolderEntry;
          const folderPath = resolvePath(prefix, folder.name);
          if (folderPath === prefix) throw new Error("Storage returned a recursive folder path.");
          pendingPrefixes.push(folderPath);
        }

        if (!data.hasNext) break;
        if (!data.nextCursor || data.nextCursor === cursor) {
          throw new Error("Storage pagination did not return a usable next cursor.");
        }
        cursor = data.nextCursor;
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
