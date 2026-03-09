const { betterAuth } = require("better-auth");
const { Pool } = require("pg");

// Roles that can be self-assigned during signup.
// "admin" is intentionally excluded — must be granted manually in the DB.
const ALLOWED_SIGNUP_ROLES = ["survivor", "anonymous", "medical", "therapist", "legal"];

const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!ALLOWED_SIGNUP_ROLES.includes(user.role)) {
            user.role = "survivor";
          }
          return { data: user };
        },
      },
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "survivor",
        input: true,
      },
      phone: {
        type: "string",
        defaultValue: "",
        input: true,
      },
      fullname: {
        type: "string",
        defaultValue: "",
        input: true,
      },
      bio: {
        type: "string",
        defaultValue: "",
        input: true,
      },
      status: {
        type: "string",
        defaultValue: "active",
        input: true,
      },
    },
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],
});

module.exports = auth;
