import bcrypt from "bcryptjs";
import { HashService } from "../../application/ports/services/HashService";

export class BcryptHashService implements HashService {
  constructor(private readonly saltRounds: number = 10) {}

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.saltRounds);
  }

  compare(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }
}
