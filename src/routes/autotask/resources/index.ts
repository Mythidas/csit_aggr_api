import { FastifyPluginAsync } from "fastify";
import AutoTask from "../../../lib/autotask.js";

const resources: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/', async function (request, reply) {
    const autotask = new AutoTask();
    const resources = await autotask.getResources();

    return resources;
  })
}

export default resources;