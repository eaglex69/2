"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_DESIGN, type Design } from "@/lib/design-config";

const DesignContext = createContext<Design>(DEFAULT_DESIGN);

export function DesignProvider({ design, children }: { design: Design; children: ReactNode }) {
  return <DesignContext.Provider value={design}>{children}</DesignContext.Provider>;
}

export function useDesign() {
  return useContext(DesignContext);
}
