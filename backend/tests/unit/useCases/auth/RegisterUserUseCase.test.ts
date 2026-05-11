import { RegisterUserUseCase } from "../../../../src/application/useCases/auth/RegisterUserUseCase";
import { UserAlreadyExistsException } from "../../../../src/domain/errors/UserAlreadyExistsException";
import {
  buildUser,
  makeHashServiceMock,
  makeTokenServiceMock,
  makeUserRepositoryMock,
} from "../../../helpers/mocks";

describe("RegisterUserUseCase", () => {
  const setup = () => {
    const userRepository = makeUserRepositoryMock();
    const hashService = makeHashServiceMock();
    const tokenService = makeTokenServiceMock();
    const useCase = new RegisterUserUseCase(
      userRepository,
      hashService,
      tokenService
    );
    return { useCase, userRepository, hashService, tokenService };
  };

  const validInput = {
    email: "alice@example.com",
    name: "Alice",
    password: "plain-password",
  };

  it("creates a user, hashes the password, and returns a token", async () => {
    const { useCase, userRepository, hashService, tokenService } = setup();
    const user = buildUser({ password: "hashed-pw" });
    userRepository.findByEmail.mockResolvedValue(null);
    hashService.hash.mockResolvedValue("hashed-pw");
    userRepository.create.mockResolvedValue(user);
    tokenService.sign.mockReturnValue("signed-token");

    const result = await useCase.execute(validInput);

    expect(hashService.hash).toHaveBeenCalledWith("plain-password");
    expect(tokenService.sign).toHaveBeenCalledWith({
      userId: user.id,
      email: user.email,
    });
    expect(result.token).toBe("signed-token");
    expect(result.user.email).toBe("alice@example.com");
  });

  it("never persists the plain-text password (security invariant)", async () => {
    const { useCase, userRepository, hashService, tokenService } = setup();
    userRepository.findByEmail.mockResolvedValue(null);
    hashService.hash.mockResolvedValue("HASHED-X");
    userRepository.create.mockResolvedValue(buildUser());
    tokenService.sign.mockReturnValue("t");

    await useCase.execute(validInput);

    const createArgs = userRepository.create.mock.calls[0][0];
    expect(createArgs.password).toBe("HASHED-X");
    expect(createArgs.password).not.toBe("plain-password");
  });

  it("never leaks the password field in the returned PublicUser", async () => {
    const { useCase, userRepository, hashService, tokenService } = setup();
    userRepository.findByEmail.mockResolvedValue(null);
    hashService.hash.mockResolvedValue("h");
    userRepository.create.mockResolvedValue(buildUser({ password: "h" }));
    tokenService.sign.mockReturnValue("t");

    const result = await useCase.execute(validInput);

    expect(result.user).not.toHaveProperty("password");
  });

  it("token payload contains only userId and email", async () => {
    const { useCase, userRepository, hashService, tokenService } = setup();
    userRepository.findByEmail.mockResolvedValue(null);
    hashService.hash.mockResolvedValue("h");
    userRepository.create.mockResolvedValue(buildUser({ id: "u-7" }));
    tokenService.sign.mockReturnValue("t");

    await useCase.execute(validInput);

    const payload = tokenService.sign.mock.calls[0][0];
    expect(Object.keys(payload).sort()).toEqual(["email", "userId"]);
  });

  it("throws UserAlreadyExistsException when email is already registered", async () => {
    const { useCase, userRepository, hashService } = setup();
    userRepository.findByEmail.mockResolvedValue(buildUser());

    await expect(useCase.execute(validInput)).rejects.toBeInstanceOf(
      UserAlreadyExistsException
    );

    expect(hashService.hash).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("does not sign a token when the user already exists (no side-effects on failure)", async () => {
    const { useCase, userRepository, tokenService } = setup();
    userRepository.findByEmail.mockResolvedValue(buildUser());

    await expect(useCase.execute(validInput)).rejects.toBeDefined();

    expect(tokenService.sign).not.toHaveBeenCalled();
  });
});
