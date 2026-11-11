"use client";
import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from "react";
import type { Section } from "@/lib/models";
type State = {
  workingLayouts: Record<string, Section[]>;
  setWorkingLayouts: Dispatch<SetStateAction<Record<string, Section[]>>>;
  designHistory: Record<string, string[]>;
  setDesignHistory: Dispatch<SetStateAction<Record<string, string[]>>>;
  dark: boolean;
  setDark: Dispatch<SetStateAction<boolean>>;
  pageId: string | undefined;
  setPageId: Dispatch<SetStateAction<string | undefined>>;
};
const WorkspaceContext = createContext<State | null>(null);
// Lives above dashboard route segments so navigation and router.refresh do
// not discard unsaved layouts when independent modules are added later.
export function MerchantWorkspaceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [workingLayouts, setWorkingLayouts] = useState<
    Record<string, Section[]>
  >({});
  const [designHistory, setDesignHistory] = useState<Record<string, string[]>>(
    {},
  );
  const [dark, setDark] = useState(false);
  const [pageId, setPageId] = useState<string>();
  return (
    <WorkspaceContext.Provider
      value={{
        workingLayouts,
        setWorkingLayouts,
        designHistory,
        setDesignHistory,
        dark,
        setDark,
        pageId,
        setPageId,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
export function useMerchantWorkspace() {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error("Merchant workspace provider is required");
  return workspace;
}
