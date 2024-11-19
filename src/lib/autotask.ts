import { AutoTaskAPIFilter, AutoTaskCategory, AutoTaskCompany, AutoTaskFieldInfo, AutoTaskFieldValue, AutoTaskResource, AutoTaskTicket, AutoTaskTimeEntry } from "./types.js";

const {
  AUTOTASK_TRACKER,
  AUTOTASK_URL,
} = process.env;

export default class AutoTask {
  private resources: AutoTaskResource[] = [];
  private companies: AutoTaskCompany[] = [];
  private categories: AutoTaskCategory[] = [];
  private ticketFields: AutoTaskFieldInfo[] = [];
  private statusList: AutoTaskFieldValue[] = [];
  private priorityList: AutoTaskFieldValue[] = [];
  private issueList: AutoTaskFieldValue[] = [];
  private subIssueList: AutoTaskFieldValue[] = [];
  private queueList: AutoTaskFieldValue[] = [];

  private autotaskUserID: string;
  private autotaskSecret: string;

  private initialized: boolean = false;

  constructor(apiUser: string, apiSecret: string) {
    this.autotaskUserID = apiUser;
    this.autotaskSecret = apiSecret;
  }

  private async init() {
    this.resources = await this.getResources();
    this.companies = await this.getCompanies();
    this.ticketFields = await this.getTicketFields();
    this.statusList = this.getFieldList("status");
    this.priorityList = this.getFieldList("priority");
    this.issueList = this.getFieldList("issueType");
    this.subIssueList = this.getFieldList("subIssueType");
    this.queueList = this.getFieldList("queueID");
    this.categories = await this.getCategories();

    this.initialized = true;
  }

  async getTicketsStream(filters: AutoTaskAPIFilter<AutoTaskTicket>, nextPage: string) {
    try {
      if (!this.initialized) {
        await this.init();
        console.log('Initialized...');
      }

      const ticketFetch = await fetch(nextPage || `${AUTOTASK_URL}/Tickets/query?search=${JSON.stringify(filters)}`, {
        method: "GET",
        headers: {
          "APIIntegrationcode": AUTOTASK_TRACKER!,
          "UserName": this.autotaskUserID,
          "Secret": this.autotaskSecret,
          "Content-Type": "application/json"
        }
      });

      if (!ticketFetch.ok) {
        throw Error(ticketFetch.statusText);
      }

      const ticketData: any = await ticketFetch.json();
      const ticketItems = ticketData.items as any[];

      for (const ticket of ticketItems) {
        const status = this.statusList.find(field => field.value === String(ticket.status));
        ticket.status = status?.label || ticket.status;

        const priority = this.priorityList.find(field => field.value === String(ticket.priority));
        ticket.priority = priority?.label || ticket.priority;

        const issue = this.issueList.find(field => field.value === String(ticket.issueType));
        ticket.issueType = issue?.label || ticket.issueType;

        const subIssue = this.subIssueList.find(field => field.value === String(ticket.subIssueType));
        ticket.subIssueType = subIssue?.label || ticket.subIssueType;

        const queue = this.queueList.find(field => field.value === String(ticket.queueID));
        ticket.queueID = queue?.label || ticket.queueID;

        const resource = this.resources.find(res => res.id === ticket.assignedResourceID);
        ticket.assignedResourceName = resource ? `${resource?.firstName} ${resource?.lastName}` : "None";

        const completedResource = this.resources.find(res => res.id === ticket.completedByResourceID);
        ticket.completedByResourceName = completedResource ? `${completedResource.firstName} ${completedResource.lastName}` : "None";

        const category = this.categories.find(cat => cat.id === ticket.ticketCategory);
        ticket.ticketCategory = category?.name || ticket.ticketCategory;

        const company = this.companies.find(com => com.id === ticket.companyID);
        ticket.companyName = company?.companyName || "";
        ticket.companyID = company?.id || ticket.companyID;
        ticket.parentCompanyID = company?.parentCompanyID || null;
      }

      return { tickets: ticketItems, nextPage: ticketData.pageDetails.nextPageUrl };
    } catch (err) {
      console.error(err);
      return { tickets: [], nextPage: "" };
    }
  }

  async getTimeEntriesStream(filters: AutoTaskAPIFilter<AutoTaskTimeEntry>, nextPage: string) {
    try {
      if (!this.initialized) {
        await this.init();
        console.log('Initialized...');
      }

      const timeEntryFetch = await fetch(nextPage || `${AUTOTASK_URL}/TimeEntries/query?search=${JSON.stringify(filters)}`, {
        method: "GET",
        headers: {
          "APIIntegrationcode": AUTOTASK_TRACKER!,
          "UserName": this.autotaskUserID,
          "Secret": this.autotaskSecret,
          "Content-Type": "application/json"
        }
      });

      if (!timeEntryFetch.ok) {
        throw Error(timeEntryFetch.statusText);
      }

      const timeEntryData: any = await timeEntryFetch.json();
      const timeEntryItems = timeEntryData.items as any[];

      for (const timeEntry of timeEntryItems) {
        const resource = this.resources.find(res => res.id === timeEntry.resourceID);
        timeEntry.resourceName = resource ? `${resource.firstName} ${resource.lastName}` : "None";
      }

      return { timeEntries: timeEntryItems, nextPage: timeEntryData.pageDetails.nextPageUrl };
    } catch (err) {
      console.error(err);
      return { timeEntries: [], nextPage: "" };
    }
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
  private async getResources() {
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

  private async getCompanies() {
    try {
      const filters: AutoTaskAPIFilter<AutoTaskCompany> = {
        Filter: [
          { field: "isActive", "op": "eq", "value": "true" },
          { field: "companyType", "op": "eq", "value": "1" }
        ]
      }

      const companyFetch = await fetch(`${AUTOTASK_URL}/Companies/query?search=${JSON.stringify(filters)}`, {
        method: "GET",
        headers: {
          "APIIntegrationcode": AUTOTASK_TRACKER!,
          "UserName": this.autotaskUserID,
          "Secret": this.autotaskSecret,
          "Content-Type": "application/json"
        }
      });

      if (!companyFetch.ok) {
        throw Error(companyFetch.statusText);
      }

      const companyData = await companyFetch.json() as any;

      console.log(`Retrieved ${companyData.items.length} companies...`);
      return companyData.items as AutoTaskCompany[];
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  private async getCategories() {
    try {
      const filters: AutoTaskAPIFilter<AutoTaskCategory> = {
        Filter: [
          { field: "isActive", "op": "eq", "value": "true" }
        ]
      }

      const categoryFetch = await fetch(`${AUTOTASK_URL}/TicketCategories/query?search=${JSON.stringify(filters)}`, {
        method: "GET",
        headers: {
          "APIIntegrationcode": AUTOTASK_TRACKER!,
          "UserName": this.autotaskUserID,
          "Secret": this.autotaskSecret,
          "Content-Type": "application/json"
        }
      });

      if (!categoryFetch.ok) {
        throw Error(categoryFetch.statusText);
      }

      const categoryData = await categoryFetch.json() as any;
      return categoryData.items as AutoTaskCategory[];
    } catch (err) {
      console.error(err);
      return [];
    }
  }
}