"use client";

import { useCallback, useEffect, useState } from "react";

import { api, ApiClientError } from "@/lib/api-client";

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** Chargement d'une ressource API avec état loading/error et rechargement manuel. */
export function useApi<T>(path: string, params?: Record<string, string | number | undefined>) {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  // Incrémenté pour déclencher un rechargement manuel via l'effet.
  const [version, setVersion] = useState(0);
  const paramsKey = JSON.stringify(params ?? {});

  useEffect(() => {
    let cancelled = false;
    api<T>(path, { params: JSON.parse(paramsKey) })
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: err instanceof ApiClientError ? err.message : "Erreur de chargement.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [path, paramsKey, version]);

  const reload = useCallback(() => {
    setState((previous) => ({ ...previous, loading: true, error: null }));
    setVersion((v) => v + 1);
  }, []);

  return { ...state, reload };
}
