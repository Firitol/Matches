export interface User {
  id: string;
  email: string;
  name?: string;
  age?: number;
  bio?: string;
  gender?: string;
  location?: string;
  interests?: string[];
  photos?: string[];
  createdAt?: string;
}