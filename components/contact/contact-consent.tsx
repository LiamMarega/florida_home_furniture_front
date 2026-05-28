'use client';

import { Checkbox } from '@/components/ui/checkbox';

const BUSINESS_NAME = 'Florida Home Furniture';

interface ConsentRowProps {
  id: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  children: React.ReactNode;
}

function ConsentRow({ id, checked, onCheckedChange, children }: ConsentRowProps) {
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-3 cursor-pointer text-[13px] leading-relaxed text-brand-dark-blue/80"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className="mt-0.5 h-5 w-5 border-2 border-brand-dark-blue data-[state=checked]:bg-brand-primary data-[state=checked]:border-brand-primary"
      />
      <span>{children}</span>
    </label>
  );
}

interface ContactConsentProps {
  transactional: boolean;
  marketing: boolean;
  onTransactionalChange: (v: boolean) => void;
  onMarketingChange: (v: boolean) => void;
}

export function ContactConsent({
  transactional,
  marketing,
  onTransactionalChange,
  onMarketingChange,
}: ContactConsentProps) {
  return (
    <div className="space-y-3 rounded-md bg-brand-cream/40 border border-brand-cream p-4">
      <ConsentRow
        id="transactional-consent"
        checked={transactional}
        onCheckedChange={onTransactionalChange}
      >
        By checking this box, I consent to receive transactional messages
        related to my account, orders, or services I have requested from{' '}
        <strong>{BUSINESS_NAME}</strong>. These messages may include appointment
        reminders, order confirmations, and account notifications among others.
        Message frequency may vary. Message &amp; Data rates may apply. Reply
        HELP for help or STOP to opt-out.
      </ConsentRow>

      <ConsentRow
        id="marketing-consent"
        checked={marketing}
        onCheckedChange={onMarketingChange}
      >
        By checking this box, I consent to receive marketing and promotional
        messages from <strong>{BUSINESS_NAME}</strong>, including special
        offers, discounts, new product updates among others. Message frequency
        may vary. Message &amp; Data rates may apply. Reply HELP for help or
        STOP to opt-out.
      </ConsentRow>
    </div>
  );
}
