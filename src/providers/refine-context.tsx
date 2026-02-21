"use client";

import { type ReactNode } from "react";
import { Refine } from "@refinedev/core";
import routerProvider from "@refinedev/nextjs-router";
import { authProvider } from "./auth-provider";
import { accessControlProvider } from "./access-control-provider";
import { dataProvider } from "./data-provider";

export function RefineContext({ children }: { children: ReactNode }) {
  return (
    <Refine
      authProvider={authProvider}
      accessControlProvider={accessControlProvider}
      dataProvider={dataProvider}
      routerProvider={routerProvider}
      resources={[
        {
          name: "dashboard",
          list: "/dashboard",
        },
        {
          name: "calendar",
          list: "/calendar",
        },
        {
          name: "team",
          list: "/team",
        },
        {
          name: "academy",
          list: "/academy",
        },
        {
          name: "profile",
          show: "/profile",
        },
        {
          name: "admin",
          list: "/admin",
          meta: { label: "Administration" },
        },
        {
          name: "announcements",
          list: "/admin/announcements",
          meta: { parent: "admin" },
        },
        {
          name: "members",
          list: "/admin/members",
          meta: { parent: "admin" },
        },
        {
          name: "groups",
          list: "/admin/groups",
          show: "/admin/groups/:id",
          meta: { parent: "admin" },
        },
        {
          name: "events",
          list: "/admin/events",
          meta: { parent: "admin" },
        },
        {
          name: "locations",
          list: "/admin/locations",
          meta: { parent: "admin" },
        },
      ]}
      options={{
        syncWithLocation: false,
        disableTelemetry: true,
      }}
    >
      {children}
    </Refine>
  );
}
