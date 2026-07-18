"use client";

import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { RoleGuard } from "@/components/layout/RoleGuard";

export default function EconomatLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard roles={["ECONOMAT_CENTRAL"]}>
      <AppShell>{children}</AppShell>
    </RoleGuard>
  );
}
