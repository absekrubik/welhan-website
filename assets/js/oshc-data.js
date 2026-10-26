/* >>> EDIT PRICES HERE <<<  Used by the comparison table and the quote page.
   annualAUD = single-student cover for 12 months (AUD).
   Source: student-insurance.com OSHC comparison (2026, updated 30 Sep 2026). Indicative only. */
window.OSHC_DATA = {
  rate: 106.3, // NPR per 1 AUD (Wise, Oct 2026)
  providers: [
    { name: 'ahm',          plan: 'OSHC',            annualAUD: 672.00 },
    { name: 'Allianz Care', plan: 'OSHC Standard',   annualAUD: 665.00 },
    { name: 'Bupa',         plan: 'OSHC',            annualAUD: 712.80 },
    { name: 'Medibank',     plan: 'OSHC Essentials', annualAUD: 719.00 },
    { name: 'nib',          plan: 'OSHC Core',       annualAUD: 725.81 }
  ],
  // Rows follow the provider order above: ahm, Allianz Care, Bupa, Medibank, nib
  features: [
    ['Mental health waiting period', ['2 months (pre-existing)', 'None', 'Currently waived', 'None', '2 months (pre-existing)']],
    ['Pre-existing conditions / pregnancy', ['12 months', '12 months', '12 months', '12 months', '12 months']],
    ['Pharmacy limit', ['A$50/item, A$500/year', 'A$50/item, A$500/year', 'A$50/item, A$500/year', 'A$70/item, A$500/year', 'A$50/item, A$500/year']],
    ['Extras (dental, optical)', ['Separate extras policy', 'Optional add-on (dental, optical, physio)', 'Optional extras add-on', 'Separate extras policy', 'Check with provider']],
    ['Online doctor', ['Not stated', '24/7 telehealth', 'Online doctor (Blua)', 'In OSHC app, no cost', 'Telehealth GP, no out-of-pocket cost']],
    ['Claims', ['Online portal', 'Online + phone', 'Online + app', 'Online + app', 'App + online']],
    ['Hospital network', ['Same as Medibank', 'Public / agreement hospitals', 'Wide network, many university partnerships', 'Largest network, all hospitals', 'Good national coverage']]
  ]
};
