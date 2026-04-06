import React from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useGlobal } from '@/context/GlobalContext';

/**
 * Barre haute partagee sur les pages protegees.
 * Le nom du profil est tronque sur mobile pour eviter les debordements.
 */
export function Navbar() {
  const { profile, signOut } = useGlobal();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-3 sm:px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
      </div>

      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <span className="max-w-[9rem] truncate text-xs text-muted-foreground sm:max-w-[16rem] sm:text-sm">
          {profile?.full_name || profile?.email}
        </span>
        <Button variant="ghost" size="icon" onClick={signOut} title="Deconnexion">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
