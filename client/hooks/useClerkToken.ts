'use client';

import { useAuth } from "@clerk/nextjs";

export function useClerkToken() {
  const { getToken } = useAuth();

  const getAuthToken = async () => {
    return await getToken();
  };

  return { getAuthToken };
}
