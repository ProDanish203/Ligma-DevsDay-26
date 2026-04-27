export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#FFF5F8]">
      {/* Soft ambient blobs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-160 w-160 rounded-full bg-brand-primary opacity-8 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-140 w-140 rounded-full bg-brand-secondary opacity-30 blur-[120px]" />

      <div className="relative z-10 w-full max-w-110 px-4 py-16">{children}</div>
    </div>
  );
}
