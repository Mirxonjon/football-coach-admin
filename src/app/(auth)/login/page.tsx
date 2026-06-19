"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Shield } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { loginAdmin, loginWithGoogle } from "@/features/auth/auth.api";
import { useAuth } from "@/stores/auth.store";
import { apiErrorCode, apiErrorMessage } from "@/lib/api";
import { GoogleSignInButton } from "@/components/google-signin-button";
import type { AuthPayload } from "@/lib/api-types";
import { useT } from "@/lib/i18n";

const PHONE_RE = /^\+?\d{9,15}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const schema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Telefon yoki email kiriting")
    .refine(
      (v) => (v.includes("@") ? EMAIL_RE.test(v) : PHONE_RE.test(v)),
      "Yaroqli telefon (+998...) yoki email kiriting"
    ),
  password: z.string().min(6, "Parol kamida 6 ta belgi"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuth((s) => s.setAuth);
  const user = useAuth((s) => s.user);
  const { t } = useT();

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "" },
  });

  const handleAuthSuccess = useCallback(
    (data: AuthPayload) => {
      if (data.user.role?.name && data.user.role.name !== "ADMIN") {
        toast.error(t("Kirish rad etildi: admin roli kerak"));
        return;
      }
      setAuth(
        data.user,
        data.accessToken,
        data.refreshToken,
        data.expiresIn
      );
      toast.success(
        `${t("Xush kelibsiz")}, ${
          data.user.firstName ?? data.user.phone ?? data.user.email ?? ""
        }`
      );
      router.replace("/dashboard");
    },
    [setAuth, router, t]
  );

  const translateAuthError = useCallback(
    (e: unknown): string => {
      const code = apiErrorCode(e);
      switch (code) {
        case "INVALID_GOOGLE_TOKEN":
          return t("Google tokeni yaroqsiz yoki muddati tugagan. Qayta urinib ko'ring.");
        case "NOT_ADMIN":
          return t("Bu akkauntda admin huquqi yo'q.");
        case "ADMIN_NOT_FOUND":
          return t("Bu Google akkaunt admin sifatida ro'yxatdan o'tmagan.");
        case "ACCOUNT_DEACTIVATED":
          return t("Akkaunt faolsizlantirilgan. Administrator bilan bog'laning.");
        case "VALIDATION_ERROR":
          return t("Kiritilgan ma'lumot noto'g'ri.");
        case "INVALID_CREDENTIALS":
          return t("Telefon/email yoki parol noto'g'ri.");
        default:
          return apiErrorMessage(e);
      }
    },
    [t]
  );

  const mutation = useMutation({
    mutationFn: loginAdmin,
    onSuccess: handleAuthSuccess,
    onError: (e) => toast.error(translateAuthError(e)),
  });

  const googleMutation = useMutation({
    mutationFn: loginWithGoogle,
    onSuccess: handleAuthSuccess,
    onError: (e) => {
      toast.error(translateAuthError(e));
      // Stop One Tap from auto-signing the same failing account on next render.
      if (typeof window !== "undefined") {
        try {
          window.google?.accounts.id.disableAutoSelect();
        } catch {
          /* ignore */
        }
      }
    },
  });

  const anyPending = mutation.isPending || googleMutation.isPending;

  // Stable ref so `<GoogleSignInButton>`'s init effect doesn't re-run on every
  // render (avoids "google.accounts.id.initialize() called multiple times").
  const googleMutateRef = useRef(googleMutation.mutate);
  useEffect(() => {
    googleMutateRef.current = googleMutation.mutate;
  }, [googleMutation.mutate]);
  const handleGoogleCredential = useCallback(
    (idToken: string) => googleMutateRef.current(idToken),
    []
  );

  return (
    <Card className="w-full max-w-md border-[var(--border)] shadow-xl backdrop-blur-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
          <Shield className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl">{t("Admin kirish")}</CardTitle>
        <CardDescription>{t("Football Coach boshqaruv paneli")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-2">
          <GoogleSignInButton
            disabled={anyPending}
            autoSelect={false}
            onCredential={handleGoogleCredential}
          />
          {googleMutation.isPending && (
            <p className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t("Google orqali kirilmoqda...")}
            </p>
          )}
        </div>

        <div className="my-6 flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
          <span className="h-px flex-1 bg-[var(--border)]" />
          {t("yoki telefon / email bilan")}
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="identifier">{t("Telefon yoki email")}</Label>
            <Input
              id="identifier"
              type="text"
              placeholder="+998900000000"
              autoComplete="username"
              {...form.register("identifier")}
            />
            {form.formState.errors.identifier && (
              <p className="text-xs text-[var(--destructive)]">
                {t(form.formState.errors.identifier.message ?? "")}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">{t("Parol")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-xs text-[var(--destructive)]">
                {t(form.formState.errors.password.message ?? "")}
              </p>
            )}
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={anyPending}
            className="mt-2 w-full"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Kirish")}
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
          {t("Faqat adminlar uchun. Seed ma'lumotlari:")} <br />
          <span className="font-mono">
            +998900000000 yoki admin@football-coach.uz / Admin123!
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
