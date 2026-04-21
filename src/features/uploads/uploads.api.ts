import { api, apiDelete, apiPost, unwrap } from "@/lib/api";

export type UploadFolder =
  | "videos"
  | "images"
  | "books"
  | "konspekts"
  | "avatars"
  | "ai-chat"
  | "misc";

export const UPLOAD_FOLDERS: { value: UploadFolder; label: string }[] = [
  { value: "images", label: "Rasmlar (images)" },
  { value: "videos", label: "Videolar (videos)" },
  { value: "books", label: "Kitoblar (books)" },
  { value: "konspekts", label: "Konspektlar (konspekts)" },
  { value: "avatars", label: "Avatarlar (avatars)" },
  { value: "ai-chat", label: "AI chat (ai-chat)" },
  { value: "misc", label: "Turli (misc)" },
];

export type UploadedObject = {
  key: string;
  url: string;
  bucket: string;
  contentType: string;
  size: number;
  originalName: string;
};

export type PresignedUpload = {
  url: string;
  key: string;
  expiresInSec: number;
  method?: string;
  headers?: Record<string, string>;
};

export async function uploadToR2(
  file: File,
  folder: UploadFolder,
  onProgress?: (pct: number) => void
): Promise<UploadedObject> {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post(
    `/admin/uploads/file?folder=${folder}`,
    fd,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (e.total && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    }
  );
  return unwrap<UploadedObject>(data);
}

export function presignUpload(body: {
  folder: UploadFolder;
  originalName: string;
  contentType: string;
  expiresInSec?: number;
}) {
  return apiPost<PresignedUpload>("/admin/uploads/presign", body);
}

export function deleteObjectByKey(key: string) {
  return apiDelete<{ ok: boolean }>(
    `/admin/uploads/object?key=${encodeURIComponent(key)}`
  );
}

export function deleteObjectByUrl(url: string) {
  return apiDelete<{ ok: boolean }>(
    `/admin/uploads/object?url=${encodeURIComponent(url)}`
  );
}
