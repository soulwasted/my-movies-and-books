import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function getSessionUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

export async function requireUserId(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Unauthorized");
  await ensureUser(userId);
  return userId;
}

export async function ensureUser(clerkId: string) {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email =
    clerkUser.emailAddresses[0]?.emailAddress ?? `${clerkId}@users.clerk.dev`;
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;

  return prisma.user.upsert({
    where: { id: clerkId },
    create: {
      id: clerkId,
      email,
      name,
      image: clerkUser.imageUrl,
    },
    update: {
      email,
      name,
      image: clerkUser.imageUrl,
    },
  });
}
