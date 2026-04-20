export type Role = "customer" | "admin";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: Role;
};
