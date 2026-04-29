import type { Metadata } from 'next';
import { Poppins, Roboto } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import ReactQueryProvider from '@/providers/react-query';
import { OAuthTokenSync } from '@/components/auth/oauth-token-sync';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Toaster } from 'sonner';

const poppins = Poppins({
  weight: ['200', '300', '400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
});

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['100', '300', '400', '500', '700', '900'],
  display: 'swap',
  variable: '--font-roboto',
});

export const metadata: Metadata = {
  title: 'Ligma',
  description: 'Ligma',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn('antialiased overflow-x-clip', poppins.className, roboto.variable)}>
        <ReactQueryProvider>
          <OAuthTokenSync />
          <Toaster richColors position="top-right" />
          <AuthGuard>{children}</AuthGuard>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
