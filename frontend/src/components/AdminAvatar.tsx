import React from 'react';
import { useAdmin } from '../context/AdminContext';

interface AdminAvatarProps {
  /** Tailwind size classes, e.g. "w-9 h-9" */
  sizeClass?: string;
  className?: string;
}

/**
 * Round profile badge shown in the top-right corner on every page while the
 * administrator is signed in (map / stats / help / panorama viewer).
 * Renders nothing for regular visitors.
 */
export const AdminAvatar: React.FC<AdminAvatarProps> = ({ sizeClass = 'w-9 h-9', className = '' }) => {
  const { isAdmin, adminUser, setShowAdminModal } = useAdmin();
  if (!isAdmin) return null;

  const initials = adminUser?.initials || 'M.T.';

  return (
    <button
      type="button"
      onClick={() => setShowAdminModal(true)}
      className={`relative shrink-0 ${sizeClass} rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 p-[2px] shadow-lg shadow-rose-950/60 hover:scale-105 active:scale-95 transition-transform cursor-pointer ${className}`}
      title={`Admin Console (${adminUser?.email || initials})`}
      aria-label="Admin profile"
    >
      <span className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center overflow-hidden text-[10px] font-black tracking-tight text-rose-200">
        {adminUser?.picture ? (
          <img
            src={adminUser.picture}
            alt={initials}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{initials.replace(/\./g, '')}</span>
        )}
      </span>
      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-zinc-950 animate-pulse" />
    </button>
  );
};
