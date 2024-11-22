import { FastifyPluginAsync } from "fastify";
import { AutoTaskAPIFilter, AutoTaskCompany } from "../../../lib/types.js";
import AutoTask from "../../../lib/autotask.js";


const tickets: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/', async function (request, reply) {
    try {
      const apiUser = request.headers.username;
      const apiSecret = request.headers.secret;

      if (!apiUser || !apiSecret) {
        throw "Invalid Headers";
      }

      const filters: AutoTaskAPIFilter<AutoTaskCompany> = {
        Filter: [
          { field: "isActive", "op": "eq", "value": "true" },
          { field: "companyType", "op": "eq", "value": "1" }
        ]
      }

      const autotask = new AutoTask(apiUser as string, apiSecret as string);
      const companies = await autotask.getCompanies(filters);

      return companies as AutoTaskCompany[];
    } catch (err) {
      console.error(err);
      return;
    }
  })
}

export default tickets;