"use client";

import { useEffect } from "react";

import { api } from "@/trpc/react";

import { TestMonitorAreaPresentation } from "./presentation";

export const TestMonitorArea = () => {
  const { data: runningSessions, isLoading, refetch } = api.testSession.getAllRunning.useQuery();

  const { data: organization } = api.organization.getCurrent.useQuery();

  // Poll for updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);

    return () => clearInterval(interval);
  }, [refetch]);

  return (
    <TestMonitorAreaPresentation
      runningSessions={runningSessions}
      organization={organization}
      isLoading={isLoading}
    />
  );
};