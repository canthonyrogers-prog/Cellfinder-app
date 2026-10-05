// Makes "Trinidad and Tobago", "trinidad & tobago" and "The Bahamas" match the same country.
export const normCountry = (s = '') =>
  s.toLowerCase().replace(/&/g, ' and ').trim().replace(/^the\s+/, '').replace(/\s+/g, ' ').trim();
