"use client";

import { Activity, ClipboardList, Image as ImageIcon, LogOut, Menu, Settings, Users, Video, Wand2, X } from "lucide-react";

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
  { id: "assign", label: "שיוך ידני", icon: ClipboardList },
  { id: "manage_plans", label: "עריכת תוכניות", icon: Settings },
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
      <div className="md:hidden bg-[#161311] text-white p-4 flex justify-between items-center z-30 relative shadow-md border-b border-stone-800">
        <span className="text-xl font-black tracking-widest uppercase">
          Optimal<span className="text-teal-400">Motion</span>
        </span>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>}

      <aside
        className={`fixed md:static inset-y-0 w-72 bg-[#161311] text-stone-400 flex flex-col z-50 transition-all duration-300 ease-in-out border-l border-stone-800 ${
          isSidebarOpen ? "right-0" : "-right-80"
        } md:right-0`}
      >
        <div className="p-7 hidden md:block">
          <span className="text-lg font-black text-white tracking-wider uppercase">
            Optimal<span className="text-teal-400">Motion</span>
          </span>
          <div className="text-[10px] font-extrabold text-stone-500 tracking-widest uppercase mt-1">Practitioner Console</div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1 font-medium mt-4 md:mt-0">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = adminTab === id;
            const isVideoReviews = id === "video_reviews";
            const activeClasses = "bg-white/95 text-stone-950 font-extrabold";
            const inactiveClasses = isVideoReviews
              ? "bg-red-500/10 text-red-400 font-bold hover:bg-red-500/15"
              : "text-stone-400 hover:bg-white/5 hover:text-white";

            return (
              <button
                key={id}
                onClick={() => selectTab(id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all text-sm ${isActive ? activeClasses : inactiveClasses}`}
              >
                <Icon size={18} />
                {label}
                {isVideoReviews && !isActive && (
                  <span className="bg-red-500 text-white text-[10px] font-extrabold w-[18px] h-[18px] rounded-full flex items-center justify-center mr-auto">1</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-stone-800">
          <button onClick={onLogout} className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl hover:bg-white/5 text-stone-500 hover:text-white transition-all font-bold text-sm">
            <LogOut size={18} /> התנתק
          </button>
        </div>
      </aside>
    </>
  );
}
