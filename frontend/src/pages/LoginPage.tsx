import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/tasks");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao entrar");
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
          Bem-vindo <span className="accent">de volta.</span>
        </h1>
        <p className="sub">Entre para manter sua semana em dia.</p>

        <form onSubmit={onSubmit} className="form">
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
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div className="alert">{error}</div>}

          <button type="submit" className="btn btn--lime btn--full" disabled={loading}>
            {loading ? "Entrando" : "Entrar"}
          </button>
        </form>

        <div className="auth-bottom">
          Novo por aqui? <Link to="/register">Criar uma conta</Link>
        </div>
      </div>
    </div>
  );
};
