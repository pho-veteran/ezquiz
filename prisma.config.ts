import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    // Prisma 7: Connection URL moved from schema.prisma to config
    datasource: {
        url: env("DATABASE_URL"),
    },
});
