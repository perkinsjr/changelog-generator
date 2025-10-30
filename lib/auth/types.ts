export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  html_url: string;
  type: string;
  company: string | null;
  location: string | null;
  bio: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  githubId: number; // Matches GitHubUser.id type
  login: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  // accessToken removed - security risk to include in public user type
  // Use server-side token storage and dedicated API routes instead
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: Date;
  token: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthAccount {
  id: string;
  userId: string;
  accountId: string;
  providerId: string;
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
  scope?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  owner: {
    login: string;
    avatar_url: string;
  };
  html_url: string;
  clone_url: string;
  ssh_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  archived: boolean;
  disabled: boolean;
  visibility: "public" | "private";
  permissions?: {
    admin: boolean;
    maintain: boolean;
    push: boolean;
    triage: boolean;
    pull: boolean;
  };
}

export interface RepositorySelectOption {
  value: string; // full_name
  label: string; // full_name or display name
  description?: string;
  isPrivate: boolean;
  language?: string;
  stars: number;
  owner: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export interface AuthError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Better Auth specific types - used by the better-auth library
 * These types correspond to better-auth's internal data structures
 * Use these when working directly with better-auth APIs
 */
export interface BetterAuthUser {
  id: string;
  email: string; // Required in better-auth, optional in our AuthUser
  name: string;
  image?: string; // better-auth uses 'image' instead of 'avatarUrl'
  emailVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Note: better-auth doesn't include githubId/login by default
}

export interface BetterAuthSession {
  id: string;
  userId: string;
  expiresAt: Date;
  token: string;
  ipAddress?: string;
  userAgent?: string;
  // Note: missing createdAt/updatedAt compared to AuthSession
}

export interface BetterAuthAccount {
  id: string;
  userId: string;
  accountId: string;
  providerId: string;
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt?: Date; // Single expiry field vs separate token expiry fields
  tokenType?: string;
  scope?: string;
  // Note: missing createdAt/updatedAt compared to AuthAccount
}

/**
 * Mapping functions between Auth and BetterAuth types
 */
export function authUserToBetterAuthUser(user: AuthUser): BetterAuthUser {
  if (!user.email) {
    throw new Error("Email is required for BetterAuth user");
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name || user.login,
    image: user.avatarUrl || undefined,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function betterAuthUserToAuthUser(
  betterAuthUser: BetterAuthUser,
  githubId: number,
  login: string,
): AuthUser {
  return {
    id: betterAuthUser.id,
    githubId,
    login,
    name: betterAuthUser.name,
    email: betterAuthUser.email,
    avatarUrl: betterAuthUser.image || null,
    createdAt: betterAuthUser.createdAt,
    updatedAt: betterAuthUser.updatedAt,
  };
}

// GitHub OAuth specific types
export interface GitHubAuthScope {
  user: boolean;
  "user:email": boolean;
  repo: boolean;
  public_repo: boolean;
  "read:user": boolean;
  "read:org": boolean;
}

export interface GitHubTokenInfo {
  token: string;
  scopes: string[];
  expiresAt?: Date;
  tokenType: "bearer";
}
