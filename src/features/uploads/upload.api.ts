import { api } from "@/lib/api";

export type UploadFolder = "videos" | "images" | "books";

export type UploadResult = {
  url: string;
  key?: string;
  size?: number;
  mimeType?: string;
};

/**
 * Upload a single file to R2 via the admin upload endpoint.
 * Returns the public URL of the uploaded asset.
 */
export async function uploadAsset(
  file: File,
  folder: UploadFolder,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  const fd = new FormData();
  fd.append("file", file);

  const { data } = await api.post(`/admin/uploads/file?folder=${folder}`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (!onProgress) return;
      if (!e.total) return;
      onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });

  const payload = (data?.data ?? data) as UploadResult;
  return payload;
}
