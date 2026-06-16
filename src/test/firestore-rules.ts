import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const projectId = "taskhive-rules-test";
const householdId = "family-house";
const otherHouseholdId = "other-house";

const adminUid = "admin-user";
const partnerUid = "partner-user";
const viewerUid = "viewer-user";
const outsiderUid = "outsider-user";
const invitedUid = "invited-user";
const wrongInviteeUid = "wrong-invitee";

const adminEmail = "admin@example.com";
const partnerEmail = "partner@example.com";
const viewerEmail = "viewer@example.com";
const outsiderEmail = "outsider@example.com";
const invitedEmail = "new-partner@example.com";
const wrongEmail = "wrong@example.com";

let testEnv: RulesTestEnvironment;

function authedDb(uid: string, email: string) {
  return testEnv.authenticatedContext(uid, { email }).firestore();
}

function anonDb() {
  return testEnv.unauthenticatedContext().firestore();
}

function householdPath(id = householdId) {
  return `households/${id}`;
}

function memberPath(uid: string, id = householdId) {
  return `${householdPath(id)}/members/${uid}`;
}

function taskPath(id: string, household = householdId) {
  return `${householdPath(household)}/tasks/${id}`;
}

function groceryPath(id: string, household = householdId) {
  return `${householdPath(household)}/groceryItems/${id}`;
}

function agendaPath(id: string, household = householdId) {
  return `${householdPath(household)}/agendaItems/${id}`;
}

function invitePath(id: string, household = householdId) {
  return `${householdPath(household)}/invites/${id}`;
}

