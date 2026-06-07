import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
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
  let email = `${clerkId}@users.clerk.dev`;
  let name: string | null = null;
  let image: string | null = null;

  const clerkUser = await currentUser();
  if (clerkUser) {
    email =
      clerkUser.emailAddresses[0]?.emailAddress ?? email;
    name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      null;
    image = clerkUser.imageUrl;
  } else {
    try {
      const client = await clerkClient();
      const fetched = await client.users.getUser(clerkId);
      email = fetched.emailAddresses[0]?.emailAddress ?? email;
      name =
        [fetched.firstName, fetched.lastName].filter(Boolean).join(" ") || null;
      image = fetched.imageUrl;
    } catch {
      // Keep placeholder email — user row still required for FK relations.
    }
  }

  return prisma.user.upsert({
    where: { id: clerkId },
    create: { id: clerkId, email, name, image },
    update: { email, name, image },
  });
}
