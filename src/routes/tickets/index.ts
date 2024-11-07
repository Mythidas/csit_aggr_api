import { FastifyPluginAsync } from "fastify"

const tickets: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/', async function (request, reply) {
    const ticketFetch = await fetch(`${process.env.AUTOTASK_URL}/Tickets/query?search={"filter":[{"op":"noteq","field":"Status","value":5},{"op":"eq","field":"CompanyID","value":175}]}`, {
      method: "GET",
      headers: {
        "APIIntegrationcode": process.env.AUTOTASK_TRACKER!,
        "UserName": process.env.AUTOTASK_USER_ID!,
        "Secret": process.env.AUTOTASK_SECRET!,
        "Content-Type": "application/json"
      }
    });

    if (!ticketFetch.ok) {
      console.error(ticketFetch.statusText);
      return "no tickets"
    }

    const tickets = ticketFetch.json();

    console.log(await ticketFetch.json());
    return tickets;
  })
}

export default tickets;