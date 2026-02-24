export interface AuthResponse {
  user: {
    id: string;
    email: string;
  };
  token: string;
}