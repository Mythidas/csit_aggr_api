import { FastifyPluginAsync } from "fastify";
import { AutoTaskAPIFilter, AutoTaskTicket } from "../../../lib/types.js";
import AutoTask from "../../../lib/autotask.js";

const tickets: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/', async function (request, reply) {
    const apiUser = request.headers.username;
    const apiSecret = request.headers.secret;

    if (!apiUser || !apiSecret) {
      throw "Invalid headers";
    }

    const dateFilter = new Date(Date.now() - (1000 * 60 * 60 * 24 * 30 * 9));
    const filters: AutoTaskAPIFilter<AutoTaskTicket> = {
      Filter: [
        { op: "gte", field: "createDate", value: dateFilter.toISOString().substring(0, 10) },
        { op: "gt", field: "assignedResourceID", value: "0" }
      ],
    }

    const autotask = new AutoTask(apiUser as string, apiSecret as string);
    const tickets = await autotask.getTickets(filters);

    return tickets;
  })
}

export default tickets;