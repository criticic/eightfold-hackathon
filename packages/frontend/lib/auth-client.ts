import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
});

export const { 
  signIn, 
  signUp, 
  signOut, 
  useSession,
  $fetch,
} = authClient;

// Helper to sign in with OAuth
export const signInWithGoogle = () => {
  return authClient.signIn.social({
    provider: "google",
    callbackURL: "/dashboard",
  });
};

export const signInWithGithub = () => {
  return authClient.signIn.social({
    provider: "github",
    callbackURL: "/dashboard",
  });
};
