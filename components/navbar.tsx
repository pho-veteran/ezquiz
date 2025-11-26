"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SignOutButton, useUser } from "@clerk/nextjs"

export default function Navbar() {
    const { user, isLoaded } = useUser()

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6 shadow-sm">
            <Link href="/" className="flex items-center gap-2 font-semibold">
                <span className="text-xl font-bold text-primary">EQuiz</span>
            </Link>
            <div className="ml-auto flex items-center gap-4">
                {isLoaded && user ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={user.imageUrl} alt={user.firstName || ""} />
                                    <AvatarFallback>
                                        {user.firstName?.charAt(0) || user.emailAddresses[0]?.emailAddress.charAt(0) || "U"}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">
                                        {user.firstName} {user.lastName}
                                    </p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        {user.emailAddresses[0]?.emailAddress}
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <SignOutButton>
                                    <button className="w-full text-left cursor-pointer">Đăng xuất</button>
                                </SignOutButton>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <Link href="/sign-in">
                        <Button variant="ghost">Đăng nhập</Button>
                    </Link>
                )}
            </div>
        </header>
    )
}
