import { FastifyPluginAsync } from "fastify";
import { AutoTaskAPIFilter, AutoTaskContract } from "../../../lib/types.js";
import AutoTask from "../../../lib/autotask.js";


const timeEntries: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/', async function (request, reply) {
    try {
      const apiUser = request.headers.username;
      const apiSecret = request.headers.secret;

      if (!apiUser || !apiSecret) {
        throw "Invalid headers";
      }

      reply.header('content-type', 'application/json');
      reply.raw.write('[');

      const today = new Date();
      const dateFilter = `${today.getFullYear()}-${today.getMonth()}-01`;

      const filters: AutoTaskAPIFilter<AutoTaskContract> = {
        Filter: [
          { op: "gte", field: "endDate", value: dateFilter },
        ],
      }

      const autotask = new AutoTask(apiUser as string, apiSecret as string);
      console.log(`Retrieving ticekts >= ${dateFilter}...`);

      let nextPage = "";
      let total = 0;
      while (true) {
        try {
          const contracts = await autotask.getContractsStream(filters, nextPage);

          reply.raw.write(JSON.stringify(contracts.contracts));
          total += contracts.contracts.length;
          console.log(`Processed ${total} contracts...`);
          if (contracts.contracts.length === 0 || !contracts.nextPage) {
            break;
          } else {
            nextPage = contracts.nextPage;
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
      return "Invalid Request";
    }
  })
}

export default timeEntries;