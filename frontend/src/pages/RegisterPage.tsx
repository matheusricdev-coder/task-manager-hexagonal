import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(email, name, password);
      navigate("/tasks");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-card stagger">
        <div className="auth-brand">
          <div className="brand-mark" aria-hidden />
          Pulse
        </div>

        <h1>
          Comece seu <span className="accent">fluxo.</span>
        </h1>
        <p className="sub">Três campos, sem fricção. Você está dentro em segundos.</p>

        <form onSubmit={onSubmit} className="form">
          <div className="field">
            <label>Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="Alice Almeida"
              required
            />
          </div>

          <div className="field">
            <label>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="voce@empresa.com.br"
              required
            />
          </div>

          <div className="field">
            <label>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
              placeholder="Pelo menos 8 caracteres"
              required
            />
          </div>

          {error && <div className="alert">{error}</div>}

          <button type="submit" className="btn btn--lime btn--full" disabled={loading}>
            {loading ? "Criando conta" : "Criar conta"}
          </button>
        </form>

        <div className="auth-bottom">
          Já tem uma conta? <Link to="/login">Entrar</Link>
        </div>
      </div>
    </div>
  );
};
