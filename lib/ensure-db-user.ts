import { clerkClient } from "@clerk/nextjs/server"

import { prisma } from "@/lib/prisma"

export async function ensureDbUser(clerkUserId: string) {
  const existingUser = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
  })

  if (existingUser) {
    return existingUser
  }

  const client = await clerkClient()
  const clerkUser = await client.users.getUser(clerkUserId)
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress

  if (!email) {
    throw new Error("Authenticated user does not have an email address")
  }

  return prisma.user.create({
    data: {
      clerkId: clerkUser.id,
      email,
      name:
        clerkUser.fullName ||
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() ||
        clerkUser.username ||
        email,
      image: clerkUser.imageUrl ?? null,
    },
  })
}

