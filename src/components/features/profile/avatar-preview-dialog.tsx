'use client';

import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface AvatarPreviewDialogProps {
  avatarUrl?: string;
  username: string;
  displayName?: string;
  isCurrentUser: boolean;
  children: React.ReactNode;
}

export function AvatarPreviewDialog({
  avatarUrl,
  username,
  displayName,
  isCurrentUser,
  children,
}: AvatarPreviewDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="pr-8">{displayName || username}</DialogTitle>
          <DialogDescription>@{username}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center py-2">
          <Avatar className="w-52 h-52 sm:w-64 sm:h-64 md:w-72 md:h-72 border-2 border-border/20">
            <AvatarImage src={avatarUrl} alt={`@${username}`} />
            <AvatarFallback className="bg-muted text-muted-foreground text-5xl sm:text-6xl">
              {username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {isCurrentUser && (
          <Button asChild variant="outline" className="rounded-xl gap-2">
            <Link href={`/profile/${username}/edit`}>
              <Pencil className="w-4 h-4" />
              <span>Edit profile picture</span>
            </Link>
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
