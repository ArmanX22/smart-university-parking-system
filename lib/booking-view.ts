export function formatGateCredential(bookingCode: string, qrCodeSecret: string): string {
  return `${bookingCode} / ${qrCodeSecret}`;
}
