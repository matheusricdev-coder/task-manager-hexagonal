import { LoginUserUseCase } from "../../../../src/application/useCases/auth/LoginUserUseCase";
import { InvalidCredentialsException } from "../../../../src/domain/errors/InvalidCredentialsException";
import {
  buildUser,
  makeHashServiceMock,
  makeTokenServiceMock,
  makeUserRepositoryMock,
} from "../../../helpers/mocks";

describe("LoginUserUseCase", () => {
  const setup = () => {
    const userRepository = makeUserRepositoryMock();
    const hashService = makeHashServiceMock();
    const tokenService = makeTokenServiceMock();
    const useCase = new LoginUserUseCase(
      userRepository,
      hashService,
      tokenService
    );
    return { useCase, userRepository, hashService, tokenService };
  };

  it("returns user and token when credentials match", async () => {
    const { useCase, userRepository, hashService, tokenService } = setup();
    const user = buildUser();
    userRepository.findByEmail.mockResolvedValue(user);
    hashService.compare.mockResolvedValue(true);
    tokenService.sign.mockReturnValue("jwt-token");

    const result = await useCase.execute({
      email: user.email,
      password: "plain-password",
    });

    expect(hashService.compare).toHaveBeenCalledWith(
      "plain-password",
      user.password
    );
    expect(result.token).toBe("jwt-token");
  });

  it("never leaks the password in the returned PublicUser (security invariant)", async () => {
    const { useCase, userRepository, hashService, tokenService } = setup();
    userRepository.findByEmail.mockResolvedValue(buildUser({ password: "hashed" }));
    hashService.compare.mockResolvedValue(true);
    tokenService.sign.mockReturnValue("t");

    const result = await useCase.execute({ email: "a@b.com", password: "p" });

    expect(result.user).not.toHaveProperty("password");
  });

  it("throws InvalidCredentialsException when user not found (same exception as wrong password — no enumeration leak)", async () => {
    const { useCase, userRepository, hashService } = setup();
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ email: "nobody@example.com", password: "x" })
    ).rejects.toBeInstanceOf(InvalidCredentialsException);

    expect(hashService.compare).not.toHaveBeenCalled();
  });

  it("throws InvalidCredentialsException when password does not match", async () => {
    const { useCase, userRepository, hashService, tokenService } = setup();
    userRepository.findByEmail.mockResolvedValue(buildUser());
    hashService.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({ email: "alice@example.com", password: "wrong" })
    ).rejects.toBeInstanceOf(InvalidCredentialsException);

    expect(tokenService.sign).not.toHaveBeenCalled();
  });

  it("never signs a token when credentials are invalid (no side-effects on failure)", async () => {
    const { useCase, userRepository, hashService, tokenService } = setup();
    userRepository.findByEmail.mockResolvedValue(buildUser());
    hashService.compare.mockResolvedValue(false);

    await expect(useCase.execute({ email: "a@b.com", password: "x" })).rejects.toBeDefined();

    expect(tokenService.sign).not.toHaveBeenCalled();
  });
});
