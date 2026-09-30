"use client";

import { Activity, BookOpen, Image as ImageIcon, Library, LogOut, Menu, Settings, Timer, Users, Video, Wand2, X } from "lucide-react";

interface AdminSidebarProps {
  adminTab: string;
  setAdminTab: (tab: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  onLogout: () => void;
}

const NAV_ITEMS: { id: string; label: string; icon: typeof Activity }[] = [
  { id: "dashboard", label: "מעקב קליני", icon: Activity },
  { id: "video_reviews", label: "ביקורת וידאו", icon: Video },
  { id: "crm", label: "ניהול תיקים (CRM)", icon: Users },
  { id: "exercises", label: "ספריית תרגילים", icon: ImageIcon },
  { id: "builder", label: "בונה חכם & פרוטוקולים", icon: Wand2 },
  { id: "program_library", label: "ספריית תוכניות", icon: Library },
  { id: "workout_builder", label: "יצירת אימונים", icon: Timer },
  { id: "manage_plans", label: "עריכת תוכניות", icon: Settings },
  { id: "research", label: "מחקר ועדכוני הידעת", icon: BookOpen },
];

// The dark practitioner-console sidebar shared across every admin tab (see
// Ground Rule #5 in UI-IMPLEMENTATION-BRIEF.md — the admin console is being
// deliberately reskinned from light "ClinicPro" to the same dark-premium
// language as the patient app, "Optimal Motion" instead). video_reviews gets
// a persistent red "attention" tint even when it isn't the active tab
// (matching both admin mockups, which show it red while a different tab is
// active) — every other item is plain until active, then gets the solid
// white pill.
export default function AdminSidebar({ adminTab, setAdminTab, isSidebarOpen, setIsSidebarOpen, onLogout }: AdminSidebarProps) {
  const selectTab = (tab: string) => {
    setAdminTab(tab);
    setIsSidebarOpen(false);
  };

  return (
    <>
      <div className="md:hidden bg-elevated text-fg p-4 flex justify-between items-center z-30 relative shadow-md border-b border-line">
        <span className="text-xl font-black tracking-widest uppercase">
          Optimal<span className="text-accent-fg">Motion</span>
        </span>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-fg/10 rounded-lg hover:bg-fg/20 transition-colors">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isSidebarOpen && <div className="fixed inset-0 bg-backdrop z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>}

      <aside
        className={`fixed md:static inset-y-0 w-72 bg-elevated text-muted flex flex-col z-50 transition-all duration-300 ease-in-out border-l border-line ${
          isSidebarOpen ? "right-0" : "-right-80"
        } md:right-0`}
      >
        <div className="p-7 hidden md:block">
          <span className="text-lg font-black text-fg tracking-wider uppercase">
            Optimal<span className="text-accent-fg">Motion</span>
          </span>
          <div className="text-[10px] font-extrabold text-muted tracking-widest uppercase mt-1">Practitioner Console</div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1 font-medium mt-4 md:mt-0">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = adminTab === id;
            const isVideoReviews = id === "video_reviews";
            const activeClasses = "bg-accent text-on-accent font-extrabold";
            const inactiveClasses = isVideoReviews
              ? "bg-warning/10 text-warning font-bold hover:bg-warning/15"
              : "text-muted hover:bg-fg/5 hover:text-fg";

            return (
              <button
                key={id}
                onClick={() => selectTab(id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all text-sm ${isActive ? activeClasses : inactiveClasses}`}
              >
                <Icon size={18} />
                {label}
                {isVideoReviews && !isActive && (
                  // Was a hardcoded "1" badge with no real count behind it (video-review
                  // queue is still a UI mockup, per UX audit finding #8, 2026-09-03) — a
                  // plain dot keeps the attention cue honest without claiming a specific
                  // number. Swap for a real unread-count badge once the tab has live data.
                  <span className="w-2 h-2 rounded-full bg-warning mr-auto" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-line">
          <button onClick={onLogout} className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl hover:bg-fg/5 text-muted hover:text-fg transition-all font-bold text-sm">
            <LogOut size={18} /> התנתק
          </button>
        </div>
      </aside>
    </>
  );
}
