import { FastifyPluginAsync } from "fastify";
import { AutoTaskAPIFilter, AutoTaskTicket } from "../../../lib/types.js";
import AutoTask from "../../../lib/autotask.js";


const tickets: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/', async function (request, reply) {
    try {
      const apiUser = request.headers.username;
      const apiSecret = request.headers.secret;

      if (!apiUser || !apiSecret) {
        throw "Invalid headers";
      }

      reply.header('content-type', 'application/json');
      reply.raw.write('[');

      const dateFilter = new Date(Date.now() - (1000 * 60 * 60 * 24 * 30 * 12));
      const filters: AutoTaskAPIFilter<AutoTaskTicket> = {
        Filter: [
          { op: "gte", field: "createDate", value: dateFilter.toISOString().substring(0, 10) },
          { op: "gt", field: "assignedResourceID", value: "0" }
        ],
      }

      const autotask = new AutoTask(apiUser as string, apiSecret as string);

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