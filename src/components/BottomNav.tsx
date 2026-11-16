import { Grid2X2, Home, Package, Search, User } from 'lucide-react';

export type AppTab = 'home' | 'categories' | 'search' | 'orders' | 'profile';

interface BottomNavProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  activeOrdersCount: number;
}

const TABS: { id: AppTab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'categories', label: 'Categories', icon: Grid2X2 },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'profile', label: 'Profile', icon: User },
];

export function BottomNav({
  activeTab,
  onSelectTab,
  activeOrdersCount,
}: BottomNavProps) {
  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 h-14 bg-[#FFFDF9]/95 backdrop-blur-md border-t border-[#E6DDD1] px-1 flex items-center justify-around shadow-[0_-4px_20px_rgba(59,35,20,0.06)]"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            aria-current={active ? 'page' : undefined}
            className={`relative flex-1 h-12 min-w-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors cursor-pointer ${
              active
                ? 'text-[#C45512]'
                : 'text-[#6D4C3D] hover:text-[#3B2314]'
            }`}
          >
            <span className="relative">
              <Icon className="w-5 h-5" strokeWidth={active ? 2.25 : 1.75} />
              {tab.id === 'orders' && activeOrdersCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-1 rounded-full bg-[#C45512] text-white text-[9px] font-mono-tabular font-semibold flex items-center justify-center">
                  {activeOrdersCount}
                </span>
              )}
            </span>
            <span className={`text-[10px] leading-none ${active ? 'font-semibold' : 'font-medium'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
