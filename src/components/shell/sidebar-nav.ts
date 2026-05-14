import {
  LayoutDashboard,
  Users,
  Baby,
  Dumbbell,
  BookOpen,
  Library,
  GraduationCap,
  BellRing,
  CreditCard,
  Package,
  UploadCloud,
  BarChart3,
  Crown,
  FileText,
  Film,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  group: "main" | "content" | "revenue" | "ops";
};

export const navItems: NavItem[] = [
  { group: "main", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { group: "main", label: "Analitika", href: "/analytics", icon: BarChart3 },
  { group: "main", label: "Foydalanuvchilar", href: "/users", icon: Users },

  { group: "content", label: "Yosh toifalari", href: "/age-categories", icon: Baby },
  { group: "content", label: "Mashg'ulot toifalari", href: "/training-categories", icon: Dumbbell },
  { group: "content", label: "Darslar", href: "/lessons", icon: GraduationCap },
  { group: "content", label: "Masterklass toifalari", href: "/masterclass-categories", icon: Crown },
  { group: "content", label: "Masterklasslar", href: "/masterclasses", icon: Film },
  { group: "content", label: "Kitob toifalari", href: "/book-categories", icon: Library },
  { group: "content", label: "Kitoblar", href: "/books", icon: BookOpen },

  { group: "revenue", label: "Tariflar", href: "/plans", icon: Package },
  { group: "revenue", label: "Obunalar", href: "/subscriptions", icon: CreditCard },

  { group: "ops", label: "Xabarnomalar", href: "/notifications", icon: BellRing },
  { group: "ops", label: "Huquqiy hujjatlar", href: "/legal", icon: FileText },
  { group: "ops", label: "Yuklash (R2)", href: "/uploads", icon: UploadCloud },
];

export const groupLabels: Record<NavItem["group"], string> = {
  main: "Bosh",
  content: "Kontent",
  revenue: "Monetizatsiya",
  ops: "Operatsiyalar",
};
