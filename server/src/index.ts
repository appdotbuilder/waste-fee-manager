import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import all schemas
import {
  createUserInputSchema,
  loginInputSchema,
  updateUserInputSchema,
  createPaymentInputSchema,
  updatePaymentInputSchema,
  getUserPaymentsInputSchema,
  createDisputeInputSchema,
  resolveDisputeInputSchema,
  getUserDisputesInputSchema
} from './schema';

// Import all handlers
import { createUser } from './handlers/create_user';
import { loginUser } from './handlers/login_user';
import { getUsers } from './handlers/get_users';
import { updateUser } from './handlers/update_user';
import { createPayment } from './handlers/create_payment';
import { getUserPayments } from './handlers/get_user_payments';
import { updatePayment } from './handlers/update_payment';
import { createDispute } from './handlers/create_dispute';
import { getUserDisputes } from './handlers/get_user_disputes';
import { resolveDispute } from './handlers/resolve_dispute';
import { getAllDisputes } from './handlers/get_all_disputes';
import { getAllPayments } from './handlers/get_all_payments';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  loginUser: publicProcedure
    .input(loginInputSchema)
    .query(({ input }) => loginUser(input)),

  getUsers: publicProcedure
    .query(() => getUsers()),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  // Payment management routes
  createPayment: publicProcedure
    .input(createPaymentInputSchema)
    .mutation(({ input }) => createPayment(input)),

  getUserPayments: publicProcedure
    .input(getUserPaymentsInputSchema)
    .query(({ input }) => getUserPayments(input)),

  getAllPayments: publicProcedure
    .query(() => getAllPayments()),

  updatePayment: publicProcedure
    .input(updatePaymentInputSchema)
    .mutation(({ input }) => updatePayment(input)),

  // Dispute management routes
  createDispute: publicProcedure
    .input(createDisputeInputSchema)
    .mutation(({ input }) => createDispute(input)),

  getUserDisputes: publicProcedure
    .input(getUserDisputesInputSchema)
    .query(({ input }) => getUserDisputes(input)),

  getAllDisputes: publicProcedure
    .query(() => getAllDisputes()),

  resolveDispute: publicProcedure
    .input(resolveDisputeInputSchema)
    .mutation(({ input }) => resolveDispute(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();