"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useAuth } from "@/stores/auth-store";

const loginSchema = z.object({
  email: z.email("Adresse email invalide."),
  password: z.string().min(1, "Le mot de passe est requis."),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginForm) => {
    setServerError(null);
    try {
      const user = await login(values.email, values.password);
      router.replace(
        user.role === "ECONOMAT_CENTRAL" ? "/dashboard" : "/centre/tableau-de-bord",
      );
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Connexion impossible.",
      );
    }
  };

  return (
    <main className="flex min-h-screen">
      {/* Panneau de marque (desktop) */}
      <div className="hidden flex-1 flex-col justify-between bg-gradient-to-br from-slate-900 to-[#1e1b4b] p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-[15px] font-extrabold">
            F
          </span>
          <span className="text-base font-bold tracking-tight">Financiapro</span>
        </div>
        <div>
          <p className="max-w-[22ch] text-[26px] font-bold leading-tight tracking-tight">
            La gestion financière de vos centres, claire et unifiée.
          </p>
          <p className="mt-3 max-w-[40ch] text-sm text-slate-400">
            Paroisses, écoles, orphelinats et œuvres sociales — chaque centre
            autonome, une vision d&apos;ensemble pour l&apos;Économat.
          </p>
        </div>
        <p className="text-xs text-slate-500">© 2026 Financiapro</p>
      </div>

      {/* Formulaire */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 lg:max-w-[480px]">
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm" noValidate>
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-[15px] font-extrabold text-white">
              F
            </span>
            <span className="text-base font-bold tracking-tight">Financiapro</span>
          </div>

          <h1 className="text-[22px] font-bold tracking-tight">Connexion</h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">
            Utilisez le compte fourni par votre responsable.
          </p>

          <div className="mb-4">
            <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold text-slate-700">
              Adresse email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="prenom.nom@exemple.org"
              {...register("email")}
              className="input-base"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-rose-600">{errors.email.message}</p>
            )}
          </div>

          <div className="mb-5">
            <label htmlFor="password" className="mb-1.5 block text-[13px] font-semibold text-slate-700">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
              className="input-base"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-rose-600">{errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full justify-center"
          >
            {isSubmitting ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    </main>
  );
}
