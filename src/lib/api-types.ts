// ============================================================================
// Backend types (Football Coach API — mirrors Prisma models)
// ============================================================================

export type Role = "ADMIN" | "USER";

export type User = {
  id: number;
  phone: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  birthDate?: string | null;
  avatarUrl?: string | null;
  isVerified: boolean;
  isActive: boolean;
  roleId: number;
  role?: { id: number; name: Role };
  createdAt: string;
  updatedAt: string;
};

export type AgeCategory = {
  id: number;
  titleUz: string;
  titleRu: string;
  minAge: number;
  maxAge: number;
  iconUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TrainingCategory = {
  id: number;
  titleUz: string;
  titleRu: string;
  descriptionUz: string;
  descriptionRu: string;
  imageUrl?: string | null;
  ageCategoriesId: number;
  ageCategory?: AgeCategory;
  lessonCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type BlockType = "TITLE" | "TEXT" | "VIDEO" | "IMAGE" | "FILE" | "HINT";

export type LessonBlock = {
  id: number;
  lessonId: number;
  blockType: BlockType;
  contentUz: string;
  contentRu: string;
  duration?: number | null;
  sequenceOrder: number;
  isFree?: boolean;
  isLocked?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TrainingLesson = {
  id: number;
  trainingCategoryId: number;
  trainingCategory?: TrainingCategory;
  titleUz: string;
  titleRu: string;
  isFree?: boolean;
  isLocked?: boolean;
  lessonBlocks?: LessonBlock[];
  createdAt: string;
  updatedAt: string;
};

export type MasterclassCategory = {
  id: number;
  titleUz: string;
  titleRu: string;
  descriptionUz: string;
  descriptionRu: string;
  imageUrl?: string | null;
  masterclassCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type MasterclassBlock = {
  id: number;
  masterclassId: number;
  blockType: BlockType;
  contentUz: string;
  contentRu: string;
  duration?: number | null;
  sequenceOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type Masterclass = {
  id: number;
  masterclassCategoryId: number;
  masterclassCategory?: MasterclassCategory;
  titleUz: string;
  titleRu: string;
  masterclassBlocks?: MasterclassBlock[];
  createdAt: string;
  updatedAt: string;
};

export type BookCategoryType = "BOOK" | "KONSPEKT";

// ---------------------------------------------------------------------------
// Legal documents
// ---------------------------------------------------------------------------

export type LegalDocumentType =
  | "PRIVACY_POLICY"
  | "TERMS_OF_SERVICE"
  | "OFFER_AGREEMENT"
  | "REQUISITES";

export type LegalDocument = {
  id: number;
  type: LegalDocumentType;
  version: number;
  titleUz: string;
  titleRu: string;
  contentUz: string;
  contentRu: string;
  isActive: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type BookCategory = {
  id: number;
  titleUz: string;
  titleRu: string;
  categoryType: BookCategoryType;
  createdAt: string;
  updatedAt: string;
};

export type DiscountType = "NONE" | "PERCENTAGE" | "FIXED_PRICE";

export type Book = {
  id: number;
  bookCategoryId: number;
  bookCategory?: BookCategory;
  titleUz: string;
  titleRu: string;
  descriptionUz: string;
  descriptionRu: string;
  fileUrl: string;
  fileUrlUz?: string | null;
  fileUrlRu?: string | null;
  coverImageUrl?: string | null;
  tacticHintImg?: string | null;
  basePrice: number;
  discountType: DiscountType;
  discountPercent: number;
  fixedDiscountPrice?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type PlanFeature = {
  uz: string;
  ru: string;
  highlight?: boolean;
};

export type SubscriptionPlan = {
  id: number;
  titleUz: string;
  titleRu: string;
  descriptionUz: string;
  descriptionRu: string;
  durationDays: number;
  basePrice: number;
  discountType: DiscountType;
  discountPercent: number;
  fixedDiscountPrice?: number | null;
  isActive: boolean;
  features: PlanFeature[];
  createdAt: string;
  updatedAt: string;
};

export type Subscription = {
  id: number;
  userId: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  subscriptionsPlansId: number;
  subscriptionsPlan?: SubscriptionPlan;
  user?: User;
  createdAt: string;
  updatedAt: string;
};

export type NotificationType =
  | "SYSTEM"
  | "LESSON"
  | "BOOK"
  | "SUBSCRIPTION"
  | "AI_CHAT";

export type Notification = {
  id: number;
  userId: number;
  type: NotificationType;
  titleUz: string;
  titleRu: string;
  messageUz: string;
  messageRu: string;
  relatedId?: number | null;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// Stats (admin/stats)
// ============================================================================

export type StatsOverview = {
  users: { total: number; active: number; newLast7d: number; newLast30d: number };
  subscriptions: { active: number; expired: number; totalEver: number };
  revenue: {
    totalSuccess: number;
    last7d: number;
    last30d: number;
    pendingAmount: number;
  };
  content: {
    lessons: number;
    books: number;
    trainingCategories: number;
    ageCategories: number;
  };
  engagement: {
    totalLessonProgress: number;
    completedLessons: number;
    aiChatsTotal: number;
  };
};

export type RevenuePoint = { date: string; total: number; count: number };
export type UsersGrowthPoint = { date: string; count: number };

export type TopLesson = {
  lessonId: number;
  titleUz: string;
  titleRu: string;
  categoryTitleUz?: string;
  progressCount: number;
  completedCount: number;
};

export type TopBook = {
  bookId: number;
  titleUz: string;
  titleRu: string;
  purchaseCount: number;
};

export type SubscriptionByPlan = {
  planId: number;
  titleUz: string;
  titleRu: string;
  activeCount: number;
  totalCount: number;
  revenue: number;
};

export type NotificationsSummary = {
  total: number;
  unread: number;
  byType: { type: NotificationType; total: number; unread: number }[];
};

// ============================================================================
// Auth
// ============================================================================

export type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
};
