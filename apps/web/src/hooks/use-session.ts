import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../api/client";
import { flareApi } from "../api/flare-api";
import type { User } from "../types/flare";

type SessionState = {
  user: User | null;
  loading: boolean;
  error: string | null;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export function useSession() {
  const [state, setState] = useState<SessionState>({ user: null, loading: true, error: null });

  const loadSession = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const response = await flareApi.getMe();
      setState({ user: response.user, loading: false, error: null });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setState({ user: null, loading: false, error: null });
        return;
      }
      setState({ user: null, loading: false, error: errorMessage(error) });
    }
  }, []);

  useEffect(() => {
    const taskId = window.setTimeout(() => void loadSession(), 0);
    return () => window.clearTimeout(taskId);
  }, [loadSession]);

  const login = useCallback(async (email: string, password: string) => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const response = await flareApi.login(email, password);
      setState({ user: response.user, loading: false, error: null });
    } catch (error) {
      const message = errorMessage(error);
      setState({ user: null, loading: false, error: message });
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    await flareApi.logout();
    setState({ user: null, loading: false, error: null });
  }, []);

  return { ...state, login, logout, reload: loadSession };
}
