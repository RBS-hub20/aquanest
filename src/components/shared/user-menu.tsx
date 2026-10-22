"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/ui/avatar";
import { logoutAction } from "@/app/(auth)/login/actions";
import { displayPhone } from "@/lib/utils";

export function UserMenu({ name, phone, avatarUrl, profileHref, roleLabel }: { name: string; phone: string; avatarUrl?: string | null; profileHref?: string; roleLabel?: string }) {
  const t = useTranslations("common");
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-2xl bg-white py-1.5 pl-1.5 pr-3 ring-1 ring-slate-100 transition hover:ring-sky-200 focus:outline-none">
        <UserAvatar src={avatarUrl} name={name} className="h-8 w-8" />
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-semibold leading-tight">{name}</span>
          {roleLabel && <span className="block text-[11px] leading-tight text-navy-400">{roleLabel}</span>}
        </span>
        <ChevronDown className="h-4 w-4 text-navy-400" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <p className="text-sm font-bold text-navy">{name}</p>
          <p className="font-normal">{displayPhone(phone)}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {profileHref && (
          <DropdownMenuItem asChild>
            <Link href={profileHref}>
              <User /> Profile
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="text-rose-600 focus:bg-rose-50 focus:text-rose-600"
          onSelect={async () => {
            const r = await logoutAction();
            router.replace(r.redirect);
            router.refresh();
          }}
        >
          <LogOut /> {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
