/** Stream request bodies into bounded memory before parsing. */
async function readBoundedBytes(request: Request, maxBytes: number): Promise<Uint8Array> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error("INVALID_BODY_LIMIT");

  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    if (!/^\d+$/.test(declaredLength)) throw new Error("INVALID_CONTENT_LENGTH");
    if (Number(declaredLength) > maxBytes) throw new Error("REQUEST_TOO_LARGE");
  }
  if (!request.body) throw new Error("EMPTY_REQUEST_BODY");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("REQUEST_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function readBoundedJson(request: Request, maxBytes: number): Promise<unknown> {
  const bytes = await readBoundedBytes(request, maxBytes);
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new Error("INVALID_JSON");
  }
}

export async function readBoundedFormData(request: Request, maxBytes: number): Promise<FormData> {
  const bytes = await readBoundedBytes(request, maxBytes);
  const contentType = request.headers.get("content-type");
  if (!contentType?.toLowerCase().startsWith("multipart/form-data;")) throw new Error("INVALID_FORM_DATA");
  try {
    const replay = new Request(request.url, {
      method: "POST",
      headers: { "content-type": contentType },
      body: new Blob([bytes.buffer as ArrayBuffer], { type: contentType }),
    });
    return await replay.formData();
  } catch {
    throw new Error("INVALID_FORM_DATA");
  }
}
