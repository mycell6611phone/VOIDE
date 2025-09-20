import React, { createContext, useContext } from "react";

type CanvasBoundaryContextValue = React.RefObject<HTMLDivElement> | null;

const CanvasBoundaryContext = createContext<CanvasBoundaryContextValue>(null);

interface CanvasBoundaryProviderProps {
  value: React.RefObject<HTMLDivElement>;
  children: React.ReactNode;
}

export function CanvasBoundaryProvider({ value, children }: CanvasBoundaryProviderProps) {
  return (
    <CanvasBoundaryContext.Provider value={value}>
      {children}
    </CanvasBoundaryContext.Provider>
  );
}

export function useCanvasBoundary() {
  return useContext(CanvasBoundaryContext);
}

