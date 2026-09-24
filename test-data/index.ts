import path from 'node:path';

import ordersJson from './orders.json';
import usersJson from './users.json';

/** Roles that get a saved login from the auth setup project (see tests/auth.setup.ts). */
export const roles = ['admin', 'customer'] as const;
export type Role = (typeof roles)[number];

export interface Credentials {
  email: string;
  password: string;
  name?: string;
}

/** Storefront languages accepted by WDE's GET /lang/:code. */
export type Language = 'en' | 'pt';

// `satisfies` checks the JSON's shape at compile time without widening its literal types.
export const users = usersJson satisfies Record<Role | 'invalidAdmin', Credentials>;

export const orders = ordersJson satisfies { orderData: { testOrderId: string } };

/** Absolute path of a file (e.g. a product image) in `test-data/`. */
export function testDataFile(fileName: string): string {
  return path.join(__dirname, fileName);
}
