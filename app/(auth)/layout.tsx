import { Logo } from '@/components/ui';
import { tenant } from '@/lib/config/tenant';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-brand-black flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-center py-8">
        <Logo size="lg" />
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} {tenant.copyright}. All rights reserved.
      </footer>
    </div>
  );
}
