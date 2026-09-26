import { MongoClient } from 'mongodb';

/** Override for a non-default target; see CLAUDE.md's "Running the WDE stack". */
const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017';
const DB_NAME = 'online-shop';

interface ProductDocument {
  title: string;
  department: string;
}

/**
 * Titles of every product seeded under `department`, read directly from Mongo - the source of
 * truth for what belongs to a department, so catalog tests don't keep a second hardcoded title
 * list that can drift from `product-data`/the seed script in the `wde` repo.
 */
export async function productTitlesInDepartment(department: string): Promise<string[]> {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const products = await client
      .db(DB_NAME)
      .collection<ProductDocument>('products')
      .find({ department })
      .toArray();
    return products.map((product) => product.title).sort();
  } finally {
    await client.close();
  }
}
