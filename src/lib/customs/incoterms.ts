export interface Incoterm {
  code: string
  label: string
  description: string
  sellerResponsibility: string
  buyerResponsibility: string
}

export const INCOTERMS_2020: Incoterm[] = [
  { code: 'EXW', label: 'Ex Works', description: 'Mise à disposition dans les locaux du vendeur.', sellerResponsibility: 'Emballage et mise à disposition.', buyerResponsibility: 'Transport, export, import, assurance et risques.' },
  { code: 'FCA', label: 'Free Carrier', description: 'Marchandise remise au transporteur désigné.', sellerResponsibility: 'Export et remise au transporteur.', buyerResponsibility: 'Transport principal, import et assurance.' },
  { code: 'FOB', label: 'Free On Board', description: 'Marchandise chargée à bord du navire au port d’embarquement.', sellerResponsibility: 'Export et chargement à bord.', buyerResponsibility: 'Fret maritime, assurance et import.' },
  { code: 'CFR', label: 'Cost and Freight', description: 'Fret payé jusqu’au port de destination.', sellerResponsibility: 'Export et fret maritime.', buyerResponsibility: 'Assurance, import et risques après chargement.' },
  { code: 'CIF', label: 'Cost, Insurance and Freight', description: 'Fret et assurance payés jusqu’au port de destination.', sellerResponsibility: 'Export, fret et assurance minimale.', buyerResponsibility: 'Import et risques après chargement.' },
  { code: 'DAP', label: 'Delivered At Place', description: 'Livraison au lieu convenu, non déchargée.', sellerResponsibility: 'Transport jusqu’au lieu convenu.', buyerResponsibility: 'Déchargement, import et taxes.' },
  { code: 'DPU', label: 'Delivered at Place Unloaded', description: 'Livraison au lieu convenu, déchargée.', sellerResponsibility: 'Transport et déchargement.', buyerResponsibility: 'Import et taxes.' },
  { code: 'DDP', label: 'Delivered Duty Paid', description: 'Livraison droits et taxes acquittés.', sellerResponsibility: 'Transport, export, import, taxes et livraison.', buyerResponsibility: 'Réception et déchargement.' },
]

export function getIncoterm(code?: string | null) {
  return INCOTERMS_2020.find((incoterm) => incoterm.code === code?.toUpperCase())
}
