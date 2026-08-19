import { useEffect, useState, type ChangeEvent } from "react";

interface CurrencyInputProps {
  id?: string;
  value: number; // reais
  onChange: (value: number) => void;
  placeholder?: string;
}

function formatFromCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

export default function CurrencyInput({ id, value, onChange, placeholder }: CurrencyInputProps) {
  const [display, setDisplay] = useState(() =>
    value ? formatFromCents(Math.round(value * 100)) : ""
  );

  // Mantém sincronizado se o valor externo mudar (ex: ao carregar edição)
  useEffect(() => {
    const cents = Math.round((value || 0) * 100);
    setDisplay(cents ? formatFromCents(cents) : "");
  }, [value]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    const cents = digits ? parseInt(digits, 10) : 0;
    setDisplay(cents ? formatFromCents(cents) : "");
    onChange(cents / 100);
  }

  return (
    <input
      id={id}
      className="field-input"
      inputMode="numeric"
      placeholder={placeholder ?? "R$ 0,00"}
      value={display}
      onChange={handleChange}
    />
  );
}
