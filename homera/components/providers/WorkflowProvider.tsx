"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  EMPTY_WORKSPACE,
  parseWorkspace,
  workflowStorageKey,
  type WorkspaceData,
} from "@/lib/workflow";

type WorkflowSnapshot = { data: WorkspaceData; storageAvailable: boolean };
type WorkflowContextValue = WorkflowSnapshot & {
  ready: boolean;
  updateData: (updater: (current: WorkspaceData) => WorkspaceData) => void;
};

const EMPTY_SNAPSHOT: WorkflowSnapshot = { data: EMPTY_WORKSPACE, storageAvailable: true };
const WorkflowContext = createContext<WorkflowContextValue | null>(null);
const snapshots = new Map<string, WorkflowSnapshot>();
const listeners = new Map<string, Set<() => void>>();

function getSnapshot(key: string): WorkflowSnapshot {
  if (typeof window === "undefined") return EMPTY_SNAPSHOT;
  const cached = snapshots.get(key);
  if (cached) return cached;

  let snapshot: WorkflowSnapshot = EMPTY_SNAPSHOT;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      try {
        snapshot = { data: parseWorkspace(JSON.parse(raw)), storageAvailable: true };
      } catch {
        snapshot = { data: EMPTY_WORKSPACE, storageAvailable: true };
      }
    }
  } catch {
    snapshot = { data: EMPTY_WORKSPACE, storageAvailable: false };
  }
  snapshots.set(key, snapshot);
  return snapshot;
}

function publish(key: string, snapshot: WorkflowSnapshot) {
  snapshots.set(key, snapshot);
  listeners.get(key)?.forEach((listener) => listener());
}

function subscribe(key: string, listener: () => void) {
  const group = listeners.get(key) ?? new Set<() => void>();
  group.add(listener);
  listeners.set(key, group);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== key && event.key !== null) return;
    if (event.key === null) {
      snapshots.delete(key);
      getSnapshot(key);
      listeners.get(key)?.forEach((notify) => notify());
      return;
    }
    try {
      const data = event.newValue ? parseWorkspace(JSON.parse(event.newValue)) : EMPTY_WORKSPACE;
      publish(key, { data, storageAvailable: true });
    } catch {
      publish(key, { data: EMPTY_WORKSPACE, storageAvailable: true });
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    group.delete(listener);
    if (group.size === 0) listeners.delete(key);
    window.removeEventListener("storage", onStorage);
  };
}

function updateSnapshot(key: string, updater: (current: WorkspaceData) => WorkspaceData) {
  const current = getSnapshot(key);
  const data = updater(current.data);
  let storageAvailable = true;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Keep the interaction usable for this tab and explain that it will not persist.
    storageAvailable = false;
  }
  publish(key, { data, storageAvailable });
}

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const { ready: authReady, account } = useAuth();
  const storageKey = workflowStorageKey(account?.id ?? "invite");
  const subscribeToKey = useCallback((listener: () => void) => subscribe(storageKey, listener), [storageKey]);
  const readKey = useCallback(() => getSnapshot(storageKey), [storageKey]);
  const snapshot = useSyncExternalStore(subscribeToKey, readKey, () => EMPTY_SNAPSHOT);
  const updateData = useCallback(
    (updater: (current: WorkspaceData) => WorkspaceData) => updateSnapshot(storageKey, updater),
    [storageKey],
  );
  const value = useMemo(
    () => ({ ready: authReady, ...snapshot, updateData }),
    [authReady, snapshot, updateData],
  );

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}

export function useWorkflow(): WorkflowContextValue {
  const context = useContext(WorkflowContext);
  if (context) return context;
  return { ready: false, ...EMPTY_SNAPSHOT, updateData: () => {} };
}
