import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("e-mail inválido"),
  name: z.string().min(1, "nome é obrigatório").max(120),
  password: z.string().min(8, "senha deve ter no mínimo 8 caracteres"),
});

export const loginSchema = z.object({
  email: z.string().email("e-mail inválido"),
  password: z.string().min(1, "senha é obrigatória"),
});

export type RegisterDTO = z.infer<typeof registerSchema>;
export type LoginDTO = z.infer<typeof loginSchema>;
