"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Shield } from "lucide-react";
import { useEffect } from "react";
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
import { loginWithEmail } from "@/features/auth/auth.api";
import { useAuth } from "@/stores/auth.store";
import { apiErrorMessage } from "@/lib/api";

const schema = z.object({
  email: z.string().email("Yaroqli email kiriting"),
  password: z.string().min(6, "Parol kamida 6 ta belgi"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuth((s) => s.setAuth);
  const user = useAuth((s) => s.user);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: loginWithEmail,
    onSuccess: (data) => {
      if (data.user.role?.name && data.user.role.name !== "ADMIN") {
        toast.error("Kirish rad etildi: admin roli kerak");
        return;
      }
      setAuth(data.user, data.accessToken, data.refreshToken);
      toast.success(`Xush kelibsiz, ${data.user.firstName ?? data.user.email}`);
      router.replace("/dashboard");
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Card className="w-full max-w-md border-[var(--border)] shadow-xl backdrop-blur-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
          <Shield className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl">Admin kirish</CardTitle>
        <CardDescription>Football Coach boshqaruv paneli</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@football-coach.uz"
              autoComplete="email"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-[var(--destructive)]">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Parol</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-xs text-[var(--destructive)]">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={mutation.isPending}
            className="mt-2 w-full"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Kirish
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
          Faqat adminlar uchun. Seed ma&apos;lumotlari: <br />
          <span className="font-mono">admin@football-coach.uz / Admin123!</span>
        </p>
      </CardContent>
    </Card>
  );
}
