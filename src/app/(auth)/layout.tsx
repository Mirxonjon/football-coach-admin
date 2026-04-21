export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh w-full">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,var(--accent)_0%,transparent_40%),radial-gradient(circle_at_80%_70%,var(--primary)_0%,transparent_50%)] opacity-30" />
      <div className="flex min-h-dvh items-center justify-center px-4 py-8">
        {children}
      </div>
    </div>
  );
}
