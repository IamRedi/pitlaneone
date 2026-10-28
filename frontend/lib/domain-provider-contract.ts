import "server-only";

/** Provider-neutral contract. Availability and checkout stay separate so a
 * customer explicitly approves any paid domain before an order is created. */
export type DomainAvailability = {
  domain: string;
  available: boolean;
  currency?: string;
  annualPrice?: number;
};

export interface DomainProvider {
  checkAvailability(domains: string[]): Promise<DomainAvailability[]>;
  beginCheckout(input: { domain: string; companyId: string; returnUrl: string }): Promise<{ checkoutUrl: string }>;
}

export function configuredDomainProvider(): DomainProvider | null {
  // Connect the selected registrar here later. No domain search or purchase is
  // attempted until both provider and credentials are explicitly configured.
  return null;
}
