import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging, type Message } from "firebase-admin/messaging";
import { logger } from "firebase-functions";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

initializeApp();

interface GroceryDocument {
  name?: unknown;
  quantity?: unknown;
  unit?: unknown;
  addedBy?: unknown;
  notifyHousehold?: unknown;
}

interface RecipientToken {
  token: string;
  path: string;
}

function groceryDescription(item: GroceryDocument): string {
  const name = typeof item.name === "string" ? item.name : "Een boodschap";
  const amount = [item.quantity, item.unit]
    .filter(
      (value): value is string =>
        typeof value === "string" && Boolean(value.trim()),
    )
    .join(" ");
  return `${amount ? `${amount} ` : ""}${name} is op de lijst gezet.`;
}

export const notifyGroceryAdded = onDocumentCreated(
  {
    document: "households/{householdId}/groceryItems/{itemId}",
    region: "europe-west1",
    retry: false,
  },
  async (event) => {
    const item = event.data?.data() as GroceryDocument | undefined;
    if (!item || item.notifyHousehold !== true) return;

    const householdId = event.params.householdId;
    const senderId = typeof item.addedBy === "string" ? item.addedBy : "";
    const firestore = getFirestore();
    const members = await firestore
      .collection("households")
      .doc(householdId)
      .collection("members")
      .get();

    const tokenGroups = await Promise.all(
      members.docs
        .filter((member) => member.id !== senderId)
        .map(async (member) => {
          const snapshot = await firestore
            .collection("users")
            .doc(member.id)
            .collection("pushTokens")
            .get();
          return snapshot.docs.flatMap<RecipientToken>((tokenDocument) => {
            const token = tokenDocument.get("token");
            return typeof token === "string" && token
              ? [{ token, path: tokenDocument.ref.path }]
              : [];
          });
        }),
    );
    const recipients = tokenGroups.flat().slice(0, 500);
    if (recipients.length === 0) {
      logger.info("Geen pushontvangers voor nieuwe boodschap", { householdId });
      return;
    }

    const messages: Message[] = recipients.map(({ token }) => ({
      token,
      notification: {
        title: "Nieuwe boodschap in TaskHive",
        body: groceryDescription(item),
      },
      data: {
        householdId,
        url: "/groceries",
      },
      webpush: {
        notification: {
          icon: "https://taskhive.nl/icons/icon.svg",
          badge: "https://taskhive.nl/icons/icon.svg",
        },
        fcmOptions: {
          link: "https://taskhive.nl/groceries",
        },
      },
    }));

    const response = await getMessaging().sendEach(messages);
    const invalidPaths = response.responses.flatMap((result, index) => {
      const code = result.error?.code;
      return code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token"
        ? [recipients[index].path]
        : [];
    });
    if (invalidPaths.length > 0) {
      const batch = firestore.batch();
      invalidPaths.forEach((path) => batch.delete(firestore.doc(path)));
      await batch.commit();
    }

    logger.info("Boodschappenpush verwerkt", {
      householdId,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  },
);
