import { apiPost } from "@/lib/api";
import type { NotificationType } from "@/lib/api-types";

export type NotificationPayloadBase = {
  titleUz: string;
  titleRu: string;
  messageUz: string;
  messageRu: string;
  type: NotificationType;
  relatedId?: number | null;
  data?: Record<string, unknown> | null;
};

export type SendUserPayload = NotificationPayloadBase & { userId: number };
export type SendManyPayload = NotificationPayloadBase & { userIds: number[] };
export type BroadcastPayload = NotificationPayloadBase;

export type SendResponse = {
  recipients?: number;
  sent?: number;
  created?: number;
};

export const notificationsApi = {
  sendUser: (body: SendUserPayload) =>
    apiPost<SendResponse>("/admin/notifications/send-user", body),
  sendMany: (body: SendManyPayload) =>
    apiPost<SendResponse>("/admin/notifications/send-many", body),
  broadcast: (body: BroadcastPayload) =>
    apiPost<SendResponse>("/admin/notifications/broadcast", body),
};

export const NOTIFICATION_TYPES: { value: NotificationType; label: string }[] = [
  { value: "SYSTEM", label: "Tizim" },
  { value: "LESSON", label: "Dars" },
  { value: "BOOK", label: "Kitob" },
  { value: "SUBSCRIPTION", label: "Obuna" },
  { value: "AI_CHAT", label: "AI suhbat" },
];

export function notificationTypeLabel(type: NotificationType): string {
  return NOTIFICATION_TYPES.find((t) => t.value === type)?.label ?? type;
}
