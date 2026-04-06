import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { BookOpen, ClipboardList, FileText, GraduationCap, LayoutDashboard, Users } from 'lucide-react';

/**
 * Liens principaux disponibles dans la navigation laterale.
 */
const navItems = [
  { title: 'Tableau de bord', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Eleves', url: '/students', icon: Users },
  { title: 'Matieres', url: '/subjects', icon: BookOpen },
  { title: 'Notes', url: '/grades', icon: ClipboardList },
  { title: 'Bulletins', url: '/reports', icon: FileText },
];

/**
 * Sidebar principale de l'application.
 * Sur mobile, elle se ferme automatiquement apres chaque changement de page.
 */
export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();

  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, location.pathname, setOpenMobile]);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="flex items-center gap-3 px-4 py-5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && <span className="text-sm font-bold text-foreground">Smart Grade</span>}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/dashboard'}
                      className="hover:bg-accent/50"
                      activeClassName="bg-accent font-medium text-primary"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
