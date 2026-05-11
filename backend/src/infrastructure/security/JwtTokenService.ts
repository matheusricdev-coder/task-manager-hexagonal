import jwt, { SignOptions } from "jsonwebtoken";
import {
  TokenPayload,
  TokenService,
} from "../../application/ports/services/TokenService";
import { UnauthenticatedException } from "../../domain/errors/UnauthenticatedException";

export class JwtTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string = "1d"
  ) {}

  sign(payload: TokenPayload): string {
    const options: SignOptions = { expiresIn: this.expiresIn as SignOptions["expiresIn"] };
    return jwt.sign(payload, this.secret, options);
  }

  verify(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret);
      if (typeof decoded === "string" || !decoded) {
        throw new UnauthenticatedException("Payload do token inválido");
      }
      const { userId, email } = decoded as TokenPayload;
      if (!userId || !email) {
        throw new UnauthenticatedException("Token mal formado");
      }
      return { userId, email };
    } catch (err) {
      if (err instanceof UnauthenticatedException) throw err;
      throw new UnauthenticatedException("Token inválido ou expirado");
    }
  }
}
