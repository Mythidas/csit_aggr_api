import { AutoTaskAPIFilter, AutoTaskFieldInfo, AutoTaskFieldValue, AutoTaskResource, AutoTaskTicket } from "./types.js";

const {
  AUTOTASK_TRACKER,
  AUTOTASK_URL,
} = process.env;

export default class AutoTask {
  private resources: AutoTaskResource[] = [];
  private ticketFields: AutoTaskFieldInfo[] = [];
  private statusList: AutoTaskFieldValue[] = [];

  private autotaskUserID: string;
  private autotaskSecret: string;

  constructor(apiUser: string, apiSecret: string) {
    this.autotaskUserID = apiUser;
    this.autotaskSecret = apiSecret;
    this.init();
  }

  private async init() {
    this.resources = await this.getResources();
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
          "UserName": this.autotaskUserID,
          "Secret": this.autotaskSecret,
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
        const status = this.statusList.find(field => field.value === String(ticket.status));
        ticket.status = status?.label || ticket.status;

        const resource = this.resources.find(res => res.id === ticket.assignedResourceID);
        ticket.assignedResourceID = `${resource?.firstName} ${resource?.lastName}` || ticket.assignedResourceID;

        ticket.createDate = ticket.createDate.substring(0, 10);
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
          "UserName": this.autotaskUserID,
          "Secret": this.autotaskSecret,
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

  // ========== Resources ============
  async getResources() {
    try {
      const filters: AutoTaskAPIFilter<AutoTaskResource> = {
        Filter: [
          { field: "isActive", op: "eq", value: "true" },
          { field: "licenseType", op: "in", value: [1, 3] } // 1 = full, 3 = limited
        ]
      }

      const resourceFetch = await fetch(`${AUTOTASK_URL}/Resources/query?search=${JSON.stringify(filters)}`, {
        method: "GET",
        headers: {
          "APIIntegrationcode": AUTOTASK_TRACKER!,
          "UserName": this.autotaskUserID,
          "Secret": this.autotaskSecret,
          "Content-Type": "application/json"
        }
      });

      if (!resourceFetch.ok) {
        console.error(resourceFetch.statusText);
        return [];
      }

      const resourceData = await resourceFetch.json() as any;
      return resourceData.items as AutoTaskResource[];
    } catch (err) {
      console.error(err);
      return [];
    }
  }
}