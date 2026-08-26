import { api } from "./client";

export type LdapConfig = {
  name: string;
  host: string;
  port: number;
  useTls: boolean;
  baseDn: string;
  bindDn: string;
  bindPasswordSet: boolean;
  userFilter: string;
  searchFilter: string;
  attrUsername: string;
  attrName: string;
  attrEmail: string;
  attrDepartment: string;
  attrTitle: string;
  timeoutSec: number;
  lastTestAt: number;
  lastTestResult: string;
  lastTestMessage: string;
  updatedBy: string;
  updatedAt: number;
};

export type LdapForm = {
  name: string;
  host: string;
  port: number;
  useTls: boolean;
  baseDn: string;
  bindDn: string;
  bindPassword: string;
  userFilter: string;
  searchFilter: string;
  attrUsername: string;
  attrName: string;
  attrEmail: string;
  attrDepartment: string;
  attrTitle: string;
  timeoutSec: number;
};

export function getLdapConfig() {
  return api<{ config: LdapConfig }>("/system/ldap");
}

export function saveLdapConfig(input: LdapForm) {
  return api<{ config: LdapConfig }>("/system/ldap", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function testLdapConfig(input: LdapForm) {
  return api<{ ok: boolean; message: string; config: LdapConfig }>("/system/ldap/tests", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
