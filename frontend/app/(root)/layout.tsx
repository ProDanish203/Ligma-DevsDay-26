import { Sidebar } from '@/components/shell/sidebar';
import { Topnav } from '@/components/shell/topnav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-900">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topnav />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
