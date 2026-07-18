/** Miroir de apps/accounts/serializers.py — UserSerializer. */
export type Role = "ECONOMAT_CENTRAL" | "ECONOME_PRINCIPAL" | "ASSISTANT";

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  centre: number | null;
  is_active: boolean;
  created_by: number | null;
  date_creation: string;
}

/** Format d'erreur uniforme de l'API (apps/core/exceptions.py). */
export interface ApiError {
  detail: string;
  code: string;
  fields?: Record<string, string[]>;
}
