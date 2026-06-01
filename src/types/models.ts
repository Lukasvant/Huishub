import type { Timestamp } from "firebase/firestore";

export type StoredDate = Timestamp | Date;
export type HouseholdRole = "admin" | "partner" | "viewer";

export interface Household {
  id: string;
  name: string;
  createdBy: string;
  createdAt: StoredDate;
  updatedAt: StoredDate;
}

export interface HouseholdMember {
  id: string;
  householdId: string;
  userId: string;
  email: string;
  displayName: string;
  role: HouseholdRole;
  createdAt: StoredDate;
  updatedAt: StoredDate;
}

export interface HouseholdInvite {
  id: string;
  householdId: string;
  email: string;
  role: Exclude<HouseholdRole, "admin">;
  status: "pending" | "accepted";
  createdBy: string;
  acceptedBy?: string;
  createdAt: StoredDate;
  updatedAt: StoredDate;
}

export type TaskCategory =
  | "huishouden"
  | "kind"
  | "administratie"
  | "boodschappen"
  | "overig";

export type Recurrence =
  | { type: "daily"; interval: number }
  | { type: "weekly"; interval: number }
  | { type: "monthly"; interval: number }
  | { type: "weekdays"; weekdays: number[] }
  | { type: "last_friday_month" };

export interface Task {
  id: string;
  householdId: string;
  title: string;
  description?: string;
  assignedTo?: string;
  dueDate?: StoredDate;
  category: TaskCategory;
  status: "open" | "done";
  recurrence?: Recurrence;
  visibleToViewers: boolean;
  createdBy: string;
  createdAt: StoredDate;
  updatedAt: StoredDate;
  completedAt?: StoredDate;
}

export type GroceryCategory =
  | "groente"
  | "zuivel"
  | "baby"
  | "drogist"
  | "brood"
  | "vlees"
  | "overig";

export interface GroceryItem {
  id: string;
  householdId: string;
  name: string;
  quantity?: string;
  unit?: string;
  shopLabel?: string;
  category?: GroceryCategory;
  status: "needed" | "bought";
  boughtColorState: "needed" | "bought";
  addedBy: string;
  createdAt: StoredDate;
  updatedAt: StoredDate;
  boughtAt?: StoredDate;
}

export interface ParsedGroceryItem {
  name: string;
  quantity?: string;
  unit?: string;
  shopLabel?: string;
  confidence?: number;
}

export interface AgendaItem {
  id: string;
  householdId: string;
  title: string;
  description?: string;
  startDateTime: StoredDate;
  endDateTime?: StoredDate;
  allDay: boolean;
  location?: string;
  private: boolean;
  visibleToViewers: boolean;
  createdBy: string;
  source: "manual";
  createdAt: StoredDate;
  updatedAt: StoredDate;
}

export type NotificationType =
  | "task_due_soon"
  | "task_overdue"
  | "agenda_upcoming";

export interface InAppNotification {
  id: string;
  type: NotificationType;
  title: string;
  detail: string;
  dueAt: Date;
  href: string;
}
