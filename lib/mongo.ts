import { MongoClient, type ObjectId } from 'mongodb';

/** Override for a non-default target; see CLAUDE.md's "Running the WDE stack". */
const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017';
const DB_NAME = 'online-shop';

interface ProductDocument {
  title: string;
  department: string;
}

interface UserDocument {
  _id: ObjectId;
  email: string;
}

interface SessionDocument {
  _id: string;
  session: { cookie: Record<string, unknown>; uid: string; isAdmin: boolean };
  expires: Date;
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

/** The seeded user's Mongo `_id`, as a string - for forging a session document (BUG-SEC-005). */
export async function userId(email: string): Promise<string> {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const user = await client.db(DB_NAME).collection<UserDocument>('users').findOne({ email });
    if (!user) throw new Error(`No user seeded with email "${email}"`);
    return user._id.toString();
  } finally {
    await client.close();
  }
}

/**
 * Writes a session document shaped exactly like `connect-mongodb-session` does (idField "_id",
 * data nested under "session", TTL under "expires") straight into Mongo, bypassing login
 * entirely - the only way to test whether a cookie signed with the hardcoded secret
 * (BUG-SEC-005) grants access on its own.
 */
export async function insertForgedAdminSession(
  sessionId: string,
  adminUserId: string,
): Promise<void> {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await client
      .db(DB_NAME)
      .collection<SessionDocument>('sessions')
      .insertOne({
        _id: sessionId,
        session: {
          cookie: {
            originalMaxAge: 3600000,
            expires: expires.toISOString(),
            httpOnly: true,
            path: '/',
          },
          uid: adminUserId,
          isAdmin: true,
        },
        expires,
      });
  } finally {
    await client.close();
  }
}

/** Cleans up a session document written by `insertForgedAdminSession`, regardless of test outcome. */
export async function deleteForgedSession(sessionId: string): Promise<void> {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    await client.db(DB_NAME).collection<SessionDocument>('sessions').deleteOne({ _id: sessionId });
  } finally {
    await client.close();
  }
}
