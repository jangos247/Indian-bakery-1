import { User } from 'firebase/auth';
import { MapPin, ShoppingBag } from 'lucide-react';
import { BAKERY_LOGO_URL } from '../data/bakeryData';
import { AppTab } from './BottomNav';

interface HeaderProps {
  bakeryName: string;
  neighborhood: string;
  bagCount: number;
  activeTab: AppTab;
  user: User | null;
  isOwner: boolean;
  onSelectTab: (tab: AppTab) => void;
  onOpenBag: () => void;
  onOpenOwnerStudio: () => void;
}

const DESKTOP_NAV: { id: AppTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'categories', label: 'Categories' },
  { id: 'search', label: 'Search' },
  { id: 'orders', label: 'Orders' },
  { id: 'profile', label: 'Profile' },
];

export function Header({
  bakeryName,
  neighborhood,
  bagCount,
  activeTab,
  user,
  isOwner,
  onSelectTab,
  onOpenBag,
  onOpenOwnerStudio,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-[#FAF5EE]/95 backdrop-blur-md border-b border-[#E6DDD1]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-13 md:h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand mark & wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C45512]"
        >
          <img
            src={BAKERY_LOGO_URL}
            alt="IBC Indian Bakery and Cafe logo"
            className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover shrink-0 border border-[#D6C9B8]"
          />
          <span className="leading-tight">
            <span className="block font-display text-base md:text-lg font-semibold tracking-tight text-[#3B2314]">
              {bakeryName}
            </span>
            <span className="md:hidden flex items-center gap-1 text-[10px] text-[#6D4C3D] font-medium max-w-[165px] truncate">
              <MapPin className="w-2.5 h-2.5 text-[#C45512] shrink-0" />
              <span className="truncate">{neighborhood}</span>
            </span>
          </span>
        </button>

        {/* Zone 2: 5 concise single-line nav links matching mobile bottom tabs */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-[#6D4C3D]"
        >
          {DESKTOP_NAV.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'text-[#C45512] font-semibold underline underline-offset-8 decoration-2'
                    : 'hover:text-[#3B2314]'
                }`}
              >
                {item.id === 'profile' && user
                  ? user.displayName?.split(' ')[0] || 'Profile'
                  : item.label}
              </button>
            );
          })}
          {isOwner && (
            <button
              type="button"
              onClick={onOpenOwnerStudio}
              className="text-xs font-semibold text-[#C45512] hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Owner Studio
            </button>
          )}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenBag}
            aria-label={`Open shopping bag with ${bagCount} items`}
            className="inline-flex items-center gap-2 px-3.5 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium text-white bg-[#C45512] hover:bg-[#A9450C] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C45512] shadow-xs"
          >
            <ShoppingBag className="w-4 h-4" strokeWidth={1.75} />
            <span>Cart</span>
            <span className="font-mono-tabular text-xs opacity-95">({bagCount})</span>
          </button>
        </div>
      </div>
    </header>
  );
}
