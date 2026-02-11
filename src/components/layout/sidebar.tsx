"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Settings,
  Database,
  Home,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/configs", label: "Bot Configs", icon: Bot },
  { href: "/service-configs", label: "Service Configs", icon: Settings },
  { href: "/datasets", label: "Datasets", icon: Database },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout, auth } = useAuth();

  const truncatedKey = auth.publicKey
    ? `${auth.publicKey.slice(0, 8)}...${auth.publicKey.slice(-6)}`
    : "";

  return (
    <aside className="w-64 border-r bg-card h-screen flex flex-col">
      <div className="p-4">
        <Link href="/" className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">Bot Configurator</span>
        </Link>
      </div>

      <Separator />

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
              {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      <Separator />

      <div className="p-4 space-y-2">
        {auth.publicKey && (
          <div className="text-xs text-muted-foreground font-mono">
            {truncatedKey}
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={logout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
