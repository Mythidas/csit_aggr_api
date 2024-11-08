import { AutoTaskAPIFilter, AutoTaskFieldInfo, AutoTaskFieldValue, AutoTaskTicket } from "./types.js";

const {
  AUTOTASK_TRACKER,
  AUTOTASK_URL,
  AUTOTASK_USER_ID,
  AUTOTASK_SECRET
} = process.env;

export default class AutoTask {
  private ticketFields: AutoTaskFieldInfo[] = [];
  private statusList: AutoTaskFieldValue[] = [];

  constructor() {
    this.init();
  }

  private async init() {
    this.ticketFields = await this.getTicketFields();
    this.statusList = this.getFieldList("status");
  }

  async getTickets(filters: AutoTaskAPIFilter<AutoTaskTicket>) {
    const tickets: any[] = [];
    let ticketURL = `${AUTOTASK_URL}/Tickets/query?search=${JSON.stringify(filters)}`;

    while (tickets.length < 30000 && ticketURL !== null) {
      const ticketFetch = await fetch(ticketURL, {
        method: "GET",
        headers: {
          "APIIntegrationcode": AUTOTASK_TRACKER!,
          "UserName": AUTOTASK_USER_ID!,
          "Secret": AUTOTASK_SECRET!,
          "Content-Type": "application/json"
        }
      });

      if (!ticketFetch.ok) {
        console.error(ticketFetch.statusText);
        return [];
      }

      const ticketData: any = await ticketFetch.json();
      const ticketItems = ticketData.items as any[];

      for (const ticket of ticketItems) {
        ticket.status = this.statusList.find(field => field.value === String(ticket.status))?.label || ticket.status;
      }

      tickets.push(...ticketItems);
      ticketURL = ticketData.pageDetails.nextPageUrl;

      console.log(`[AutoTask] Retrieved ${tickets.length} tickets...`);
    }

    return tickets;
  }

  private async getTicketFields() {
    try {
      const ticketInfoFetch = await fetch(`${AUTOTASK_URL}/Tickets/entityInformation/fields`, {
        method: "GET",
        headers: {
          "APIIntegrationcode": AUTOTASK_TRACKER!,
          "UserName": AUTOTASK_USER_ID!,
          "Secret": AUTOTASK_SECRET!,
          "Content-Type": "application/json"
        }
      });

      if (!ticketInfoFetch.ok) {
        console.error(ticketInfoFetch.statusText);
        return [];
      }

      const ticketInfoData = await ticketInfoFetch.json() as { fields: AutoTaskFieldInfo[] };

      return ticketInfoData.fields;
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  private getFieldList(key: keyof AutoTaskTicket) {
    const fieldInfo = this.ticketFields.find(fieldInfo => fieldInfo.name === key);
    return fieldInfo?.picklistValues.filter(val => val.isActive) || [];
  }
}