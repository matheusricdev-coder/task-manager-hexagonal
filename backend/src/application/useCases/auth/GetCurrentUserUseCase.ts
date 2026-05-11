import { PublicUser, toPublicUser } from "../../../domain/entities/User";
import { UnauthenticatedException } from "../../../domain/errors/UnauthenticatedException";
import { UserRepository } from "../../ports/repositories/UserRepository";

export class GetCurrentUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(userId: string): Promise<PublicUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthenticatedException("Sessão inválida");
    }
    return toPublicUser(user);
  }
}
