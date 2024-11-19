import { FastifyPluginAsync } from "fastify";
import { AutoTaskAPIFilter, AutoTaskTicket } from "../../../lib/types.js";
import AutoTask from "../../../lib/autotask.js";


const tickets: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/', async function (request, reply) {
    try {
      const apiUser = request.headers.username;
      const apiSecret = request.headers.secret;
      const { year, month } = request.query as { year?: string; month?: string };

      if (!apiUser || !apiSecret) {
        throw "Invalid headers";
      }

      reply.header('content-type', 'application/json');
      reply.raw.write('[');

      const today = new Date();
      const dateFilter = `${year || today.getFullYear()}-${month || 1}-01`;

      const filters: AutoTaskAPIFilter<AutoTaskTicket> = {
        Filter: [
          { op: "gte", field: "createDate", value: dateFilter },
          { op: "in", field: "queueID", value: [29683481, 29683508, 8] }, // Support & Triage
          { op: "exist", field: "assignedResourceID" }
        ],
      }

      const autotask = new AutoTask(apiUser as string, apiSecret as string);
      console.log(`Retrieving ticekts >= ${dateFilter}...`);

      let nextPage = "";
      let total = 0;
      while (true) {
        try {
          const tickets = await autotask.getTicketsStream(filters, nextPage);

          reply.raw.write(JSON.stringify(tickets.tickets));
          total += tickets.tickets.length;
          console.log(`Processed ${total} tickets...`);
          if (tickets.tickets.length === 0 || !tickets.nextPage) {
            break;
          } else {
            nextPage = tickets.nextPage;
            reply.raw.write(',');
          }
        } catch {
          break;
        }
      }

      reply.raw.write(']');
      reply.raw.end();
    } catch (err) {
      console.error(err);
      return;
    }
  })
}

export default tickets;