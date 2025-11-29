import { useState, useEffect } from "react";
import { 
  Home, 
  Music, 
  BarChart3, 
  DollarSign, 
  Settings as SettingsIcon, 
  Users, 
  Shield,
  Upload,
  HelpCircle
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    setIsAdmin(data?.role === 'admin');
  };

  const mainItems = [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Releases", url: "/releases", icon: Music },
    { title: "New Release", url: "/release-form", icon: Upload },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
    { title: "Earnings", url: "/earnings", icon: DollarSign },
  ];

  const supportItems = [
    { title: "Team", url: "/team", icon: Users },
    { title: "Settings", url: "/settings", icon: SettingsIcon },
    { title: "Help Center", url: "/help", icon: HelpCircle },
  ];

  const adminItems = isAdmin ? [
    { title: "Admin Panel", url: "/admin", icon: Shield },
  ] : [];

  const allItems = [...mainItems, ...supportItems, ...adminItems];
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');
  const hasActiveMain = mainItems.some((i) => isActive(i.url));
  const hasActiveSupport = supportItems.some((i) => isActive(i.url));
  const hasActiveAdmin = adminItems.some((i) => isActive(i.url));

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/dashboard"}
                      className="hover:bg-muted/50" 
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Support */}
        <SidebarGroup>
          <SidebarGroupLabel>Support</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {supportItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className="hover:bg-muted/50" 
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className="hover:bg-destructive/10" 
                        activeClassName="bg-destructive/20 text-destructive font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
