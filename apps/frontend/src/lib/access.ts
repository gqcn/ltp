import type { SessionUser } from "@/api/auth";

export const MENU_OPS = "ops";
export const MENU_PLATFORM = "platform";
export const MENU_TRAINING = "training";

const enabledMenus = [MENU_TRAINING, MENU_OPS, MENU_PLATFORM];

export function visibleMenus(user: SessionUser) {
  const granted = new Set(user.isAdmin ? [MENU_TRAINING, MENU_OPS, MENU_PLATFORM] : user.menus ?? []);
  return enabledMenus.filter((menu) => granted.has(menu));
}

export function canVisit(user: SessionUser, menu: string) {
  return visibleMenus(user).includes(menu);
}

export function homePath(user: SessionUser) {
  const menus = visibleMenus(user);
  if (menus.includes(MENU_OPS)) {
    return "/ops/datacenters";
  }
  if (menus.includes(MENU_TRAINING)) {
    return "/training/jobs";
  }
  if (menus.includes(MENU_PLATFORM)) {
    return "/platform/users";
  }
  return "/home";
}

export function roleMenuLabel(code: string) {
  if (code === MENU_OPS) {
    return "运维中心";
  }
  if (code === MENU_PLATFORM) {
    return "平台中心";
  }
  if (code === MENU_TRAINING) {
    return "训练中心";
  }
  return code;
}
