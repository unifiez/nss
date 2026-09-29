// Integration test for the profile data layer. Runs against a real mongod —
// set MONGODB_URI to a throwaway database, it is deleted on the way out.
//
//   set MONGODB_URI=mongodb://127.0.0.1:27017
//   node --experimental-strip-types lib/verify-db.ts

import { MongoClient } from "mongodb";
import { getSettings, isDbConfigured } from "./db.ts";
import {
  generateProfileId,
  generateUniqueId,
  getDefaultMainColor,
  getProfile,
  listProfiles,
  parseProfileInput,
  setDefaultMainColor,
} from "./profiles.ts";

const uri = process.env.MONGODB_URI?.trim();
if (!uri) {
  console.error("Set MONGODB_URI to run this test.");
  process.exit(2);
}
const connectionString: string = uri;

let failures = 0;
function check(label: string, condition: boolean, extra?: unknown) {
  const ok = Boolean(condition);
  if (!ok) failures += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}${ok || extra === undefined ? "" : ` -> ${JSON.stringify(extra)}`}`,
  );
}

async function main() {
  check("db reports configured", isDbConfigured());

  const admin = new MongoClient(connectionString);
  await admin.connect();
  const dbName = process.env.MONGODB_DB?.trim() || "nss_profiles_verify";
  const db = admin.db(dbName);
  const profiles = db.collection("profiles");
  const settings = db.collection("settings");

  await profiles.deleteMany({});
  await settings.deleteMany({});

  try {
    console.log("\n--- settings ---");
    check("defaults to blue before any write", (await getDefaultMainColor()) === "#0038a8");
    await setDefaultMainColor("#DC2626");
    check("round-trips uppercase hex", (await getDefaultMainColor()) === "#dc2626");
    await setDefaultMainColor("#abc");
    check("accepts short hex", (await getDefaultMainColor()) === "#aabbcc");

    console.log("\n--- id generation ---");
    const id = generateProfileId();
    check("id length is 8", id.length === 8, id);
    check("id has no ambiguous chars", !/[01lo]/.test(id), id);
    const many = new Set(Array.from({ length: 500 }, () => generateProfileId()));
    check("500 ids are unique", many.size === 500, { unique: many.size });
    const unique = await generateUniqueId();
    check("unique id is unused", !(await profiles.findOne({ id: unique })));

    console.log("\n--- input validation ---");
    check("rejects missing name", throws(() => parseProfileInput({ name: "  " })));
    check("rejects bad colour", throws(() => parseProfileInput({ name: "A", mainColor: "red" })));
    check(
      "rejects non-base64 photo",
      throws(() => parseProfileInput({ name: "A", mainColor: "#fff", photo: "!!!not base64!!!" })),
    );

    const parsed = parseProfileInput({
      name: "  Yashwant Singh  ",
      branch: " Computer Science ",
      year: "2025-29",
      mainColor: "#16A34A",
      photo: "data:image/png;base64,iVBORw0KGgo=",
      photoWidth: 620.4,
      photoHeight: 900,
      links: { email: " a@b.com ", phone: "", instagram: "insta.com/x", linkedin: "" },
    });
    check("trims name", parsed.name === "Yashwant Singh", parsed.name);
    check("trims branch", parsed.branch === "Computer Science");
    check("lowercases colour", parsed.mainColor === "#16a34a");
    check("strips data-url prefix", parsed.photo === "iVBORw0KGgo=", parsed.photo);
    check("rounds dimensions", parsed.photoWidth === 620, parsed.photoWidth);
    check("keeps links trimmed", parsed.links.email === "a@b.com");
    check("allows empty optional fields", parsed.links.phone === "" && parsed.links.linkedin === "");

    console.log("\n--- create / read / update / delete ---");
    const newId = await generateUniqueId();
    const now = new Date().toISOString();
    await profiles.insertOne({
      id: newId,
      ...parsed,
      createdAt: now,
      updatedAt: now,
    });

    const fetched = await getProfile(newId);
    check("reads back by id", fetched?.name === "Yashwant Singh");
    check("photo survives the round trip", fetched?.photo === "iVBORw0KGgo=");
    check("stored colour is normalised", fetched?.mainColor === "#16a34a");

    const second = await generateUniqueId();
    await profiles.insertOne({
      id: second,
      ...parseProfileInput({ name: "Second Person", mainColor: "#dc2626" }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const all = await listProfiles();
    check("lists both profiles", all.length === 2, all.length);
    check("newest first", new Date(all[0].createdAt) >= new Date(all[1].createdAt));
    check("each keeps its own colour", new Set(all.map((p) => p.mainColor)).size === 2);

    await profiles.updateOne(
      { id: newId },
      { $set: { name: "Renamed Person", updatedAt: new Date().toISOString() } },
    );
    check("update applies", (await getProfile(newId))?.name === "Renamed Person");
    check(
      "update preserves photo",
      (await getProfile(newId))?.photo === "iVBORw0KGgo=",
      (await getProfile(newId))?.photo,
    );

    const deleted = await profiles.deleteOne({ id: second });
    check("delete removes one", deleted.deletedCount === 1);
    check("deleted profile is gone", (await getProfile(second)) === null);
    check("other profile survives", (await getProfile(newId)) !== null);

    console.log("\n--- collections used ---");
    const profileCollections = (await db.listCollections().toArray()).map((c) => c.name);
    check(
      "uses profiles + settings",
      profileCollections.includes("profiles") && profileCollections.includes("settings"),
      profileCollections,
    );
    check("settings has a single row", (await (await getSettings()).countDocuments()) === 1);
  } finally {
    await profiles.deleteMany({});
    await settings.deleteMany({});
    await db.dropDatabase();
    await admin.close();
  }

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) failed.`}`);
  process.exit(failures === 0 ? 0 : 1);
}

function throws(fn: () => unknown): boolean {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
