import { FastifyPluginAsync } from "fastify";
import { AutoTaskAPIFilter, AutoTaskTimeEntry } from "../../../lib/types.js";
import AutoTask from "../../../lib/autotask.js";


const timeEntries: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
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

      const filters: AutoTaskAPIFilter<AutoTaskTimeEntry> = {
        Filter: [
          { op: "gte", field: "dateWorked", value: dateFilter },
        ],
      }

      const autotask = new AutoTask(apiUser as string, apiSecret as string);
      console.log(`Retrieving time entries >= ${dateFilter}...`);

      let nextPage = "";
      let total = 0;
      while (true) {
        try {
          const timeEntries = await autotask.getTimeEntriesStream(filters, nextPage);

          reply.raw.write(JSON.stringify(timeEntries.timeEntries));
          total += timeEntries.timeEntries.length;
          console.log(`Processed ${total} time entries...`);
          if (timeEntries.timeEntries.length === 0 || !timeEntries.nextPage) {
            console.log(`All time entires processed... ${timeEntries.timeEntries.length} | ${timeEntries.nextPage}`);
            break;
          } else {
            nextPage = timeEntries.nextPage;
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

export default timeEntries;