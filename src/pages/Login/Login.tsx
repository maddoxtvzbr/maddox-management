import { useState, type FormEvent } from "react";
import { useAuth } from "../../auth/AuthContext";
import { supabaseConfigurado } from "../../lib/supabaseClient";
import "./Login.css";

export default function Login() {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);
  const [recuperando, setRecuperando] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (entrando) return;
    setErro(null);
    setAviso(null);

    if (!email.trim() || !senha) {
      setErro("Informe e-mail e senha.");
      return;
    }

    setEntrando(true);
    const { error } = await signIn(email.trim(), senha);
    setEntrando(false);
    if (error) setErro(error);
  }

  async function handleEsqueciSenha() {
    if (!email.trim()) {
      setErro("Informe seu e-mail para recuperar a senha.");
      return;
    }
    setErro(null);
    setAviso(null);
    setRecuperando(true);
    const { error } = await resetPassword(email.trim());
    setRecuperando(false);
    if (error) setErro(error);
    else setAviso("Enviamos um link de recuperação para o seu e-mail.");
  }

  return (
    <div className="login-screen">
      <div className="login-content">
        <div className="login-header">
          <p className="eyebrow">MADDOX</p>
          <h1>Management</h1>
        </div>

        {!supabaseConfigurado && (
          <div className="card login-alerta">
            <span className="field-error">
              Supabase não configurado. Copie .env.example para .env e preencha com os dados do
              seu projeto (veja o README).
            </span>
          </div>
        )}

        <form className="card login-card" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">E-mail</span>
            <input
              className="field-input"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              enterKeyHint="next"
            />
          </label>

          <label className="field">
            <span className="field-label">Senha</span>
            <input
              className="field-input"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              enterKeyHint="go"
            />
          </label>

          {erro && <span className="field-error">{erro}</span>}
          {aviso && <span className="login-aviso">{aviso}</span>}

          <button type="submit" className="btn-primary" disabled={entrando}>
            {entrando ? "Entrando..." : "Entrar"}
          </button>

          <button
            type="button"
            className="link-btn login-esqueci"
            onClick={handleEsqueciSenha}
            disabled={recuperando}
          >
            {recuperando ? "Enviando..." : "Esqueci minha senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
