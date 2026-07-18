"use client";

import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { RoleGuard } from "@/components/layout/RoleGuard";

export default function ProfilLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard roles={["ECONOMAT_CENTRAL", "ECONOME_PRINCIPAL", "ASSISTANT"]}>
      <AppShell>{children}</AppShell>
    </RoleGuard>
  );
}
