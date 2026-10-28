"use client";

import { useEffect, useState } from "react";
import { addServiceForm } from "@/app/actions";
import { SubmitButton } from "@/components/forms";
import { formatCurrency } from "@/lib/utils";

type ClientOption = {
  id: string;
  label: string;
  isVip: boolean;
  vehicles: {
    id: string;
    label: string;
  }[];
};

type LineItem = {
  name: string;
  fee: number;
  laborBaseCost: number;
  laborCost: number;
  laborDiscountPercent: number;
  materialCost: number;
};

const defaultItem: LineItem = {
  name: "",
  materialCost: 0,
  laborBaseCost: 0,
  laborCost: 0,
  laborDiscountPercent: 0,
  fee: 0
};

function getTodayInputValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

export function ServiceForm({
  clients,
  initialClientId = "",
  initialVehicleId = ""
}: {
  clients: ClientOption[];
  initialClientId?: string;
  initialVehicleId?: string;
}) {
  const defaultClientId = clients.some((client) => client.id === initialClientId) ? initialClientId : clients[0]?.id ?? "";
  const defaultClient = clients.find((client) => client.id === defaultClientId);
  const defaultVehicleId = defaultClient?.vehicles.some((vehicle) => vehicle.id === initialVehicleId)
    ? initialVehicleId
    : defaultClient?.vehicles[0]?.id ?? "";
  const [clientId, setClientId] = useState(defaultClientId);
  const [vehicleId, setVehicleId] = useState(defaultVehicleId);
  const [items, setItems] = useState<LineItem[]>([{ ...defaultItem }]);

  const selectedClient = clients.find((client) => client.id === clientId);
  const [isVipForService, setIsVipForService] = useState(selectedClient?.isVip ?? false);
  const selectedVehicles = selectedClient?.vehicles ?? [];
  const total = items.reduce((sum, item) => sum + item.materialCost + item.laborCost + item.fee, 0);
  const canSubmit = Boolean(clientId && vehicleId && items.some((item) => item.name.trim().length > 0));
  const today = getTodayInputValue();

  useEffect(() => {
    setIsVipForService(selectedClient?.isVip ?? false);
    const hasSelectedVehicle = selectedClient?.vehicles.some((vehicle) => vehicle.id === vehicleId);
    setVehicleId(hasSelectedVehicle ? vehicleId : selectedClient?.vehicles[0]?.id ?? "");
  }, [clientId, selectedClient?.isVip, selectedClient?.vehicles, vehicleId]);

  function updateItem(index: number, key: keyof LineItem, value: string) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]: key === "name" ? value : Number(value),
              ...(key === "laborCost" ? { laborBaseCost: item.laborDiscountPercent > 0 ? Number(value) / 0.8 : Number(value) } : {})
            }
          : item
      )
    );
  }

  function setVipLaborDiscount(index: number, checked: boolean) {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const baseCost = item.laborDiscountPercent > 0 ? item.laborBaseCost : item.laborCost;

        return checked
          ? {
              ...item,
              laborBaseCost: baseCost,
              laborCost: Number((baseCost * 0.8).toFixed(2)),
              laborDiscountPercent: 20
            }
          : {
              ...item,
              laborCost: Number(item.laborBaseCost.toFixed(2)),
              laborDiscountPercent: 0
            };
      })
    );
  }

  function updateVipForService(checked: boolean) {
    setIsVipForService(checked);

    if (!checked) {
      setItems((current) =>
        current.map((item) =>
          item.laborDiscountPercent > 0
            ? {
                ...item,
                laborCost: Number(item.laborBaseCost.toFixed(2)),
                laborDiscountPercent: 0
              }
            : item
        )
      );
    }
  }

  return (
    <form action={addServiceForm} className="space-y-4">
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <label className="block text-sm font-medium text-slate-700">
        Klienti
        <select name="clientId" value={clientId} onChange={(event) => setClientId(event.target.value)} required>
          {clients.length === 0 ? (
            <option value="">Nuk ka kliente</option>
          ) : null}
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-ink">
        <input
          name="isVip"
          type="checkbox"
          checked={isVipForService}
          onChange={(event) => updateVipForService(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 p-0"
        />
        Klient VIP
      </label>
      {isVipForService ? (
        <p className="rounded-2xl bg-brand-soft px-4 py-3 text-sm font-semibold text-brand-dark">
          Klient VIP: mund te aplikosh -20% te haku i punes per rreshtat e sherbimit.
        </p>
      ) : null}

      <label className="block text-sm font-medium text-slate-700">
        Automjeti
        <select name="vehicleId" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)} required>
          <option value="" disabled>
            {selectedVehicles.length > 0 ? "Zgjidh automjetin" : "Klienti nuk ka automjet"}
          </option>
          {selectedVehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.label}
            </option>
          ))}
        </select>
      </label>
      {clientId && selectedVehicles.length === 0 ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Ky klient nuk ka automjet te regjistruar. Shto automjetin ne panel, pastaj regjistro sherbimin.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Lloji
          <select name="type" defaultValue="normal">
            <option value="normal">Normal</option>
            <option value="periodic">Periodic</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Data
          <input name="date" type="date" required defaultValue={today} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Kilometra
          <input name="km" type="number" min="0" required />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Afati i fatures
          <input name="dueDate" type="date" />
        </label>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Shenime
        <textarea name="notes" rows={4} placeholder="Shenime shtese per servisin" />
      </label>

      <div className="rounded-[24px] bg-slate-50 p-4">
        <h3 className="text-lg font-bold text-ink">Sherbimi i radhes / kujtesa</h3>
        <p className="mt-1 text-sm text-slate">
          Sheno km dhe daten e perafert qe klienti ta shohe ne portal dhe me vone te njoftohet sipas dates.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Km i sherbimit te radhes
            <input name="nextKm" type="number" min="0" placeholder="p.sh. 160000" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Data e perafert
            <input name="nextDate" type="date" />
          </label>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-ink">Tabela e sherbimit</h3>
            <p className="mt-1 text-sm text-slate">Sheno defektin/materialin, cmimin e blerjes, cmimin final dhe punen.</p>
          </div>
          <button
            type="button"
            onClick={() => setItems((current) => [...current, { ...defaultItem }])}
            className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Shto rresht
          </button>
        </div>

        {items.map((item, index) => (
          <div key={index} className="grid gap-3 rounded-[24px] bg-slate-50 p-4">
            <input
              value={item.name}
              onChange={(event) => updateItem(index, "name", event.target.value)}
              placeholder="Defekti, materiali ose simptoma"
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                Leket e materialit
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.materialCost}
                  onChange={(event) => updateItem(index, "materialCost", event.target.value)}
                  placeholder="Cmimi i blerjes"
                />
              </label>
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                Fitim / risk
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.fee}
                  onChange={(event) => updateItem(index, "fee", event.target.value)}
                  placeholder="Markup / risk / fitim"
                />
              </label>
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                Haku i punes
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.laborCost}
                  onChange={(event) => updateItem(index, "laborCost", event.target.value)}
                  placeholder="Puna / ore / fiks"
                />
                {isVipForService ? (
                  <label
                    className="mt-2 inline-flex items-center gap-2 text-xs font-semibold normal-case tracking-normal text-brand-dark"
                  >
                    <input
                      type="checkbox"
                      className="h-3 w-3 rounded border-brand-dark p-0"
                      checked={item.laborDiscountPercent === 20}
                      onChange={(event) => {
                        setVipLaborDiscount(index, event.target.checked);
                      }}
                    />
                    VIP -20%
                  </label>
                ) : null}
              </label>
            </div>
            <p className="text-xs text-slate">
              Totali i rreshtit = blerje + markup/risk + pune. Me vone do ndahet ne ore pune dhe liste cmimesh defektesh.
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-[24px] bg-slate-950 p-4 text-white">
        <p className="text-sm text-slate-300">Totali i llogaritur</p>
        <p className="mt-2 text-3xl font-black">{formatCurrency(total)}</p>
      </div>

      <SubmitButton disabled={!canSubmit} label="Ruaj sherbimin" pendingLabel="Po ruhet..." />
    </form>
  );
}
