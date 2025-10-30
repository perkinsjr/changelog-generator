#!/usr/bin/env node

const crypto = require("crypto");

// Generate a 32-byte (256-bit) key for AES-256
const key = crypto.randomBytes(32);

// Convert to base64 string (required by crypto module)
const base64Key = key.toString("base64");

console.log("Generated TOKEN_ENCRYPTION_KEY:");
console.log(base64Key);
console.log("");
console.log("Add this to your .env file:");
console.log(`TOKEN_ENCRYPTION_KEY=${base64Key}`);
console.log("");
console.log(
  "Make sure to keep this key secure and never commit it to version control!",
);
console.log("");
console.log(
  "Note: This key is required for encrypting GitHub OAuth tokens in the database.",
);
