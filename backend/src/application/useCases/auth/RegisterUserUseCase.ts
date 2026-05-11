import { PublicUser, toPublicUser } from "../../../domain/entities/User";
import { UserAlreadyExistsException } from "../../../domain/errors/UserAlreadyExistsException";
import { UserRepository } from "../../ports/repositories/UserRepository";
import { HashService } from "../../ports/services/HashService";
import { TokenService } from "../../ports/services/TokenService";

export interface RegisterUserInput {
  email: string;
  name: string;
  password: string;
}

export interface RegisterUserOutput {
  user: PublicUser;
  token: string;
}

export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashService: HashService,
    private readonly tokenService: TokenService
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new UserAlreadyExistsException(input.email);
    }

    const hashedPassword = await this.hashService.hash(input.password);

    const user = await this.userRepository.create({
      email: input.email,
      name: input.name,
      password: hashedPassword,
    });

    const token = this.tokenService.sign({
      userId: user.id,
      email: user.email,
    });

    return { user: toPublicUser(user), token };
  }
}
