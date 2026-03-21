import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useGlobal } from '@/context/GlobalContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function Navbar() {
  const { profile, signOut } = useGlobal();

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{profile?.full_name || profile?.email}</span>
        <Button variant="ghost" size="icon" onClick={signOut} title="Déconnexion">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
