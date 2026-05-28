import { z } from 'zod';

export const contactFormSchema = z.object({
  firstName: z.string().trim().max(80).optional().or(z.literal('')),
  lastName: z.string().trim().max(80).optional().or(z.literal('')),
  phone: z
    .string()
    .trim()
    .min(7, 'Please enter a valid phone number')
    .max(25, 'Phone number is too long')
    .regex(/^[+()\-\s\d]+$/, 'Only digits, spaces, +, - and () are allowed'),
  email: z.string().trim().email('Please enter a valid email'),
  message: z.string().trim().max(2000).optional().or(z.literal('')),
  transactionalConsent: z.boolean().optional().default(false),
  marketingConsent: z.boolean().optional().default(false),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
