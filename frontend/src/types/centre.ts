import type { User } from "./auth";

/** Miroir de apps/centres/serializers.py. */
export interface TypeCentre {
  id: number;
  code: string;
  libelle: string;
  is_active: boolean;
}

export interface Centre {
  id: number;
  nom: string;
  type_centre: TypeCentre;
  econome_principal: User;
  description: string;
  is_active: boolean;
  date_creation: string;
}
