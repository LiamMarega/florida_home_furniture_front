/**
 * Where the store delivers: the 50 states, DC and the inhabited US territories (the places the backend's Affirm
 * checkout knows), by USPS code, in alphabetical order of their names. Addresses store the two-letter code.
 */
export const US_STATES: ReadonlyArray<{ readonly code: string; readonly name: string }> = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AS', name: 'American Samoa' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'GU', name: 'Guam' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'MP', name: 'Northern Mariana Islands' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'VI', name: 'U.S. Virgin Islands' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

const STATE_CODES = new Set(US_STATES.map(({ code }) => code));

/** Codes by lowercase name, plus the other common spellings of DC and the Virgin Islands. */
const STATE_CODES_BY_NAME = new Map<string, string>([
  ...US_STATES.map(({ code, name }) => [name.toLowerCase(), code] as const),
  ['washington dc', 'DC'],
  ['washington d.c.', 'DC'],
  ['us virgin islands', 'VI'],
  ['united states virgin islands', 'VI'],
  ['virgin islands', 'VI'],
]);

/** Ways a saved address may name the United States (lowercase). */
const US_COUNTRY_NAMES = new Set(['us', 'u.s.', 'usa', 'u.s.a.', 'united states', 'united states of america']);

/** Whether `value` is the code of a state, DC or territory the store delivers to ("FL"; not "fl" or "Florida"). */
export function isUsStateCode(value: unknown): boolean {
  return typeof value === 'string' && STATE_CODES.has(value);
}

/**
 * The code of a saved state: a code in any case ("fl") or a name ("Florida", "new  york"; case and extra spaces
 * ignored) becomes its code; anything else (another country's province, a typo) is empty, so the shopper is asked
 * to choose a state.
 */
export function toUsStateCode(value: unknown): string {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  const code = text.toUpperCase();
  if (STATE_CODES.has(code)) {
    return code;
  }
  return STATE_CODES_BY_NAME.get(text.toLowerCase()) ?? '';
}

/**
 * "US" for a saved country that names the United States in any spelling ("USA", "United States", the name the
 * account address routes answer with), or none at all; otherwise the value trimmed, which checkout refuses as
 * outside the US.
 */
export function toUsCountryCode(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : '';
  return !text || US_COUNTRY_NAMES.has(text.replace(/\s+/g, ' ').toLowerCase()) ? 'US' : text;
}
