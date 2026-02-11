"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User } from "lucide-react";

interface HeaderProps {
  title?: string;
  children?: React.ReactNode;
}

export function Header({ title, children }: HeaderProps) {
  const { auth, logout } = useAuth();

  const initials = auth.publicKey
    ? auth.publicKey.slice(0, 2).toUpperCase()
    : "??";

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        {title && <h1 className="text-xl font-semibold">{title}</h1>}
        {children}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled>
            <User className="mr-2 h-4 w-4" />
            <span className="font-mono text-xs">
              {auth.publicKey?.slice(0, 16)}...
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
