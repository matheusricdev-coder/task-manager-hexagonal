import { PublicUser, toPublicUser } from "../../../domain/entities/User";
import { InvalidCredentialsException } from "../../../domain/errors/InvalidCredentialsException";
import { UserRepository } from "../../ports/repositories/UserRepository";
import { HashService } from "../../ports/services/HashService";
import { TokenService } from "../../ports/services/TokenService";

export interface LoginUserInput {
  email: string;
  password: string;
}

export interface LoginUserOutput {
  user: PublicUser;
  token: string;
}

export class LoginUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashService: HashService,
    private readonly tokenService: TokenService
  ) {}

  async execute(input: LoginUserInput): Promise<LoginUserOutput> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    const matches = await this.hashService.compare(input.password, user.password);
    if (!matches) {
      throw new InvalidCredentialsException();
    }

    const token = this.tokenService.sign({
      userId: user.id,
      email: user.email,
    });

    return { user: toPublicUser(user), token };
  }
}
