const { betterAuth } = require("better-auth");
const { Pool } = require("pg");

const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  emailAndPassword: {
    enabled: true,
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