function memberDoc(uid: string, email: string, role: string) {
  return {
    householdId,
    userId: uid,
    email,
    displayName: email.split("@")[0],
    role,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function taskDoc(id: string, visibleToViewers: boolean, createdBy = adminUid) {
  return {
    householdId,
    title: id,
    category: "huishouden",
    status: "open",
    visibleToViewers,
    createdBy,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function groceryDoc(id: string, addedBy = adminUid) {
  return {
    householdId,
    name: id,
    status: "needed",
    boughtColorState: "needed",
    addedBy,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function agendaDoc(id: string, isPrivate: boolean, createdBy = adminUid) {
  return {
    householdId,
    title: id,
    startDateTime: "2026-01-01T10:00:00.000Z",
    allDay: false,
    private: isPrivate,
    visibleToViewers: !isPrivate,
    source: "manual",
    createdBy,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

async function seedHouseholds() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, householdPath()), {
      name: "Gezin",
      createdBy: adminUid,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    await setDoc(doc(db, householdPath(otherHouseholdId)), {
      name: "Ander huis",
      createdBy: "other-admin",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    await setDoc(doc(db, memberPath(adminUid)), {
      ...memberDoc(adminUid, adminEmail, "admin"),
    });
    await setDoc(doc(db, memberPath(partnerUid)), {
      ...memberDoc(partnerUid, partnerEmail, "partner"),
    });
    await setDoc(doc(db, memberPath(viewerUid)), {
      ...memberDoc(viewerUid, viewerEmail, "viewer"),
    });
    await setDoc(
      doc(db, `${householdPath(otherHouseholdId)}/members/other-admin`),
      {
        householdId: otherHouseholdId,
        userId: "other-admin",
        email: "other-admin@example.com",
        displayName: "other-admin",
        role: "admin",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    );
    await setDoc(
      doc(db, taskPath("visible-task")),
      taskDoc("visible-task", true),
    );
    await setDoc(
      doc(db, taskPath("hidden-task")),
      taskDoc("hidden-task", false),
    );
    await setDoc(doc(db, groceryPath("milk")), groceryDoc("milk"));
    await setDoc(
      doc(db, agendaPath("public-agenda")),
      agendaDoc("public-agenda", false),
    );
    await setDoc(
      doc(db, agendaPath("private-agenda")),
      agendaDoc("private-agenda", true),
    );
    await setDoc(doc(db, invitePath("invite-partner")), {
      householdId,
      email: invitedEmail,
      role: "partner",
      status: "pending",
      createdBy: adminUid,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedHouseholds();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("Firestore security rules", () => {
  it("laat een nieuwe eigenaar een huishouden met eigen admin-lidmaatschap maken", async () => {
    const db = authedDb("new-owner", "owner@example.com");
    const batch = writeBatch(db);
    const householdRef = doc(db, householdPath("new-house"));
    batch.set(householdRef, {
      name: "Nieuw huis",
      createdBy: "new-owner",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    batch.set(doc(householdRef, "members", "new-owner"), {
      householdId: "new-house",
      userId: "new-owner",
      email: "owner@example.com",
      displayName: "owner",
      role: "admin",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    await assertSucceeds(batch.commit());
  });

  it("blokkeert anonieme gebruikers en niet-leden", async () => {
    await assertFails(getDoc(doc(anonDb(), householdPath())));

    const outsider = authedDb(outsiderUid, outsiderEmail);
    await assertFails(getDoc(doc(outsider, householdPath())));
    await assertFails(
      setDoc(doc(outsider, taskPath("outsider-task")), {
        ...taskDoc("outsider-task", true, outsiderUid),
        createdBy: outsiderUid,
      }),
    );
  });

  it("laat bewerkers schrijven en blokkeert viewers op writes", async () => {
    const partner = authedDb(partnerUid, partnerEmail);
    const viewer = authedDb(viewerUid, viewerEmail);

    await assertSucceeds(
      setDoc(doc(partner, taskPath("partner-task")), {
        ...taskDoc("partner-task", true, partnerUid),
        createdBy: partnerUid,
      }),
    );
    await assertSucceeds(
      updateDoc(doc(partner, taskPath("visible-task")), { status: "done" }),
    );
    await assertFails(
      updateDoc(doc(viewer, taskPath("visible-task")), { status: "done" }),
    );
    await assertFails(
      setDoc(doc(viewer, taskPath("viewer-task")), {
        ...taskDoc("viewer-task", true, viewerUid),
        createdBy: viewerUid,
      }),
    );
  });

  it("beperkt viewer-toegang tot zichtbare taken en verplichte queryfilters", async () => {
    const viewer = authedDb(viewerUid, viewerEmail);

    await assertSucceeds(getDoc(doc(viewer, taskPath("visible-task"))));
    await assertFails(getDoc(doc(viewer, taskPath("hidden-task"))));
    await assertSucceeds(
      getDocs(
        query(
          collection(viewer, `${householdPath()}/tasks`),
          where("visibleToViewers", "==", true),
        ),
      ),
    );
    await assertFails(getDocs(collection(viewer, `${householdPath()}/tasks`)));
  });

  it("verbergt prive-agenda volledig voor viewers", async () => {
    const viewer = authedDb(viewerUid, viewerEmail);
    const partner = authedDb(partnerUid, partnerEmail);

    await assertSucceeds(getDoc(doc(viewer, agendaPath("public-agenda"))));
    await assertFails(getDoc(doc(viewer, agendaPath("private-agenda"))));
    await assertSucceeds(getDoc(doc(partner, agendaPath("private-agenda"))));
    await assertSucceeds(
      getDocs(
        query(
          collection(viewer, `${householdPath()}/agendaItems`),
          where("private", "==", false),
        ),
      ),
    );
    await assertFails(
      getDocs(collection(viewer, `${householdPath()}/agendaItems`)),
    );
  });

  it("laat viewers boodschappen lezen maar niet aanpassen", async () => {
    const viewer = authedDb(viewerUid, viewerEmail);

    await assertSucceeds(getDoc(doc(viewer, groceryPath("milk"))));
    await assertFails(
      updateDoc(doc(viewer, groceryPath("milk")), { status: "bought" }),
    );
    await assertFails(
      setDoc(doc(viewer, groceryPath("viewer-added")), {
        ...groceryDoc("viewer-added", viewerUid),
        addedBy: viewerUid,
      }),
    );
  });

  it("beperkt ledenbeheer en collectie-groep queries", async () => {
    const admin = authedDb(adminUid, adminEmail);
    const partner = authedDb(partnerUid, partnerEmail);
    const viewer = authedDb(viewerUid, viewerEmail);

    await assertSucceeds(getDoc(doc(admin, memberPath(partnerUid))));
    await assertFails(deleteDoc(doc(partner, memberPath(viewerUid))));
    await assertFails(deleteDoc(doc(admin, memberPath(adminUid))));
    await assertSucceeds(
      getDocs(
        query(
          collectionGroup(viewer, "members"),
          where("userId", "==", viewerUid),
        ),
      ),
    );
    await assertFails(getDocs(collectionGroup(viewer, "members")));
  });

  it("laat alleen admins uitnodigingen beheren en alleen het juiste e-mailadres claimen", async () => {
    const admin = authedDb(adminUid, adminEmail);
    const partner = authedDb(partnerUid, partnerEmail);
    const invited = authedDb(invitedUid, invitedEmail);
    const wrongInvitee = authedDb(wrongInviteeUid, wrongEmail);

    await assertSucceeds(
      setDoc(doc(admin, invitePath("viewer-invite")), {
        householdId,
        email: "viewer2@example.com",
        role: "viewer",
        status: "pending",
        createdBy: adminUid,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    await assertFails(
      setDoc(doc(partner, invitePath("partner-created")), {
        householdId,
        email: "nope@example.com",
        role: "viewer",
        status: "pending",
        createdBy: partnerUid,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    await assertSucceeds(getDoc(doc(invited, invitePath("invite-partner"))));
    await assertFails(getDoc(doc(wrongInvitee, invitePath("invite-partner"))));
    await assertSucceeds(
      setDoc(doc(invited, memberPath(invitedUid)), {
        ...memberDoc(invitedUid, invitedEmail, "partner"),
        inviteId: "invite-partner",
      }),
    );
    await assertFails(
      setDoc(doc(wrongInvitee, memberPath(wrongInviteeUid)), {
        ...memberDoc(wrongInviteeUid, wrongEmail, "partner"),
        inviteId: "invite-partner",
      }),
    );
  });

  it("voorkomt dat een invitee invitevelden manipuleert tijdens accepteren", async () => {
    const invited = authedDb(invitedUid, invitedEmail);

    await assertSucceeds(
      updateDoc(doc(invited, invitePath("invite-partner")), {
        status: "accepted",
        acceptedBy: invitedUid,
        updatedAt: "2026-01-02T00:00:00.000Z",
      }),
    );

    await testEnv.clearFirestore();
    await seedHouseholds();

    await assertFails(
      updateDoc(doc(invited, invitePath("invite-partner")), {
        householdId: otherHouseholdId,
        status: "accepted",
        acceptedBy: invitedUid,
        updatedAt: "2026-01-02T00:00:00.000Z",
      }),
    );
  });
});
