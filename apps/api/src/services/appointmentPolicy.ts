const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

/** Cliente pode alterar pela API só se faltar mais de 48h até startAt. */
export function canCustomerReschedule(startAt: Date, now: Date): boolean {
  return startAt.getTime() - now.getTime() > TWO_DAYS_MS;
}
