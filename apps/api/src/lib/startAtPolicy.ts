import { AppError } from "./errors.js";

/** Exige que `startAt` seja estritamente posterior ao instante atual (não permite “agora” nem o passado). */
export function assertStartAtStrictlyInFuture(startAt: Date, now: Date = new Date()): void {
  if (startAt.getTime() <= now.getTime()) {
    throw new AppError(
      "START_AT_NOT_FUTURE",
      "A data e hora do agendamento precisam ser posteriores ao momento atual.",
      400
    );
  }
}
