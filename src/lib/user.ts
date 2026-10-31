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

/** Uživatelé, o kterých víme, že už mají řádek v DB (per instance serveru). */
const knownUsers = new Set<string>();

/**
 * Zajistí řádek uživatele pro FK vazby. Rychlá cesta: jednou ověřit v DB a pak
 * už nic. Clerk API se volá jen při prvním vytvoření, ne při každém requestu.
 */
export async function ensureUser(clerkId: string) {
  if (knownUsers.has(clerkId)) return;

  const existing = await prisma.user.findUnique({
    where: { id: clerkId },
    select: { id: true },
  });
  if (existing) {
    knownUsers.add(clerkId);
    return;
  }

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

  await prisma.user.upsert({
    where: { id: clerkId },
    create: { id: clerkId, email, name, image },
    update: { email, name, image },
  });
  knownUsers.add(clerkId);
}
