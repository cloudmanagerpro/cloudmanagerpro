import { CommandPaletteProvider } from "@/components/command/command-palette";
import { AuthGuard } from "@/components/layout/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <CommandPaletteProvider>
        <div className="min-h-screen bg-background">
          <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border/60 bg-card/30 lg:block">
            <Sidebar />
          </aside>
          <div className="flex min-h-screen flex-col lg:pl-64">
            <Topbar />
            <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
              <div className="mx-auto w-full max-w-7xl animate-in-up">
                {children}
              </div>
            </main>
          </div>
        </div>
      </CommandPaletteProvider>
    </AuthGuard>
  );
}
