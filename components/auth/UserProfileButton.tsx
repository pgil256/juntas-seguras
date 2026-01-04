'use client';

import { useSession, signOut } from 'next-auth/react';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { useRouter } from 'next/navigation';

export function UserProfileButton() {
  const { data: session } = useSession();
  const router = useRouter();
  
  if (!session) {
    return (
      <Button 
        variant="outline" 
        onClick={() => router.push('/auth/signin')}
      >
        Sign In
      </Button>
    );
  }
  
  const user = session.user;
  // Get first character of name, or first letter of email
  const initials = user?.name 
    ? user.name.charAt(0).toUpperCase() 
    : user?.email?.charAt(0).toUpperCase() || 'U';
    
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 sm:h-8 sm:w-8 rounded-full p-0 hover:ring-2 hover:ring-blue-100 transition-all">
          <Avatar className="h-10 w-10 sm:h-8 sm:w-8">
            <AvatarImage src={user?.image || undefined} alt={user?.name || 'User'} />
            <AvatarFallback className="text-sm">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount sideOffset={8}>
        <DropdownMenuLabel className="font-normal px-3 py-2">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => router.push('/profile')}
          className="py-2.5 cursor-pointer"
        >
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => router.push('/settings')}
          className="py-2.5 cursor-pointer"
        >
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-600 py-2.5 cursor-pointer focus:text-red-600 focus:bg-red-50"
          onSelect={() => signOut({ redirect: true, callbackUrl: '/auth/signin' })}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}