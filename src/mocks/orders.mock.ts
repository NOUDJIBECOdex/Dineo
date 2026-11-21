import type { Order } from '../types/order';

const now = new Date();
const timeMinus15 = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
const timeMinus35 = new Date(now.getTime() - 35 * 60 * 1000).toISOString();

export const INITIAL_MOCK_ORDERS: Order[] = [
  {
    id: 'cmd-init-001',
    orderNumber: 'CMD-00123',
    restaurantId: 'rest-001',
    status: 'IN_PREPARATION',
    context: {
      type: 'TABLE',
      tableNumber: '4',
      tableName: 'Table 4 (Salle Intérieure)',
    },
    source: 'QR_TABLE',
    customer: {
      name: 'Samuel E.',
      phone: '+237 6 99 12 34 56',
      notes: 'Bien assaisonner le poisson s\'il vous plaît',
    },
    items: [
      {
        id: 'item-row-1',
        menuItemId: 'item-202',
        name: 'Bar Entier Braisé du Port',
        unitPrice: 6500,
        quantity: 1,
        selectedChoices: [
          {
            optionId: 'opt-cooking',
            optionName: 'Cuisson du poisson',
            choiceId: 'c-crust',
            choiceName: 'Bien braisé / croustillant',
            extraPrice: 0,
          },
        ],
        totalPrice: 6500,
      },
      {
        id: 'item-row-2',
        menuItemId: 'item-301',
        name: 'Alloco Croustillant (Plantains frits)',
        unitPrice: 1500,
        quantity: 2,
        totalPrice: 3000,
      },
      {
        id: 'item-row-3',
        menuItemId: 'item-401',
        name: 'Jus de Bissap Maison à la Menthe',
        unitPrice: 1000,
        quantity: 2,
        totalPrice: 2000,
      },
    ],
    subtotal: 11500,
    total: 11500,
    statusHistory: [
      {
        status: 'PENDING',
        timestamp: timeMinus15,
        note: 'Commande reçue par scan QR Table 4',
      },
      {
        status: 'ACCEPTED',
        timestamp: new Date(now.getTime() - 12 * 60 * 1000).toISOString(),
        note: 'Commande acceptée par la caisse',
      },
      {
        status: 'IN_PREPARATION',
        timestamp: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
        note: 'Envoyée en cuisine',
      },
    ],
    createdAt: timeMinus15,
    updatedAt: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: 'cmd-init-002',
    orderNumber: 'CMD-00124',
    restaurantId: 'rest-001',
    status: 'READY',
    context: {
      type: 'TAKEAWAY',
    },
    source: 'DIRECT_LINK',
    customer: {
      name: 'Nathalie Kouam',
      phone: '+237 6 77 45 89 00',
    },
    items: [
      {
        id: 'item-row-4',
        menuItemId: 'item-201',
        name: 'Poulet Braisé Façon Grand-Bassam',
        unitPrice: 4500,
        quantity: 1,
        selectedChoices: [
          {
            optionId: 'opt-sauce',
            optionName: 'Piment & Sauce',
            choiceId: 'ch-mild',
            choiceName: 'Piment doux à part',
            extraPrice: 0,
          },
        ],
        totalPrice: 4500,
      },
      {
        id: 'item-row-5',
        menuItemId: 'item-302',
        name: 'Frites de Patate Douce',
        unitPrice: 1500,
        quantity: 1,
        totalPrice: 1500,
      },
    ],
    subtotal: 6000,
    total: 6000,
    statusHistory: [
      {
        status: 'PENDING',
        timestamp: timeMinus35,
        note: 'Commande à emporter reçue',
      },
      {
        status: 'ACCEPTED',
        timestamp: new Date(now.getTime() - 32 * 60 * 1000).toISOString(),
      },
      {
        status: 'IN_PREPARATION',
        timestamp: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
      },
      {
        status: 'READY',
        timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
        note: 'Prête au comptoir',
      },
    ],
    createdAt: timeMinus35,
    updatedAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
  },
];
