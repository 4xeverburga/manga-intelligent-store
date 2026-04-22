import type { CheckoutStatus } from "./useCheckout";

interface Props {
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  deliveryAddress: string;
  setDeliveryAddress: (v: string) => void;
  status: CheckoutStatus;
}

export function DeliveryForm({
  email,
  setEmail,
  phone,
  setPhone,
  deliveryAddress,
  setDeliveryAddress,
  status,
}: Props) {
  const disabled = status === "paying" || status === "expired";

  return (
    <div className="rounded-lg border border-[#1e2c31] bg-[#02090a] p-6">
      <h2 className="mb-4 text-lg font-medium text-white">Datos de envío</h2>
      <div className="space-y-3">
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-xs font-medium text-[#a1a1aa]"
          >
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            disabled={disabled}
            className="w-full rounded-md border border-[#1e2c31] bg-[#061a1c] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-neon/50 disabled:opacity-60"
          />
        </div>
        <div>
          <label
            htmlFor="phone"
            className="mb-1 block text-xs font-medium text-[#a1a1aa]"
          >
            Teléfono
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+51 999 999 999"
            disabled={disabled}
            className="w-full rounded-md border border-[#1e2c31] bg-[#061a1c] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-neon/50 disabled:opacity-60"
          />
        </div>
        <div>
          <label
            htmlFor="address"
            className="mb-1 block text-xs font-medium text-[#a1a1aa]"
          >
            Dirección de entrega
          </label>
          <textarea
            id="address"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="Av. Ejemplo 123, Distrito, Ciudad"
            rows={2}
            disabled={disabled}
            className="w-full resize-none rounded-md border border-[#1e2c31] bg-[#061a1c] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-neon/50 disabled:opacity-60"
          />
        </div>
      </div>
    </div>
  );
}
