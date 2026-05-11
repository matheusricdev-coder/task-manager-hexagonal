import { GetCurrentUserUseCase } from "../../../../src/application/useCases/auth/GetCurrentUserUseCase";
import { UnauthenticatedException } from "../../../../src/domain/errors/UnauthenticatedException";
import { buildUser, makeUserRepositoryMock } from "../../../helpers/mocks";

describe("GetCurrentUserUseCase", () => {
  it("returns a PublicUser (without password) when the user exists", async () => {
    const userRepository = makeUserRepositoryMock();
    const useCase = new GetCurrentUserUseCase(userRepository);
    const user = buildUser({ id: "u1", password: "secret-hash" });
    userRepository.findById.mockResolvedValue(user);

    const result = await useCase.execute("u1");

    expect(userRepository.findById).toHaveBeenCalledWith("u1");
    expect(result.id).toBe("u1");
    expect(result.email).toBe(user.email);
    expect(result.name).toBe(user.name);
    expect(result).not.toHaveProperty("password");
  });

  it("throws UnauthenticatedException when user does not exist", async () => {
    const userRepository = makeUserRepositoryMock();
    const useCase = new GetCurrentUserUseCase(userRepository);
    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute("missing")).rejects.toBeInstanceOf(
      UnauthenticatedException
    );
  });
});
