export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PublicUser = Omit<User, "password">;

export const toPublicUser = (user: User): PublicUser => {
  const { password: _password, ...publicUser } = user;
  return publicUser;
};
