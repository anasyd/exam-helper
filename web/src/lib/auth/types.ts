export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  image: string | null;
  createdAt: string | Date;
}

export interface MeResponse {
  user: AuthUser;
  planTier: "free";
}
