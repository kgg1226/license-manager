"use client";

import { useState, useEffect } from "react";

type AuthUser = {
  id: number;
  username: string;
  role: "ADMIN" | "USER";
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
};

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setState({
          user: data?.authenticated ? data.user : null,
          loading: false,
        });
      })
      .catch(() => setState({ user: null, loading: false }));
  }, []);

  return state;
}
